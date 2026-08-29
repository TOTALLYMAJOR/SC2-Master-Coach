from pathlib import Path
import json

import pytest

import case_workspace
from app import app
from case_workspace import (
    CaseIntegrityError,
    create_or_update_case,
    load_case_records,
    replay_digest,
    resolve_case_replay,
)


def _analysis(map_name: str = "Integrity LE"):
    return {
        "replay": {"map": map_name, "duration": "6:00", "release": "5.0.16"},
        "players": [
            {"pid": 1, "name": "Local", "race": "Protoss", "team": 1},
            {"pid": 2, "name": "Opponent", "race": "Terran", "team": 2},
        ],
        "analysis_by_player": {"1": {"matchup": "PvT"}},
    }


def test_case_workspace_persists_replay_and_analysis(tmp_path, monkeypatch):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "workspace"))
    replay = tmp_path / "game.SC2Replay"
    replay.write_bytes(b"synthetic-replay")
    analysis = {
        "replay": {"map": "Unit Test LE", "duration": "7:00"},
        "players": [{"pid": 1, "name": "A", "race": "Protoss"}, {"pid": 2, "name": "B", "race": "Terran"}],
        "analysis_by_player": {
            "1": {
                "matchup": "PvT",
                "hard_data": {"fact_envelope": {"source": {"parser": "fixture"}}},
            }
        },
    }
    case = create_or_update_case(replay, analysis)
    assert len(case["id"]) == 16
    assert resolve_case_replay(case["id"]).read_bytes() == b"synthetic-replay"
    assert analysis["case"]["frame_base_url"].endswith("/frames")
    source = analysis["analysis_by_player"]["1"]["hard_data"]["fact_envelope"]["source"]
    assert source["digest_sha256"] == analysis["source"]["digest_sha256"]
    assert source["ingested_at"] == analysis["source"]["ingested_at"]
    learning_index = json.loads(
        (Path(case["workspace"]) / "learning-index.json").read_text(encoding="utf-8")
    )
    assert learning_index["status"] == "withheld"
    manifest, stored_analysis, stored_learning = load_case_records(case["id"])
    assert manifest["metadata_revision"] == stored_analysis["_case_integrity"]["metadata_revision"]
    assert stored_analysis["_case_integrity"] == stored_learning["_case_integrity"]
    assert set(manifest["metadata_files"]) == {"analysis.json", "learning-index.json"}


def test_case_workspace_repairs_same_size_replay_tampering_from_authorized_source(
    tmp_path, monkeypatch
):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "workspace"))
    replay = tmp_path / "authorized.SC2Replay"
    source_bytes = b"authorized-replay-bytes"
    replay.write_bytes(source_bytes)
    analysis = {
        "replay": {"map": "Integrity LE", "duration": "6:00", "release": "5.0.16"},
        "players": [],
        "analysis_by_player": {},
    }
    case = create_or_update_case(replay, analysis)
    stored = resolve_case_replay(case["id"])
    stored.write_bytes(b"x" * len(source_bytes))
    assert stored.stat().st_size == replay.stat().st_size
    assert replay_digest(stored) != replay_digest(replay)

    repaired = create_or_update_case(replay, analysis)

    assert resolve_case_replay(repaired["id"]).read_bytes() == source_bytes
    assert replay_digest(resolve_case_replay(repaired["id"])) == replay_digest(replay)
    assert repaired["patch"] == "5.0.16"


def test_case_workspace_rejects_a_copy_that_fails_post_copy_digest_verification(
    tmp_path, monkeypatch
):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "workspace"))
    replay = tmp_path / "authorized.SC2Replay"
    replay.write_bytes(b"authorized-replay-bytes")
    analysis = {"replay": {}, "players": [], "analysis_by_player": {}}
    case = create_or_update_case(replay, analysis)
    stored = resolve_case_replay(case["id"])
    tampered = b"x" * replay.stat().st_size
    stored.write_bytes(tampered)

    def corrupt_copy(_source, destination):
        Path(destination).write_bytes(b"y" * replay.stat().st_size)

    monkeypatch.setattr(case_workspace.shutil, "copy2", corrupt_copy)

    with pytest.raises(OSError, match="Copied replay digest"):
        create_or_update_case(replay, analysis)
    assert stored.read_bytes() == tampered


@pytest.mark.parametrize("filename", ["manifest.json", "analysis.json", "learning-index.json"])
def test_case_metadata_tampering_fails_closed_in_production_detail(
    tmp_path, monkeypatch, filename
):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "workspace"))
    replay = tmp_path / "tamper.SC2Replay"
    replay.write_bytes(b"metadata-tamper-replay")
    case = create_or_update_case(replay, _analysis())
    path = Path(case["workspace"]) / filename
    value = json.loads(path.read_text(encoding="utf-8"))
    value["tampered"] = True
    path.write_text(json.dumps(value, indent=2), encoding="utf-8")

    with pytest.raises(CaseIntegrityError):
        load_case_records(case["id"])
    app.config.update(TESTING=True)
    response = app.test_client().get(f"/api/intel/cases/{case['id']}")
    assert response.status_code == 409
    assert "Re-import the original replay" in response.get_json()["error"]


def test_replay_tampering_hides_case_from_production_reads(tmp_path, monkeypatch):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "workspace"))
    replay = tmp_path / "replay-integrity.SC2Replay"
    replay.write_bytes(b"coherent-replay")
    case = create_or_update_case(replay, _analysis())
    (Path(case["workspace"]) / "replay.SC2Replay").write_bytes(b"tampered-replay")

    app.config.update(TESTING=True)
    client = app.test_client()
    assert client.get(f"/api/intel/cases/{case['id']}").status_code == 409
    recent = client.get("/api/intel/recent").get_json()["games"]
    assert recent == [{
        "analysis_available": False,
        "case_id": case["id"],
        "created_at": None,
        "display_name": "Replay needs re-import",
        "imported_at": None,
        "integrity_status": "failed",
        "map": None,
        "matchup": None,
        "patch": None,
        "recovery_action": "reimport_original_replay",
        "recovery_required": True,
    }]


def test_legacy_case_remains_visible_only_as_privacy_safe_recovery_placeholder(
    tmp_path, monkeypatch
):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "workspace"))
    replay = tmp_path / "legacy.SC2Replay"
    replay.write_bytes(b"legacy-replay")
    case = create_or_update_case(replay, _analysis("Private Map LE"))
    workspace = Path(case["workspace"])
    manifest_path = workspace / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.pop("metadata_revision")
    manifest.pop("metadata_files")
    manifest["display_name"] = "Private Map PvT"
    manifest["patch"] = "private-patch"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    app.config.update(TESTING=True)
    client = app.test_client()
    recent = client.get("/api/intel/recent").get_json()["games"]
    assert len(recent) == 1
    placeholder = recent[0]
    assert placeholder["case_id"] == case["id"]
    assert placeholder["display_name"] == "Replay needs re-import"
    assert placeholder["integrity_status"] == "failed"
    assert placeholder["recovery_required"] is True
    assert placeholder["analysis_available"] is False
    assert placeholder["patch"] is None
    assert placeholder["matchup"] is None
    assert placeholder["map"] is None
    assert "players" not in placeholder
    assert "source_filename" not in placeholder
    assert client.get(f"/api/intel/cases/{case['id']}").status_code == 409


def test_interrupted_metadata_generation_is_invisible_until_authorized_retry(
    tmp_path, monkeypatch
):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "workspace"))
    replay = tmp_path / "interrupted.SC2Replay"
    replay.write_bytes(b"interrupted-metadata-replay")
    create_or_update_case(replay, _analysis("Before LE"))
    case_id = replay_digest(replay)[:16]

    original_atomic_write = case_workspace._atomic_write_json
    write_count = 0

    def interrupt_second_replace(path, value):
        nonlocal write_count
        write_count += 1
        if write_count == 2:
            raise OSError("simulated interruption")
        original_atomic_write(path, value)

    monkeypatch.setattr(case_workspace, "_atomic_write_json", interrupt_second_replace)
    with pytest.raises(OSError, match="simulated interruption"):
        create_or_update_case(replay, _analysis("After LE"))
    with pytest.raises(CaseIntegrityError):
        load_case_records(case_id)

    monkeypatch.setattr(case_workspace, "_atomic_write_json", original_atomic_write)
    repaired = create_or_update_case(replay, _analysis("After LE"))
    manifest, analysis, learning = load_case_records(repaired["id"])
    assert manifest["map"] == "After LE"
    assert analysis["replay"]["map"] == "After LE"
    assert analysis["_case_integrity"] == learning["_case_integrity"]
    assert not list(Path(repaired["workspace"]).glob(".*.tmp"))


def test_case_metadata_survives_restart_read_path(tmp_path, monkeypatch):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "workspace"))
    replay = tmp_path / "restart.SC2Replay"
    replay.write_bytes(b"restart-replay")
    case = create_or_update_case(replay, _analysis("Restart LE"))

    # A fresh client exercises the same disk-backed detail path used after restart.
    app.config.update(TESTING=True)
    response = app.test_client().get(f"/api/intel/cases/{case['id']}")
    assert response.status_code == 200
    body = response.get_json()
    assert body["manifest"]["case_id"] == case["id"]
    assert body["analysis"]["case"]["id"] == case["id"]
    assert body["analysis"]["source"]["digest_sha256"] == replay_digest(replay)
