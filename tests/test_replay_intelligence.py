from replay_engine import demo_analysis
from replay_intelligence import (
    attach_decision_context,
    build_case_learning_index,
    build_case_learning_summary,
    build_player_hard_data,
    production_utilization,
)


def _sample(second, workers, minerals, used=20, made=30):
    return {
        "second": second,
        "workers": workers,
        "bases": 1,
        "minerals": minerals,
        "gas": 0,
        "bank": minerals,
        "food_used": used,
        "food_made": made,
        "army_value": 0,
        "resources_lost": 0,
        "resources_killed": 0,
    }


def test_hard_data_normalizes_once_and_exposes_bounded_metrics():
    samples = [
        _sample(0, 12, 100),
        _sample(10, 13, 600),
        _sample(20, 13, 1100, 31, 31),
        _sample(30, 13, 1100, 31, 31),
        _sample(40, 14, 200, 32, 39),
        _sample(50, 14, 200, 33, 39),
    ]
    report = build_player_hard_data(
        replay={"map": "Test LE", "release": "5.0.16", "duration_seconds": 60},
        player={"pid": 1, "race": "Protoss"},
        matchup="PvT",
        resource_samples=samples,
        build_events=[
            {"second": 25, "unit": "Pylon", "kind": "supply", "phase": "started"}
        ],
        source={
            "parser": "fixture",
            "parser_version": "1",
            "parser_schema_version": "1.0",
            "evidence_class": "observed_replay",
        },
    )

    envelope = report["fact_envelope"]
    assert envelope["schema_version"] == "1.0"
    assert envelope["coverage"]["resource_sample_count"] == 6
    assert envelope["coverage"]["median_sample_gap_seconds"] == 10
    assert envelope["compatibility_fingerprint"]["status"] == "complete"

    worker_map = report["worker_continuity"]
    assert worker_map["encoding"] == "stepwise_rle"
    assert worker_map["resolution_seconds"] == 1
    assert worker_map["segments"] == [
        {
            "start_second": 0,
            "end_second": 10,
            "workers": 12,
            "observed_at_second": 0,
            "source_sample_seconds": [0],
            "evidence_class": "derived",
        },
        {
            "start_second": 10,
            "end_second": 40,
            "workers": 13,
            "observed_at_second": 10,
            "source_sample_seconds": [10, 20, 30],
            "evidence_class": "derived",
        },
        {
            "start_second": 40,
            "end_second": 60,
            "workers": 14,
            "observed_at_second": 40,
            "source_sample_seconds": [40, 50],
            "evidence_class": "derived",
        },
    ]

    mineral_1000 = report["mineral_exposure"]["thresholds"][1]
    assert mineral_1000["total_exposure_seconds"] == 20
    assert mineral_1000["windows"][0]["start_second"] == 20

    block = report["supply_blocks"]["windows"][0]
    assert block["duration_seconds"] == 20
    assert block["cause_classification"] == "supply_provider_started_during_block"
    assert block["production_delay_exposure_seconds"] == 20
    assert block["downstream_unit_delay_seconds"] is None
    assert report["earliest_signal"]["code"] == "SUPPLY_BLOCK_EXPOSURE"
    assert report["master_divergence"]["status"] == "withheld"


def test_production_utilization_requires_explicit_cycles_and_calculates_idle_time():
    withheld = production_utilization(
        [{"producer_tag": "b1", "unit_type": "Barracks", "online_second": 0}],
        [],
        100,
    )
    assert withheld["availability"] == "withheld"
    assert "production_cycle_start_and_end_events" in withheld["missing_facts"]

    calculated = production_utilization(
        [{"producer_tag": "b1", "unit_type": "Barracks", "online_second": 0}],
        [
            {"producer_tag": "b1", "start_second": 0, "end_second": 20},
            {"producer_tag": "b1", "start_second": 40, "end_second": 60},
        ],
        100,
    )
    assert calculated["availability"] == "calculated"
    assert calculated["utilization_percent"] == 40.0
    assert [(row["start_second"], row["end_second"]) for row in calculated["idle_windows"]] == [
        (20, 40),
        (60, 100),
    ]


def test_synthetic_demo_never_masquerades_as_observed_replay():
    report = demo_analysis()["analysis_by_player"]["1"]["hard_data"]
    assert report["evidence_boundary"]["facts"] == "synthetic_demo"
    assert report["fact_envelope"]["compatibility_fingerprint"]["evidence_class"].startswith(
        "synthetic_demo"
    )
    assert report["production_utilization"]["availability"] == "withheld"


def test_decision_context_separates_information_outcome_and_policy_judgment():
    samples = [
        _sample(0, 12, 100),
        _sample(20, 14, 200, 30, 30),
        _sample(30, 15, 250, 31, 38),
        _sample(60, 18, 300, 42, 42),
        _sample(70, 19, 350, 43, 50),
        _sample(120, 24, 400),
        _sample(180, 30, 500),
        _sample(240, 34, 600),
    ]
    report = build_player_hard_data(
        replay={"map": "Test LE", "release": "5.0.16", "duration_seconds": 240},
        player={"pid": 1, "race": "Protoss"},
        matchup="PvT",
        resource_samples=samples,
        build_events=[
            {"second": 25, "unit": "Pylon", "kind": "supply", "phase": "started"},
            {"second": 65, "unit": "Pylon", "kind": "supply", "phase": "started"},
            {"second": 120, "unit": "Nexus", "kind": "expansion", "phase": "started"},
        ],
        source={"parser": "fixture", "evidence_class": "observed_replay"},
    )
    observation = {
        "coverage": {"camera_events": 3, "selection_events": 2, "command_events": 2},
        "opportunities": [
            {
                "event_second": 90,
                "enemy_unit": "Barracks",
                "status": "plausibly_observed",
                "camera_attention_second": 100,
                "confidence": "medium",
            }
        ],
        "camera_timeline": [{"second": 10}, {"second": 100}, {"second": 150}],
        "selection_timeline": [{"second": 12}, {"second": 110}],
        "command_timeline": [{"second": 15}, {"second": 115}],
    }
    attach_decision_context(report, observation)

    context = report["decision_context"]
    commitment = context["commitment_windows"][0]
    assert commitment["information_state_before"]["plausibly_observed_signals"] == 1
    assert commitment["decision_reasonableness"]["status"].startswith("withheld")
    assert commitment["decision_reasonableness"]["separate_from_outcome"] is True
    assert commitment["outcome"]["classification"] == "no_large_resource_loss_observed"

    expansion = context["expansion_reviews"][0]
    assert expansion["scouting_evidence_grade"] == "A"
    assert expansion["strategic_safety_grade"] is None
    assert expansion["strategic_safety_status"] == "withheld_without_matchup_policy"

    debt = context["attention_debt"]
    assert debt["availability"] == "calculated"
    assert debt["channels"]["camera"]["coverage_status"] == "complete"
    assert debt["windows"]

    repeated = context["repeated_phase_failures"]["within_replay"]
    assert repeated[0]["code"] == "SUPPLY_BLOCK_EXPOSURE"
    assert repeated[0]["phase"] == "opening"
    assert context["repeated_phase_failures"]["cross_replay_status"].startswith("withheld")


def _learning_analysis(digest, map_name="Cohort LE"):
    samples = [
        _sample(0, 12, 100),
        _sample(60, 18, 250),
        _sample(120, 24, 400, 40, 40),
        _sample(140, 26, 450, 42, 50),
        _sample(240, 38, 600),
    ]
    replay = {"map": map_name, "release": "5.0.16", "duration_seconds": 240}
    player = build_player_hard_data(
        replay=replay,
        player={"pid": 1, "race": "Protoss"},
        matchup="PvT",
        resource_samples=samples,
        build_events=[
            {"second": 125, "unit": "Pylon", "kind": "supply", "phase": "started"}
        ],
        source={
            "parser": "fixture",
            "evidence_class": "observed_replay",
            "digest_sha256": digest,
        },
    )
    opponent = build_player_hard_data(
        replay=replay,
        player={"pid": 2, "race": "Terran"},
        matchup="TvP",
        resource_samples=[_sample(row["second"], row["workers"], row["minerals"]) for row in samples],
        build_events=[],
        source={
            "parser": "fixture",
            "evidence_class": "observed_replay",
            "digest_sha256": digest,
        },
    )
    return {
        "players": [
            {"pid": 1, "race": "Protoss", "result": "Victory"},
            {"pid": 2, "race": "Terran", "result": "Defeat"},
        ],
        "analysis_by_player": {"1": {"hard_data": player}, "2": {"hard_data": opponent}},
    }


def test_learning_summary_uses_strict_cohorts_and_returns_one_provisional_correction():
    target = _learning_analysis("a" * 64)
    compatible = build_case_learning_index(_learning_analysis("b" * 64))
    incompatible = build_case_learning_index(_learning_analysis("c" * 64, "Other LE"))
    summary = build_case_learning_summary(target, [compatible, incompatible])

    assert summary["personal_macro_fingerprint"]["result_included"] is False
    assert summary["opponent_behavior_fingerprint"]["intent_status"] == "not_inferred"
    assert summary["compatible_cohort"]["compatible_prior_games"] == 1
    assert summary["compatible_cohort"]["cohort_games_including_target"] == 2
    assert summary["compatible_cohort"]["rejected_candidates"][0]["mismatches"] == ["map"]
    recurring = summary["recurring_first_five_signature"]
    assert recurring["status"] == "calculated"
    assert recurring["signals"][0] == {
        "code": "SUPPLY_BLOCK_EXPOSURE",
        "games": 2,
        "cohort_games": 2,
    }
    assert {row["code"] for row in recurring["signals"]} == {"SUPPLY_BLOCK_EXPOSURE"}
    correction = summary["one_priority_correction"]
    assert correction["status"] == "provisional"
    assert correction["code"] == "SUPPLY_BLOCK_EXPOSURE"
    assert correction["expert_validation"] == "UNVERIFIED"
