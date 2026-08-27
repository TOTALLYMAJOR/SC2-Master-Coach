from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path

import pytest

from app import app
from case_workspace import create_or_update_case
from master_intel import validate_player_pack


ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"
MASTER_INTEL = STATIC / "master-intel"


@pytest.fixture()
def local_client(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "replays"))
    monkeypatch.setenv("SC2_MASTER_COACH_DATA", str(tmp_path / "app-data"))
    app.config.update(TESTING=True)
    return app.test_client()


def _pack(pack_id: str = "local.reference-pack") -> dict:
    return {
        "schema_version": "0.1",
        "pack_id": pack_id,
        "title": "Local Reference Pack",
        "publisher": "Test Publisher",
        "pack_version": "1.0.0",
        "patch_coverage": ["5.0.16b"],
        "players": [
            {
                "player_id": "reference-p",
                "display_name": "Reference P",
                "race": "Protoss",
                "aliases": ["RefP"],
                "identity": {"verified": False, "confidence": "unverified"},
                "coverage": {"replay_count": 4, "matchups": ["PvT"]},
                "dossier": {"build_families": ["Information-First Triple"]},
            }
        ],
    }


def test_master_intel_is_default_and_legacy_hud_remains_explicit(local_client):
    home = local_client.get("/")
    assert home.status_code == 200
    html = home.get_data(as_text=True)
    assert "Master Intel · Offline by design" in html
    assert 'src="/master-intel/app.js"' in html
    assert "Import master-player pack" in html
    assert "Command HUD" not in html

    legacy = local_client.get("/hud")
    assert legacy.status_code == 200
    legacy_html = legacy.get_data(as_text=True)
    assert "Legacy Command HUD" in legacy_html
    assert "Return to Master Intel" in legacy_html
    assert 'src="/v110-hud.js"' in legacy_html


def test_offline_boundary_disables_background_update_and_external_connections(local_client):
    response = local_client.get("/api/intel/status")
    assert response.status_code == 200
    body = response.get_json()
    assert body["offline_only"] is True
    assert body["network_required"] is False
    assert body["automatic_updates"] is False
    assert body["connect_policy"] == "self_only"

    headers = local_client.get("/").headers
    csp = headers["Content-Security-Policy"]
    assert "connect-src 'self'" in csp
    assert "object-src 'none'" in csp
    assert "frame-ancestors 'none'" in csp
    assert headers["Referrer-Policy"] == "no-referrer"

    check = local_client.get("/api/update/check")
    assert check.status_code == 200
    update = check.get_json()
    assert update["manual_only"] is True
    assert update["automatic"] is False
    assert update["available"] is False
    assert "release_url" not in update

    open_update = local_client.post("/api/update/open")
    assert open_update.status_code == 409
    assert open_update.get_json()["manual_only"] is True


def test_master_intel_active_assets_have_no_external_runtime_urls():
    paths = [ROOT / "app.py", ROOT / "master_intel.py", STATIC / "index.html"]
    paths.extend(MASTER_INTEL.rglob("*.js"))
    paths.extend(MASTER_INTEL.rglob("*.css"))
    for path in paths:
        content = path.read_text(encoding="utf-8")
        assert "https://" not in content, path
        assert "http://" not in content, path


def test_bundled_demo_installs_locally_and_keeps_identity_boundary(local_client):
    install = local_client.post("/api/intel/demo/install")
    assert install.status_code == 200
    summary = install.get_json()["pack"]
    assert summary["synthetic"] is True
    assert summary["player_count"] == 3
    assert summary["integrity_sha256"]

    players = local_client.get("/api/intel/players").get_json()["players"]
    assert {row["race"] for row in players} == {"Protoss", "Terran", "Zerg"}
    assert all(row["synthetic"] is True for row in players)
    assert all(row["identity_label"] == "Unverified" for row in players)
    assert all(row["identity"]["verified"] is False for row in players)

    status = local_client.get("/api/intel/status").get_json()
    assert status["pack_count"] == 1
    assert status["player_count"] == 3


def test_player_pack_import_validates_integrity_identity_and_local_removal(local_client):
    payload = json.dumps(_pack()).encode("utf-8")
    imported = local_client.post(
        "/api/intel/player-packs/import",
        data={"pack": (BytesIO(payload), "reference.json")},
        content_type="multipart/form-data",
    )
    assert imported.status_code == 200
    pack = imported.get_json()["pack"]
    assert pack["pack_id"] == "local.reference-pack"
    assert pack["player_count"] == 1
    assert pack["integrity_sha256"]

    stored = local_client.get("/api/intel/player-packs").get_json()["packs"]
    assert len(stored) == 1
    assert stored[0]["publisher"] == "Test Publisher"

    removed = local_client.delete("/api/intel/player-packs/local.reference-pack")
    assert removed.status_code == 200
    assert removed.get_json()["removed"] == "local.reference-pack"
    assert local_client.get("/api/intel/player-packs").get_json()["packs"] == []


def test_player_pack_rejects_path_escape_duplicates_and_unsupported_identity():
    with pytest.raises(ValueError, match="pack_id"):
        validate_player_pack(_pack("../../escape"))

    duplicate = _pack()
    duplicate["players"].append(dict(duplicate["players"][0]))
    with pytest.raises(ValueError, match="Duplicate player_id"):
        validate_player_pack(duplicate)

    invalid_race = _pack()
    invalid_race["players"][0]["race"] = "XelNaga"
    with pytest.raises(ValueError, match="unsupported race"):
        validate_player_pack(invalid_race)


def test_replay_case_persists_patch_matchup_and_survives_restart(local_client, tmp_path: Path):
    replay = tmp_path / "sample.SC2Replay"
    replay.write_bytes(b"local-replay-fixture")
    analysis = {
        "replay": {
            "map": "Offline Test Map",
            "duration": 482,
            "game_version": "5.0.16b",
        },
        "players": [
            {"pid": 1, "name": "Local Player", "play_race": "Protoss"},
            {"pid": 2, "name": "Opponent", "play_race": "Terran"},
        ],
        "analysis_by_player": {"1": {"matchup": "PvT"}},
    }
    case = create_or_update_case(replay, analysis)
    assert case["patch"] == "5.0.16b"
    assert case["matchup"] == "PvT"

    recent = local_client.get("/api/intel/recent?limit=5")
    assert recent.status_code == 200
    games = recent.get_json()["games"]
    assert games[0]["case_id"] == case["id"]
    assert games[0]["patch"] == "5.0.16b"
    assert games[0]["matchup"] == "PvT"
    assert games[0]["analysis_available"] is True

    detail = local_client.get(f"/api/intel/cases/{case['id']}")
    assert detail.status_code == 200
    detail_body = detail.get_json()
    manifest = detail_body["manifest"]
    assert manifest["schema_version"] == "1.1"
    assert manifest["digest_sha256"]
    assert manifest["created_at"]
    assert manifest["updated_at"]
    assert detail_body["learning"]["status"] == "withheld"


def test_master_intel_shell_is_lazy_responsive_and_accessible():
    index = (STATIC / "index.html").read_text(encoding="utf-8")
    app_js = (MASTER_INTEL / "app.js").read_text(encoding="utf-8")
    css = (MASTER_INTEL / "base.css").read_text(encoding="utf-8")

    for route in ("home", "players", "player", "replay", "compare", "practice", "settings"):
        assert f'{route}:' in app_js
        assert (MASTER_INTEL / "routes" / f"{route}.js").is_file()
    assert "await import(descriptor.module)" in app_js
    assert "First-run setup" in index
    assert "Skip to content" in index
    assert 'aria-live="polite"' in index
    assert "heading.focus" in app_js
    assert "font-size: 18px" in css
    assert "overflow-x: hidden" in css
    assert "prefers-reduced-motion" in css
    assert "button:focus-visible" in css
    assert "@media (max-width:620px)" in css


def test_comparison_and_practice_routes_do_not_fabricate_future_intelligence():
    compare = (MASTER_INTEL / "routes" / "compare.js").read_text(encoding="utf-8")
    replay = (MASTER_INTEL / "routes" / "replay.js").read_text(encoding="utf-8")
    practice = (MASTER_INTEL / "routes" / "practice.js").read_text(encoding="utf-8")

    assert "does not fabricate timing comparisons" in compare
    assert "same race, matchup, and compatible patch" in compare
    assert "Unavailable until compatible master-reference evidence exists" in replay
    assert "Milestone 3" in replay
    assert "not calculated coaching diagnoses" in practice


def test_replay_route_separates_normalized_facts_from_withheld_causality():
    replay = (MASTER_INTEL / "routes" / "replay.js").read_text(encoding="utf-8")
    for phrase in (
        "Normalized hard data",
        "derived exposure, not presumed waste",
        "producer-cycle facts unavailable",
        "Not a master-reference divergence claim",
        "Withheld when unsupported",
        "exact queued-unit delay",
        "Information before commitments",
        "Attention-debt proxy",
        "Repeated phase signatures",
        "Decision quality versus outcome",
        "No hindsight verdict",
        "Personal macro fingerprint",
        "Opponent behavior fingerprint",
        "Intent is not inferred",
        "Compatible cohort",
        "Recurring first-five signature",
        "One priority correction",
    ):
        assert phrase in replay
