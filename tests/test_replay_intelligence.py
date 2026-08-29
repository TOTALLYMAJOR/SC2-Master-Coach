from replay_engine import demo_analysis
from replay_intelligence import (
    _correction_evidence_anchor,
    _earliest_signal,
    _opening_signal_codes,
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
        _sample(40, 14, 1100, 31, 31),
        _sample(50, 14, 200, 33, 39),
    ]
    report = build_player_hard_data(
        replay={"map": "Test LE", "release": "5.0.16", "duration_seconds": 60, "type": "1v1"},
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
    assert report["earliest_signal"]["code"] == "MINERAL_FLOAT_EXPOSURE"
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
    summary = build_case_learning_summary(demo_analysis(), [], target_player_pid="1")
    assert summary["status"] == "withheld"


def test_post_five_minute_signals_cannot_select_a_five_minute_correction():
    report = build_player_hard_data(
        replay={"map": "Late Signal LE", "release": "5.0.16", "duration_seconds": 360},
        player={"pid": 1, "race": "Protoss"},
        matchup="PvT",
        resource_samples=[
            _sample(0, 12, 100),
            _sample(60, 18, 200),
            _sample(120, 24, 300),
            _sample(180, 30, 400),
            _sample(240, 36, 500),
            _sample(300, 42, 600),
            _sample(320, 42, 1100),
            _sample(350, 42, 1100),
            _sample(360, 43, 200),
        ],
        build_events=[],
        source={"parser": "fixture", "evidence_class": "observed_replay"},
    )

    assert report["earliest_signal"]["status"] == "withheld"
    assert _opening_signal_codes(report) == set()
    assert _correction_evidence_anchor(report, "MINERAL_FLOAT_EXPOSURE")["status"] == "withheld"


def test_decision_context_separates_information_outcome_and_policy_judgment():
    samples = [
        _sample(0, 12, 100),
        _sample(20, 14, 200, 30, 30),
        _sample(30, 15, 250, 31, 31),
        _sample(40, 16, 275, 32, 38),
        _sample(60, 18, 300, 42, 42),
        _sample(70, 19, 350, 43, 43),
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


def _learning_analysis(digest, map_name="Cohort LE", duration_seconds=360):
    samples = [
        _sample(0, 12, 100),
        _sample(60, 18, 250),
        _sample(120, 24, 400, 40, 40),
        _sample(130, 25, 425, 41, 41),
        _sample(140, 26, 450, 42, 50),
        _sample(240, 38, 600),
        _sample(300, 44, 700),
        _sample(360, 50, 800),
    ]
    replay = {"map": map_name, "release": "5.0.16", "duration_seconds": duration_seconds, "type": "1v1"}
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
        "replay": replay,
        "players": [
            {"pid": 1, "race": "Protoss", "result": "Victory", "team": 1},
            {"pid": 2, "race": "Terran", "result": "Defeat", "team": 2},
        ],
        "analysis_by_player": {"1": {"hard_data": player}, "2": {"hard_data": opponent}},
    }


def test_learning_summary_uses_strict_cohorts_and_returns_one_provisional_correction():
    target = _learning_analysis("a" * 64)
    compatible = build_case_learning_index(_learning_analysis("b" * 64), "1")
    incompatible = build_case_learning_index(_learning_analysis("c" * 64, "Other LE"), "1")
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
        "recurrence_rate": 1.0,
        "conservative_recurrence_lower_bound": 0.342372,
        "recurrence_strength_method": "wilson_lower_bound_95_percent",
    }
    assert {row["code"] for row in recurring["signals"]} == {"SUPPLY_BLOCK_EXPOSURE"}
    correction = summary["one_priority_correction"]
    assert correction["status"] == "provisional"
    assert correction["code"] == "SUPPLY_BLOCK_EXPOSURE"
    assert correction["expert_validation"] == "UNVERIFIED"
    assert correction["title"] == "Protect supply headroom for five minutes"
    assert correction["measurement"] == {
        "rule": "No non-cap supply-block window appears before 5:00 in the next replay",
        "mode": "hybrid",
        "replay_observed_component": "Non-cap supply-block windows before 5:00",
        "player_report_component": "Whether the next provider was intentionally started before planned production consumed the remaining space",
        "replay_verification": "conditional",
        "current_availability": "player_report_now_manual_next_replay_review_later",
        "outcome_authority": "UNVERIFIED",
    }
    assert correction["evidence_anchor"]["signal_code"] == "SUPPLY_BLOCK_EXPOSURE"
    evaluations = summary["current_first_five_signals"]["evaluations"]
    assert evaluations["SUPPLY_BLOCK_EXPOSURE"] == {
        "status": "calculated",
        "signal_present": True,
        "reason": None,
    }
    assert evaluations["PRODUCTION_IDLE_EXPOSURE"]["status"] == "withheld"
    assert evaluations["PRODUCTION_IDLE_EXPOSURE"]["signal_present"] is None
    assert "producer identity and cycle timing" in evaluations["PRODUCTION_IDLE_EXPOSURE"]["reason"]


def test_selected_correction_uses_its_own_evidence_anchor_not_a_different_earliest_signal():
    target = _learning_analysis("e" * 64)
    hard = target["analysis_by_player"]["1"]["hard_data"]
    hard["worker_continuity"]["stall_windows"] = [
        {"start_second": 60, "end_second": 90, "duration_seconds": 30}
    ]
    hard["earliest_signal"] = {
        "status": "calculated",
        "second": 60,
        "code": "WORKER_CONTINUITY_STALL",
    }
    compatible = build_case_learning_index(_learning_analysis("f" * 64), "1")

    correction = build_case_learning_summary(target, [compatible])["one_priority_correction"]

    assert correction["selection_basis"] == "highest_conservative_recurrence_lower_bound_then_current_anchor"
    assert correction["code"] == "SUPPLY_BLOCK_EXPOSURE"
    assert correction["evidence_anchor"]["signal_code"] == "SUPPLY_BLOCK_EXPOSURE"
    assert correction["evidence_anchor"]["start_second"] == 120
    assert correction["evidence_anchor"]["start_second"] != hard["earliest_signal"]["second"]


def test_worker_stall_must_fully_qualify_before_five_minutes():
    workers = {
        "stall_windows": [
            {"start_second": 299, "end_second": 344, "duration_seconds": 45}
        ]
    }
    empty = {"thresholds": [], "windows": [], "idle_windows": []}

    signal = _earliest_signal(workers, empty, empty, empty)
    anchor = _correction_evidence_anchor(
        {
            "worker_continuity": workers,
            "mineral_exposure": empty,
            "supply_blocks": empty,
            "production_utilization": empty,
        },
        "WORKER_CONTINUITY_STALL",
    )

    assert signal["status"] == "withheld"
    assert anchor["status"] == "withheld"


def test_learning_summary_uses_the_explicit_replay_player_when_selected():
    target = _learning_analysis("d" * 64)
    summary = build_case_learning_summary(target, [], target_player_pid="2")

    assert summary["selected_player_pid"] == "2"
    assert summary["compatible_cohort"]["compatible_prior_games"] == 0
    assert summary["recurring_first_five_signature"]["status"] == "withheld"


def test_learning_is_withheld_for_non_one_v_one_replays():
    target = _learning_analysis("9" * 64)
    target["replay"]["type"] = "2v2"
    target["players"].extend([
        {"pid": 3, "race": "Zerg", "team": 1},
        {"pid": 4, "race": "Protoss", "team": 2},
    ])
    summary = build_case_learning_summary(target, [], target_player_pid="1")
    assert summary["status"] == "withheld"
    assert summary["one_v_one_eligibility"]["eligible"] is False


def test_five_minute_fingerprint_withholds_snapshot_when_replay_ends_at_four_minutes():
    target = _learning_analysis("8" * 64)
    hard = target["analysis_by_player"]["1"]["hard_data"]
    hard["fact_envelope"]["coverage"]["duration_seconds"] = 240
    hard["fact_envelope"]["coverage"]["last_second"] = 240
    summary = build_case_learning_summary(target, [], target_player_pid="1")
    assert summary["personal_macro_fingerprint"]["features"]["workers_at_5_minutes"] is None
    assert summary["current_first_five_signals"]["status"] == "withheld"


def test_signal_absence_is_withheld_when_required_fields_are_missing():
    target = _learning_analysis("5" * 64)
    hard = target["analysis_by_player"]["1"]["hard_data"]
    for row in hard["fact_envelope"]["resource_samples"]:
        row["workers"] = None
        row["minerals"] = None
        row["food_used"] = None
        row["food_made"] = None
    hard["worker_continuity"] = {"availability": "withheld", "stall_windows": []}
    hard["mineral_exposure"] = {"availability": "withheld", "thresholds": []}
    hard["supply_blocks"] = {"availability": "withheld", "windows": []}
    hard["earliest_signal"] = {"status": "withheld"}

    summary = build_case_learning_summary(target, [], target_player_pid="1")
    evaluations = summary["current_first_five_signals"]["evaluations"]

    for code in ("WORKER_CONTINUITY_STALL", "MINERAL_FLOAT_EXPOSURE", "SUPPLY_BLOCK_EXPOSURE"):
        assert evaluations[code]["status"] == "withheld"
        assert evaluations[code]["signal_present"] is None


def test_sparse_single_samples_do_not_manufacture_exposure_windows():
    report = build_player_hard_data(
        replay={"map": "Sparse LE", "release": "5.0.16", "duration_seconds": 360, "type": "1v1"},
        player={"pid": 1, "race": "Protoss"},
        matchup="PvT",
        resource_samples=[
            _sample(0, 12, 100),
            _sample(120, 24, 1100, 40, 40),
            _sample(300, 44, 200, 55, 70),
            _sample(360, 50, 200, 60, 78),
        ],
        build_events=[],
        source={"parser": "fixture", "evidence_class": "observed_replay"},
    )

    mineral_1000 = next(row for row in report["mineral_exposure"]["thresholds"] if row["minerals"] == 1000)
    assert mineral_1000["windows"] == []
    assert report["supply_blocks"]["windows"] == []
    assert report["earliest_signal"]["status"] == "withheld"


def test_recurrence_denominator_excludes_games_without_signal_observability():
    target = _learning_analysis("1" * 64)
    positive = build_case_learning_index(_learning_analysis("2" * 64), "1")
    unobservable = []
    for marker in ("3", "4", "5"):
        analysis = _learning_analysis(marker * 64)
        hard = analysis["analysis_by_player"]["1"]["hard_data"]
        hard["supply_blocks"] = {"availability": "withheld", "windows": []}
        for row in hard["fact_envelope"]["resource_samples"]:
            row["food_used"] = None
            row["food_made"] = None
        unobservable.append(build_case_learning_index(analysis, "1"))

    summary = build_case_learning_summary(target, [positive, *unobservable], target_player_pid="1")
    supply = next(row for row in summary["recurring_first_five_signature"]["signals"] if row["code"] == "SUPPLY_BLOCK_EXPOSURE")

    assert supply == {
        "code": "SUPPLY_BLOCK_EXPOSURE",
        "games": 2,
        "cohort_games": 2,
        "recurrence_rate": 1.0,
        "conservative_recurrence_lower_bound": 0.342372,
        "recurrence_strength_method": "wilson_lower_bound_95_percent",
    }


def test_learning_index_requires_explicit_player_identity():
    index = build_case_learning_index(_learning_analysis("0" * 64))
    assert index["status"] == "withheld"
    assert index["requires_player_selection"] is True


def test_recurring_prior_signal_cannot_replace_a_signal_absent_from_current_target():
    target = _learning_analysis("7" * 64)
    target_hard = target["analysis_by_player"]["1"]["hard_data"]
    target_hard["supply_blocks"]["windows"] = []
    target_hard["supply_blocks"]["total_exposure_seconds"] = 0
    target_hard["mineral_exposure"]["thresholds"][1]["windows"] = [{"start_second": 80, "end_second": 110, "duration_seconds": 30}]
    target_hard["earliest_signal"] = {"status": "calculated", "second": 80, "code": "MINERAL_FLOAT_EXPOSURE"}
    prior = build_case_learning_index(_learning_analysis("6" * 64), "1")
    summary = build_case_learning_summary(target, [prior], target_player_pid="1")
    correction = summary["one_priority_correction"]
    assert correction["code"] == "MINERAL_FLOAT_EXPOSURE"
    assert correction["selection_basis"] == "earliest_current_local_signal"
    assert correction["evidence_anchor"]["signal_code"] == "MINERAL_FLOAT_EXPOSURE"


def test_total_game_duration_is_descriptive_not_a_first_five_cohort_gate():
    target = _learning_analysis("a" * 64, duration_seconds=360)
    longer = build_case_learning_index(
        _learning_analysis("b" * 64, duration_seconds=720), "1"
    )

    summary = build_case_learning_summary(target, [longer], target_player_pid="1")

    assert summary["compatible_cohort"]["compatible_prior_games"] == 1
    assert "duration_bucket" not in summary["compatible_cohort"]["required_dimensions"]
    assert summary["compatible_cohort"]["descriptive_dimensions_not_used_for_compatibility"] == [
        "duration_bucket"
    ]


def test_correction_prefers_observable_recurrence_rate_before_raw_game_count():
    target = _learning_analysis("c" * 64)
    hard = target["analysis_by_player"]["1"]["hard_data"]
    mineral = next(
        row for row in hard["mineral_exposure"]["thresholds"] if row["minerals"] == 1000
    )
    mineral["windows"] = [{"start_second": 80, "end_second": 110, "duration_seconds": 30}]
    mineral["total_exposure_seconds"] = 30

    positive = build_case_learning_index(_learning_analysis("d" * 64), "1")
    positive["opening_signal_codes"].append("MINERAL_FLOAT_EXPOSURE")
    positive["signal_evaluations"]["MINERAL_FLOAT_EXPOSURE"] = {
        "status": "calculated",
        "signal_present": True,
        "reason": None,
    }
    absent_supply = build_case_learning_index(_learning_analysis("e" * 64), "1")
    absent_supply["opening_signal_codes"] = []
    absent_supply["signal_evaluations"]["SUPPLY_BLOCK_EXPOSURE"] = {
        "status": "calculated",
        "signal_present": False,
        "reason": None,
    }
    absent_supply["signal_evaluations"]["MINERAL_FLOAT_EXPOSURE"] = {
        "status": "withheld",
        "signal_present": None,
        "reason": "Fixture intentionally lacks observable mineral facts.",
    }

    correction = build_case_learning_summary(
        target, [positive, absent_supply], target_player_pid="1"
    )["one_priority_correction"]

    assert correction["code"] == "MINERAL_FLOAT_EXPOSURE"
    assert correction["selection_basis"] == "highest_conservative_recurrence_lower_bound_then_current_anchor"
    assert correction["selection_rationale"] == {
        "authority": "derived_from_observable_compatible_cohort",
        "recurring_games": 2,
        "observable_cohort_games": 2,
        "recurrence_rate": 1.0,
        "conservative_recurrence_lower_bound": 0.342372,
        "recurrence_strength_method": "wilson_lower_bound_95_percent",
        "current_anchor_second": 80,
        "expert_priority_status": "UNVERIFIED",
    }


def test_correction_uses_earliest_current_anchor_when_recurrence_evidence_ties():
    target = _learning_analysis("f" * 64)
    hard = target["analysis_by_player"]["1"]["hard_data"]
    mineral = next(
        row for row in hard["mineral_exposure"]["thresholds"] if row["minerals"] == 1000
    )
    mineral["windows"] = [{"start_second": 80, "end_second": 110, "duration_seconds": 30}]
    mineral["total_exposure_seconds"] = 30
    prior = build_case_learning_index(_learning_analysis("9" * 64), "1")
    prior["opening_signal_codes"].append("MINERAL_FLOAT_EXPOSURE")
    prior["signal_evaluations"]["MINERAL_FLOAT_EXPOSURE"] = {
        "status": "calculated",
        "signal_present": True,
        "reason": None,
    }

    correction = build_case_learning_summary(target, [prior], target_player_pid="1")[
        "one_priority_correction"
    ]

    assert correction["code"] == "MINERAL_FLOAT_EXPOSURE"
    assert correction["selection_rationale"]["recurrence_rate"] == 1.0
    assert correction["selection_rationale"]["current_anchor_second"] == 80


def test_larger_cohort_can_outrank_perfect_two_game_rate_on_conservative_strength():
    target = _learning_analysis("a" * 64)
    hard = target["analysis_by_player"]["1"]["hard_data"]
    mineral = next(
        row for row in hard["mineral_exposure"]["thresholds"] if row["minerals"] == 1000
    )
    mineral["windows"] = [{"start_second": 80, "end_second": 110, "duration_seconds": 30}]
    mineral["total_exposure_seconds"] = 30
    candidates = []
    for index in range(9):
        candidate = build_case_learning_index(
            _learning_analysis(f"{index + 10:064x}"), "1"
        )
        candidate["opening_signal_codes"] = (
            ["SUPPLY_BLOCK_EXPOSURE"] if index < 7 else []
        )
        candidate["signal_evaluations"]["SUPPLY_BLOCK_EXPOSURE"] = {
            "status": "calculated",
            "signal_present": index < 7,
            "reason": None,
        }
        if index == 0:
            candidate["opening_signal_codes"].append("MINERAL_FLOAT_EXPOSURE")
            candidate["signal_evaluations"]["MINERAL_FLOAT_EXPOSURE"] = {
                "status": "calculated",
                "signal_present": True,
                "reason": None,
            }
        else:
            candidate["signal_evaluations"]["MINERAL_FLOAT_EXPOSURE"] = {
                "status": "withheld",
                "signal_present": None,
                "reason": "Fixture intentionally withholds mineral observability.",
            }
        candidates.append(candidate)

    summary = build_case_learning_summary(target, candidates, target_player_pid="1")
    signals = {
        row["code"]: row for row in summary["recurring_first_five_signature"]["signals"]
    }
    correction = summary["one_priority_correction"]

    assert signals["MINERAL_FLOAT_EXPOSURE"]["recurrence_rate"] == 1.0
    assert signals["MINERAL_FLOAT_EXPOSURE"]["conservative_recurrence_lower_bound"] == 0.342372
    assert signals["SUPPLY_BLOCK_EXPOSURE"]["recurrence_rate"] == 0.8
    assert signals["SUPPLY_BLOCK_EXPOSURE"]["conservative_recurrence_lower_bound"] == 0.490157
    assert correction["code"] == "SUPPLY_BLOCK_EXPOSURE"
    assert correction["selection_rationale"]["expert_priority_status"] == "UNVERIFIED"
