from replay_engine import demo_analysis, score_analysis, build_matchup


def test_demo_schema():
    d = demo_analysis()
    assert d["schema_version"] == "1.0"
    assert len(d["players"]) == 2
    assert "1" in d["analysis_by_player"]
    assert d["analysis_by_player"]["1"]["matchup"] == "ZvT"
    assert len(d["analysis_by_player"]["1"]["stats"]) > 20


def test_score_penalties():
    issues = [
        {"severity": "high"},
        {"severity": "medium"},
        {"severity": "review"},
    ]
    assert score_analysis(issues) == 79


def test_matchup():
    players = [
        {"pid": 1, "race": "Protoss"},
        {"pid": 2, "race": "Terran"},
    ]
    assert build_matchup(players, 1) == "PvT"
    assert build_matchup(players, 2) == "TvP"
