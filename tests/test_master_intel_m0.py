from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path
import subprocess

import pytest

from app import app
from case_workspace import create_or_update_case
import master_intel
from master_intel import validate_player_pack
from replay_intelligence import build_player_hard_data


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


def _owned_learning_analysis(played_at: str = "2026-08-27T12:00:00Z") -> dict:
    def sample(second, workers, minerals, used=20, made=30):
        return {"second": second, "workers": workers, "bases": 1, "minerals": minerals, "gas": 0, "bank": minerals, "food_used": used, "food_made": made, "army_value": 0, "resources_lost": 0, "resources_killed": 0}
    samples = [sample(0, 12, 100), sample(60, 18, 250), sample(120, 24, 400, 40, 40), sample(130, 25, 425, 41, 41), sample(140, 26, 450, 42, 50), sample(240, 38, 600), sample(300, 44, 700), sample(360, 50, 800)]
    replay = {"map": "Cohort LE", "release": "5.0.16", "duration_seconds": 360, "type": "1v1", "date": played_at}
    player = build_player_hard_data(replay=replay, player={"pid": 1, "race": "Protoss", "team": 1}, matchup="PvT", resource_samples=samples, build_events=[{"second": 125, "unit": "Pylon", "kind": "supply", "phase": "started"}], source={"parser": "fixture", "evidence_class": "observed_replay"})
    opponent = build_player_hard_data(replay=replay, player={"pid": 2, "race": "Terran", "team": 2}, matchup="TvP", resource_samples=samples, build_events=[], source={"parser": "fixture", "evidence_class": "observed_replay"})
    return {"replay": {"map": "Cohort LE", "duration": 360, "duration_seconds": 360, "game_version": "5.0.16", "release": "5.0.16", "type": "1v1", "date": played_at}, "source": {"parser": "fixture", "evidence_class": "observed_replay"}, "players": [{"pid": 1, "name": "Local Player", "race": "Protoss", "team": 1}, {"pid": 2, "name": "Opponent", "race": "Terran", "team": 2}], "analysis_by_player": {"1": {"matchup": "PvT", "hard_data": player}, "2": {"matchup": "TvP", "hard_data": opponent}}}


def test_master_intel_is_default_and_legacy_hud_remains_explicit(local_client):
    home = local_client.get("/")
    assert home.status_code == 200
    html = home.get_data(as_text=True)
    assert "Master Intel · Offline by design" in html
    assert 'src="/master-intel/app.js"' in html
    assert "Practice with guided coaching" in html
    assert "Command HUD" not in html

    legacy = local_client.get("/hud")
    assert legacy.status_code == 200
    legacy_html = legacy.get_data(as_text=True)
    assert "Guided Execution" in legacy_html
    assert "Return to Practice" in legacy_html
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


def test_local_service_rejects_dns_rebinding_and_cross_origin_mutation(local_client):
    rejected_host = local_client.get("/", headers={"Host": "evil.test"})
    assert rejected_host.status_code == 403
    rejected_origin = local_client.post(
        "/api/intel/demo/install",
        headers={"Origin": "http://evil.test", "Host": "127.0.0.1"},
    )
    assert rejected_origin.status_code == 403
    rejected_fetch = local_client.get("/api/intel/status", headers={"Sec-Fetch-Site": "cross-site"})
    assert rejected_fetch.status_code == 403
    allowed_dynamic_port = local_client.post(
        "/api/intel/demo/install",
        headers={"Origin": "http://127.0.0.1:43123", "Host": "127.0.0.1:43123"},
    )
    assert allowed_dynamic_port.status_code == 200


def test_player_pack_verified_flag_remains_a_publisher_claim(local_client):
    pack = _pack("local.claimed-reference")
    pack["players"][0]["identity"] = {"verified": True, "confidence": "high"}
    imported = local_client.post(
        "/api/intel/player-packs/import",
        data={"pack": (BytesIO(json.dumps(pack).encode("utf-8")), "claimed.json")},
        content_type="multipart/form-data",
    )
    assert imported.status_code == 200
    player = local_client.get("/api/intel/players").get_json()["players"][0]
    assert player["identity_label"] == "Publisher-declared"
    assert player["identity_trust"] == "publisher_declared"
    assert player["identity"]["verified"] is False
    assert player["identity"]["publisher_declared_verified"] is True
    assert player["identity"]["independently_verified"] is False
    assert player["identity_confidence"] == "unverified"
    assert player["publisher_declared_confidence"] == "high"


def test_player_pack_trust_is_revalidated_and_ids_are_globally_unambiguous(local_client):
    synthetic = _pack("local.synthetic-pack")
    synthetic["synthetic"] = True
    synthetic["players"][0]["synthetic"] = False
    installed = local_client.post(
        "/api/intel/player-packs/import",
        data={"pack": (BytesIO(json.dumps(synthetic).encode("utf-8")), "synthetic.json")},
        content_type="multipart/form-data",
    )
    assert installed.status_code == 200
    assert local_client.get("/api/intel/players").get_json()["players"][0]["synthetic"] is True

    collision = _pack("local.colliding-pack")
    rejected = local_client.post(
        "/api/intel/player-packs/import",
        data={"pack": (BytesIO(json.dumps(collision).encode("utf-8")), "collision.json")},
        content_type="multipart/form-data",
    )
    assert rejected.status_code == 422
    assert "unique across installed packs" in rejected.get_json()["error"]

    path = master_intel.player_pack_root() / "local.synthetic-pack.json"
    tampered = json.loads(path.read_text(encoding="utf-8"))
    tampered["players"][0]["display_name"] = "Tampered identity"
    path.write_text(json.dumps(tampered), encoding="utf-8")
    assert local_client.get("/api/intel/player-packs").get_json()["packs"] == []
    assert local_client.get("/api/intel/players").get_json()["players"] == []


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
    assert games[0]["source_evidence_class"] == "unknown"

    detail = local_client.get(f"/api/intel/cases/{case['id']}")
    assert detail.status_code == 200
    detail_body = detail.get_json()
    manifest = detail_body["manifest"]
    assert manifest["schema_version"] == "1.1"
    assert manifest["digest_sha256"]
    assert manifest["created_at"]
    assert manifest["updated_at"]
    assert detail_body["learning"]["status"] == "withheld"
    assert detail_body["learning"]["requires_player_selection"] is True
    assert "Choose which replay player is you" in detail_body["learning"]["reason"]

    invalid_player = local_client.get(f"/api/intel/cases/{case['id']}?player_pid=999")
    assert invalid_player.status_code == 200
    assert invalid_player.get_json()["selected_player_pid"] is None
    assert invalid_player.get_json()["selection_authority"] == "withheld"

    selected_player = local_client.get(f"/api/intel/cases/{case['id']}?player_pid=1")
    assert selected_player.status_code == 200
    assert selected_player.get_json()["learning"]["status"] == "withheld"

    selected = local_client.post(
        f"/api/intel/cases/{case['id']}/player-selection", json={"player_pid": "1"}
    )
    assert selected.status_code == 200
    assert selected.get_json()["selection"]["authority"] == "player_report"
    assert (Path(case["workspace"]) / "player-selection.json").is_file()
    restored = local_client.get(f"/api/intel/cases/{case['id']}").get_json()
    assert restored["selected_player_pid"] == "1"
    assert restored["selection_authority"] == "player_report"


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
    assert "@media (max-width:380px)" in css
    assert ".panel-head { min-width: 0; flex-direction: column; }" in css


def test_two_explicitly_owned_cases_unlock_personal_recurrence(local_client, tmp_path: Path):
    first_replay = tmp_path / "first.SC2Replay"
    second_replay = tmp_path / "second.SC2Replay"
    future_replay = tmp_path / "future.SC2Replay"
    first_replay.write_bytes(b"owned-replay-one")
    second_replay.write_bytes(b"owned-replay-two")
    future_replay.write_bytes(b"owned-replay-future")
    first = create_or_update_case(first_replay, _owned_learning_analysis("2026-08-26T12:00:00Z"))
    second = create_or_update_case(second_replay, _owned_learning_analysis("2026-08-27T12:00:00Z"))
    future = create_or_update_case(future_replay, _owned_learning_analysis("2026-08-28T12:00:00Z"))

    for case in (first, second, future):
        response = local_client.post(
            f"/api/intel/cases/{case['id']}/player-selection", json={"player_pid": "1"}
        )
        assert response.status_code == 200

    detail = local_client.get(f"/api/intel/cases/{second['id']}").get_json()
    learning = detail["learning"]
    assert learning["selected_player_pid"] == "1"
    assert learning["compatible_cohort"]["compatible_prior_games"] == 1
    assert learning["recurring_first_five_signature"]["status"] == "calculated"
    assert learning["recurring_first_five_signature"]["signals"][0]["code"] == "SUPPLY_BLOCK_EXPOSURE"

    # Selecting the opponent for the prior replay replaces ownership rather than
    # allowing both sides of one game into the personal cohort.
    changed = local_client.post(
        f"/api/intel/cases/{first['id']}/player-selection", json={"player_pid": "2"}
    )
    assert changed.status_code == 200
    after_change = local_client.get(f"/api/intel/cases/{second['id']}").get_json()["learning"]
    assert after_change["compatible_cohort"]["compatible_prior_games"] == 0


def test_stale_player_selection_recovers_without_hiding_replay_facts(local_client, tmp_path: Path):
    replay = tmp_path / "stale-selection.SC2Replay"
    replay.write_bytes(b"stale-player-selection")
    case = create_or_update_case(replay, _owned_learning_analysis())
    selection_path = Path(case["workspace"]) / "player-selection.json"
    selection_path.write_text(json.dumps({
        "schema_version": "1.0",
        "case_id": case["id"],
        "selected_player_pid": "999",
        "authority": "player_report",
        "selected_at": "2026-08-28T00:00:00Z",
    }), encoding="utf-8")

    response = local_client.get(f"/api/intel/cases/{case['id']}")
    assert response.status_code == 200
    body = response.get_json()
    assert body["analysis"]["players"]
    assert body["selected_player_pid"] is None
    assert body["selection_authority"] == "withheld"
    assert body["selection_recovery_required"] is True
    assert body["learning"]["requires_player_selection"] is True


def test_comparison_and_practice_routes_do_not_fabricate_future_intelligence():
    compare = (MASTER_INTEL / "routes" / "compare.js").read_text(encoding="utf-8")
    replay = (MASTER_INTEL / "routes" / "replay.js").read_text(encoding="utf-8")
    practice = (MASTER_INTEL / "routes" / "practice.js").read_text(encoding="utf-8")

    assert "does not fabricate a performance comparison" in compare
    assert "current_first_five_signals" in replay
    assert "Active-drill replay follow-up" in replay
    assert "not proof of causality or durable improvement" in replay
    assert "same race, matchup, and compatible patch" in compare
    assert "Why this recommendation is bounded" in replay
    assert "master comparison" in replay
    assert "not calculated coaching diagnoses" in practice


def test_replay_followup_withholds_unknown_or_unevaluable_evidence():
    replay_module = (MASTER_INTEL / "routes" / "replay.js").resolve().as_uri()
    script = f"""
      import {{ replayFollowup }} from {json.dumps(replay_module)};
      const baseAnalysis = {{
        source: {{ evidence_class: "observed_replay" }},
        replay: {{ date: "2026-08-28T12:00:00Z" }},
        analysis_by_player: {{ "1": {{ matchup: "PvT", hard_data: {{ fact_envelope: {{ compatibility_fingerprint: {{ race: "Protoss", matchup: "PvT", patch: "5.0.16", map: "Cohort LE" }} }} }} }} }}
      }};
      const drill = {{ focusCode: "PRODUCTION_IDLE_EXPOSURE", sourceCaseId: "prior", sourceRace: "Protoss", sourceMatchup: "PvT", sourcePatch: "5.0.16", sourceMap: "Cohort LE", sourcePlayedAt: "2026-08-27T12:00:00Z" }};
      const learning = {{ current_first_five_signals: {{ status: "calculated", signals: [], evaluations: {{ PRODUCTION_IDLE_EXPOSURE: {{ status: "withheld", signal_present: null, reason: "Producer cycles unavailable." }} }} }} }};
      const unevaluable = replayFollowup(baseAnalysis, "current", "1", learning, drill);
      const unknownAnalysis = structuredClone(baseAnalysis);
      unknownAnalysis.analysis_by_player["1"].hard_data.fact_envelope.compatibility_fingerprint.map = "Unknown";
      const unknown = replayFollowup(unknownAnalysis, "current", "1", learning, drill);
      const olderAnalysis = structuredClone(baseAnalysis);
      olderAnalysis.replay.date = "2026-08-26T12:00:00Z";
      const older = replayFollowup(olderAnalysis, "current", "1", learning, drill);
      console.log(JSON.stringify({{ unevaluable, unknown, older }}));
    """
    result = subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    values = json.loads(result.stdout)
    assert values["unevaluable"]["status"] == "withheld"
    assert values["unevaluable"]["title"] == "Follow-up evidence unavailable"
    assert values["unknown"]["status"] == "withheld"
    assert values["unknown"]["title"] == "Not a comparable follow-up"
    assert values["older"]["status"] == "withheld"
    assert values["older"]["title"] == "Not a later replay"


def test_replay_patch_fallbacks_feed_reference_and_drill_context():
    replay_module = (MASTER_INTEL / "routes" / "replay.js").resolve().as_uri()
    script = f"""
      import {{ correctionDrill, referenceReadiness, replayPatch }} from {json.dumps(replay_module)};
      const analysis = {{
        source: {{ evidence_class: "observed_replay" }},
        replay: {{ map: "Cohort LE", release: "5.0.16", date: "2026-08-27T12:00:00Z" }},
        players: [
          {{ pid: 1, name: "Local Player", race: "Protoss" }},
          {{ pid: 2, name: "Opponent", race: "Terran" }}
        ],
        analysis_by_player: {{
          "1": {{
            matchup: "PvT",
            hard_data: {{ fact_envelope: {{ compatibility_fingerprint: {{ race: "Protoss", matchup: "PvT", map: "Cohort LE" }} }} }}
          }}
        }}
      }};
      const learning = {{ one_priority_correction: {{
        code: "WORKER_CONTINUITY_STALL",
        status: "provisional",
        title: "Protect worker growth for five minutes",
        action: "Keep worker growth moving.",
        evidence_anchor: {{ status: "calculated", start_second: 90 }}
      }} }};
      const manifest = {{ digest_sha256: "digest", patch: "5.0.15" }};
      const drill = correctionDrill(analysis, "source", "1", learning, manifest);
      const reference = referenceReadiness(
        analysis,
        "1",
        [{{ player_id: "reference", display_name: "Reference", pack_title: "Pack", identity_label: "verified", race: "Protoss", coverage: {{ matchups: ["PvT"] }}, patch_coverage: ["5.0.16"] }}],
        {{ safe: (value) => String(value) }},
        manifest
      );
      console.log(JSON.stringify({{
        releasePatch: replayPatch(analysis, manifest),
        manifestPatch: replayPatch({{ replay: {{}} }}, manifest),
        drillPatch: drill.sourcePatch,
        referenceUsesRelease: reference.includes("5.0.16") && reference.includes("Patch: match")
      }}));
    """
    result = subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    values = json.loads(result.stdout)
    assert values == {
        "releasePatch": "5.0.16",
        "manifestPatch": "5.0.15",
        "drillPatch": "5.0.16",
        "referenceUsesRelease": True,
    }


def test_supply_followup_does_not_infer_provider_timing_from_signal_absence():
    replay_module = (MASTER_INTEL / "routes" / "replay.js").resolve().as_uri()
    script = f"""
      import {{ replayFollowup }} from {json.dumps(replay_module)};
      const analysis = {{
        source: {{ evidence_class: "observed_replay" }},
        replay: {{ date: "2026-08-28T12:00:00Z", release: "5.0.16" }},
        analysis_by_player: {{ "1": {{ matchup: "PvT", hard_data: {{ fact_envelope: {{ compatibility_fingerprint: {{ race: "Protoss", matchup: "PvT", map: "Cohort LE" }} }} }} }} }}
      }};
      const drill = {{ focusCode: "SUPPLY_BLOCK_EXPOSURE", sourceCaseId: "prior", sourceRace: "Protoss", sourceMatchup: "PvT", sourcePatch: "5.0.16", sourceMap: "Cohort LE", sourcePlayedAt: "2026-08-27T12:00:00Z" }};
      const learning = {{ current_first_five_signals: {{ status: "calculated", evaluations: {{ SUPPLY_BLOCK_EXPOSURE: {{ status: "calculated", signal_present: false }} }} }} }};
      console.log(JSON.stringify(replayFollowup(analysis, "current", "1", learning, drill)));
    """
    result = subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    value = json.loads(result.stdout)
    assert value["status"] == "not-observed"
    assert value["title"] == "Supply-block signal not observed"
    assert "does not prove when the next provider was started" in value["detail"]
    assert "criterion met" not in value["title"].lower()


def test_master_intel_uses_one_persistent_active_drill_as_the_continuation_object():
    app_js = (MASTER_INTEL / "app.js").read_text(encoding="utf-8")
    practice = (MASTER_INTEL / "routes" / "practice.js").read_text(encoding="utf-8")
    home = (MASTER_INTEL / "routes" / "home.js").read_text(encoding="utf-8")
    settings = (MASTER_INTEL / "routes" / "settings.js").read_text(encoding="utf-8")

    for phrase in (
        'ACTIVE_DRILL_KEY = "sc2-master-coach:active-drill:v1"',
        "ACTIVE_DRILL_SCHEMA_VERSION = 2",
        "function getActiveDrill()",
        "function setActiveDrill(candidate)",
        "function clearActiveDrill()",
        "sourceCaseId",
        "sourceEvidenceClass",
        "evidenceAnchorStatus",
        "referencePlayerId",
        "sourcePlayedAt",
        "function getPracticeHistory(drill = null)",
        "snapshot.focusCode !== focusCode",
        "snapshot.sourceCaseId !== drill.sourceCaseId",
        "snapshot.playerPid !== drill.playerPid",
        "snapshot.createdAt !== drill.createdAt",
        "function recordReplayFollowup(candidate)",
        'evaluatorSchema: "replay-followup-v2"',
    ):
        assert phrase in app_js

    for phrase in (
        "Practice command center",
        "Active drill",
        "Start guided execution",
        'href="/hud"',
        "Replay-to-master comparison",
        "route?.query?.get(\"replay\")",
        "route?.query?.get(\"reference\")",
        "Improvement continuity",
        "Latest focus report",
        "Inspect latest local session receipt",
        "Replay follow-up receipts are derived observations from demonstrably later comparable replays",
        "Inspect latest replay follow-up receipt",
        'id="practiceReplacements"',
        "Generic baseline · not replay-derived",
    ):
        assert phrase in practice

    assert "Continue improvement" in home
    assert 'uiPreferenceKeys = ["sc2-master-coach:v110-hud:v1"' in settings
    assert "progression, history, interrupted sessions" in settings


def test_compare_is_contextual_while_the_compatibility_route_remains_reachable():
    index = (STATIC / "index.html").read_text(encoding="utf-8")
    app_js = (MASTER_INTEL / "app.js").read_text(encoding="utf-8")
    replay = (MASTER_INTEL / "routes" / "replay.js").read_text(encoding="utf-8")
    player = (MASTER_INTEL / "routes" / "player.js").read_text(encoding="utf-8")

    assert 'data-route="compare"' not in index
    assert 'compare: { module: "./routes/compare.js"' in app_js
    for phrase in (
        "Contextual reference gate",
        "Reference readiness",
        "raceMatch",
        "matchupMatch",
        "patchMatch",
        "calculated comparison is still withheld",
        "Basic context match",
        "Map, five-minute evidence coverage, provenance-backed calculations",
    ):
        assert phrase in replay
    assert "duration bucket" not in replay
    assert "#/practice?reference=" in player


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


def test_replay_personal_coaching_requires_explicit_player_identity_and_feeds_practice():
    app_js = (MASTER_INTEL / "app.js").read_text(encoding="utf-8")
    api_js = (MASTER_INTEL / "lib" / "api.js").read_text(encoding="utf-8")
    home = (MASTER_INTEL / "routes" / "home.js").read_text(encoding="utf-8")
    replay = (MASTER_INTEL / "routes" / "replay.js").read_text(encoding="utf-8")
    practice = (MASTER_INTEL / "routes" / "practice.js").read_text(encoding="utf-8")

    assert 'REPLAY_PLAYER_KEY = "sc2-master-coach:replay-player:v1"' in app_js
    assert "function getReplayPlayer(caseId)" in app_js
    assert "function setReplayPlayer(caseId, playerPid)" in app_js
    assert "player_pid=" in api_js
    assert "Which player are you?" in replay
    assert "The app will not silently turn the first player record into personal advice." in replay
    assert "CORRECTION_DRILLS" in practice
    assert "one_priority_correction" in practice
    assert "Review or replace this target" in practice
    assert "distinctMetReplayFollowups" in practice
    assert "Analysis horizon" in practice
    assert 'type: "execution_drill"' in practice
    assert 'evidenceClass !== "observed_replay"' in practice
    assert 'correction.status === "provisional"' in practice
    assert 'correction.evidence_anchor?.status === "calculated"' in practice
    assert 'evidenceClass !== "observed_replay"' in replay
    assert 'correction.status !== "provisional"' in replay
    assert 'correction.evidence_anchor?.status !== "calculated"' in replay
    assert "Synthetic demo · tutorial authority only" in replay
    assert "Synthetic tutorial cannot create personal coaching" in practice
    assert "Explore the tutorial boundary" in home
    assert "Synthetic tutorial" in home
    assert "Observed replay" in home
    assert 'normalized.evidenceAnchorStatus === "calculated"' in app_js
    assert "if (envelope.session.drill && !normalizeDrill(envelope.session.drill)) return null" in app_js


def test_replay_report_is_decision_first_and_keeps_expert_evidence_reachable():
    replay = (MASTER_INTEL / "routes" / "replay.js").read_text(encoding="utf-8")
    css = (MASTER_INTEL / "base.css").read_text(encoding="utf-8")
    for phrase in (
        "Your next practice target",
        "Use this practice target",
        "evidence_anchor",
        "replay evidence",
        "Why this recommendation is bounded",
        "Replay identity",
    ):
        assert phrase in replay
    assert "app.setActiveDrill(drill)" in replay
    assert "Automatic improvement verification is not implemented" in replay
    assert "Three-moment debrief status" not in replay
    assert ".replay-disclosure" in css
    assert ".summary-grid.replay-summary" in css


def test_home_primary_actions_match_the_canonical_improvement_loop():
    home = (MASTER_INTEL / "routes" / "home.js").read_text(encoding="utf-8")
    for phrase in (
        "Review one replay",
        "Choose one practice target",
        "Run Guided Execution",
        "Optional reference tools",
        "Reference records are context only",
    ):
        assert phrase in home
    assert home.index("Review one replay") < home.index("Choose one practice target") < home.index("Run Guided Execution")
    assert '<details class="panel reference-library-disclosure">' in home


def test_support_report_is_actionable_and_excludes_sensitive_local_data(local_client, tmp_path: Path):
    sentinel = "private-user-sentinel"
    replay = tmp_path / f"{sentinel}.SC2Replay"
    replay.write_bytes(b"local-replay-fixture")
    create_or_update_case(replay, {
        "replay": {"map": sentinel, "duration": 60, "game_version": "5.0.16b"},
        "players": [{"pid": 1, "name": sentinel, "play_race": "Protoss"}],
        "analysis_by_player": {"1": {"matchup": "PvT"}},
    })
    local_client.post(
        "/api/intel/player-packs/import",
        data={"pack": (BytesIO(json.dumps(_pack()).encode("utf-8")), "reference.json")},
        content_type="multipart/form-data",
    )

    response = local_client.get("/api/intel/support-report")
    assert response.status_code == 200
    report = response.get_json()
    serialized = json.dumps(report)
    assert report["schema_version"] == "1.0"
    assert report["application"]["offline_only"] is True
    assert report["core"]["replay_storage"]["case_count"] == 1
    assert report["core"]["player_library"]["player_count"] == 1
    assert report["privacy"] == {
        "filesystem_paths_included": False,
        "raw_audio_included": False,
        "replay_or_player_identity_included": False,
    }
    assert sentinel not in serialized
    assert str(tmp_path) not in serialized
    assert "workspace" not in serialized
    assert "model_path" not in serialized


def test_support_report_does_not_call_unwritable_storage_ready(local_client, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        master_intel,
        "_storage_write_status",
        lambda root: "unavailable" if root == master_intel.workspace_root() else "ready",
    )

    report = local_client.get("/api/intel/support-report").get_json()

    assert report["core"]["replay_storage"]["status"] == "unavailable"
    assert report["core"]["player_library"]["status"] == "ready"


def test_storage_open_accepts_only_allowlisted_roots(local_client, monkeypatch: pytest.MonkeyPatch):
    opened: list[list[str]] = []
    monkeypatch.setattr(master_intel.subprocess, "Popen", lambda command: opened.append(command))

    for target in ("replays", "application"):
        response = local_client.post("/api/intel/storage/open", json={"target": target})
        assert response.status_code == 200
        assert response.get_json() == {"ok": True, "target": target}
    assert len(opened) == 2
    assert all(command[0] == "xdg-open" for command in opened)

    for target in ("../../", "/tmp", "unknown", None):
        response = local_client.post("/api/intel/storage/open", json={"target": target})
        assert response.status_code == 400
    assert len(opened) == 2


def test_master_intel_distinguishes_unavailable_from_confirmed_empty_and_exposes_recovery():
    app_js = (MASTER_INTEL / "app.js").read_text(encoding="utf-8")
    home = (MASTER_INTEL / "routes" / "home.js").read_text(encoding="utf-8")
    practice = (MASTER_INTEL / "routes" / "practice.js").read_text(encoding="utf-8")
    settings = (MASTER_INTEL / "routes" / "settings.js").read_text(encoding="utf-8")
    api_js = (MASTER_INTEL / "lib" / "api.js").read_text(encoding="utf-8")

    for phrase in (
        'phase: "idle", hasValue: false',
        'phase: "loading"',
        'phase: "ready", hasValue: true',
        'phase: "error"',
        "unavailable — not empty",
        "function resourceIssueMarkup(names)",
        "Retry local data",
    ):
        assert phrase in app_js
    assert "Replay library unavailable — not empty." in home
    assert "No replay-derived drill was generated" in practice
    assert "Report the first plan checkpoint" in practice
    assert "rerenderWithFocus" in practice
    assert 'target.focus({ preventScroll: true })' in practice
    assert "supportReport()" in api_js
    assert "openStorage(target)" in api_js
    for phrase in (
        "System check and support",
        "Download support report",
        "Open replay library",
        "Open app data",
        "Automated restore has not been verified",
        "Remove from library",
        "interrupted sessions, and receipts",
        "publisher authenticity is not verified",
        "const report = await app.api.supportReport()",
    ):
        assert phrase in settings
