from pathlib import Path

from case_workspace import create_or_update_case, resolve_case_replay


def test_case_workspace_persists_replay_and_analysis(tmp_path, monkeypatch):
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(tmp_path / "workspace"))
    replay = tmp_path / "game.SC2Replay"
    replay.write_bytes(b"synthetic-replay")
    analysis = {
        "replay": {"map": "Unit Test LE", "duration": "7:00"},
        "players": [{"pid": 1, "name": "A", "race": "Protoss"}, {"pid": 2, "name": "B", "race": "Terran"}],
        "analysis_by_player": {"1": {"matchup": "PvT"}},
    }
    case = create_or_update_case(replay, analysis)
    assert len(case["id"]) == 16
    assert resolve_case_replay(case["id"]).read_bytes() == b"synthetic-replay"
    assert analysis["case"]["frame_base_url"].endswith("/frames")
