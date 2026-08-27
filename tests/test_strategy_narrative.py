from replay_engine import demo_analysis
from observation_service import enrich_demo_analysis


def test_demo_replay_gets_strategy_narrative_for_each_player():
    result = enrich_demo_analysis(demo_analysis())
    assert result["schema_version"] == "1.2"
    for pid, analysis in result["analysis_by_player"].items():
        narrative = analysis["strategy_narrative"]
        assert narrative["player"]["pid"] == int(pid)
        assert narrative["headline"]
        assert len(narrative["chapters"]) == 5
        assert "Next game" in narrative["chapters"][-1]["text"]
        assert len(narrative["spoken_text"]) > 100
        assert "private thought" in narrative["evidence_boundary"]


def test_narrative_uses_selected_players_matchup_not_a_global_default():
    result = enrich_demo_analysis(demo_analysis())
    assert result["analysis_by_player"]["1"]["strategy_narrative"]["matchup"] == "ZvT"
    assert result["analysis_by_player"]["2"]["strategy_narrative"]["matchup"] == "TvZ"


def test_observation_enrichment_attaches_bounded_decision_context():
    result = enrich_demo_analysis(demo_analysis())
    context = result["analysis_by_player"]["1"]["hard_data"]["decision_context"]
    assert context["schema_version"] == "1.0"
    assert context["commitment_windows"]
    assert context["attention_debt"]["availability"] == "withheld"
    assert context["repeated_phase_failures"]["cross_replay_status"].startswith("withheld")
    assert "separate from outcome" in context["evidence_boundary"]
