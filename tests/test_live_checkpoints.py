from __future__ import annotations

from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_checkpoint_engine_loads_between_library_and_combat_hud():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert '"/live-checkpoints.js"' in app
    assert app.index('"/strategy-library.js"') < app.index('"/live-checkpoints.js"')
    assert app.index('"/live-checkpoints.js"') < app.index('"/v110-hud.js"')


def test_concrete_matchup_library_is_primary_deploy_source():
    hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    assert "const L=window.SC2PlanLibrary" in hud
    assert "L.forMatchup(state.self,state.enemy)" in hud
    assert "C.adaptLibraryPlan(libraryPlan,base,state.skill)" in hud
    assert 'p.source?.kind==="matchup_library"?"Concrete matchup plan":"Compiler fallback"' in hud
    assert 'function currentPlan(){return mode==="1v1"?plan:teamPlan}' in hud
    assert "lastEngineState?.mission?.plan" not in hud


def test_live_checkpoint_contract_is_manual_report_driven_and_persisted_locally():
    hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    engine = (STATIC / "live-checkpoints.js").read_text(encoding="utf-8")
    for phrase in (
        "Actual ${safe(cp.worker.label)}",
        'data-checkpoint-report="on_track"',
        'data-checkpoint-report="behind"',
        'data-checkpoint-report="changed"',
        "C.confirm(checkpointSession",
        "CHECKPOINT_HISTORY_KEY",
    ):
        assert phrase in hud
    assert "replay" not in engine.lower()
    assert "Report actual state" in engine
    assert "Old benchmarks become harmful after the player changes plans" in engine


def test_all_visible_scout_signals_have_an_operative_checkpoint_policy():
    engine = (STATIC / "live-checkpoints.js").read_text(encoding="utf-8")
    for signal in (
        "normal_natural",
        "reaper",
        "factory",
        "starport",
        "no_natural",
        "extra_production",
        "move_out",
        "hidden_tech",
        "fast_third",
        "turtle",
    ):
        assert f"{signal}:{{" in engine
    assert "C.reportEvidence(checkpointSession,id,timerSeconds,scoutDetails)" in (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    assert "function evidenceDetails(value)" in engine
    assert "requiresConfirmation:true" in engine
    assert "attentionScore:score(active)" in engine
    assert 'definition.group==="expansion"' in engine


def test_skill_profiles_change_tolerance_and_cue_burden():
    engine = (STATIC / "live-checkpoints.js").read_text(encoding="utf-8")
    hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    assert "Bronze:{workerTolerance:7" in engine
    assert "Grandmaster:{workerTolerance:2" in engine
    assert "P.programForSkill(state.skill" in hud
    assert 'guided=["standard_safe"].includes(program.planPool)' in hud
    assert "function applyCoachingMode(profile,value)" in engine
    assert '"sc2-master-coach:first-run:v1"' in hud
    assert "row?.skill||row?.skillLevel||row?.level" in hud
    assert 'function chooseRandomOperation(){if(activeExecution()&&!executionStartedAt)' in hud
    assert "state.self=rememberedRace();state.skill=rememberedSkill();" in hud


def test_checkpoint_ui_is_responsive_and_keeps_one_active_card():
    css = (STATIC / "v110-hud.css").read_text(encoding="utf-8")
    hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    assert 'id="v110CheckpointHost"' in hud
    assert ".v110-checkpoint" in css
    assert ".v110-checkpoint-inputs" in css
    assert "@media(max-width:1100px)" in css
    assert "@media(max-width:720px)" in css
    assert 'if(!checkpointSession)return "";' in hud
    assert 'checkpointSession=mode==="1v1"?C.createSession' in hud
    assert "coachingMode,drill:activeDrill(),drillKey:drillIdentity()}" in hud


def test_active_replay_correction_becomes_a_player_reported_focus_checkpoint():
    engine = (STATIC / "live-checkpoints.js").read_text(encoding="utf-8")
    hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for code in (
        "WORKER_CONTINUITY_STALL",
        "MINERAL_FLOAT_EXPOSURE",
        "SUPPLY_BLOCK_EXPOSURE",
        "PRODUCTION_IDLE_EXPOSURE",
    ):
        assert code in engine
    for phrase in (
        "FOCUS_PROGRAMS",
        "function normalizeFocus(drill)",
        'authority:"player_report"',
        'normalizedFocus==="not_observed"?"not_evaluated":"reported_only"',
    ):
        assert phrase in engine
    for phrase in (
        'id="v110FocusActual"',
        "required player report",
        "compare the same signal manually in a later replay",
        "Practice focus${focus.label?",
        "player report only",
    ):
        assert phrase in hud
    assert 'if(checkpoint.focus&&!(["met","missed","uncertain","not_observed"].includes(focusReport)))return null' in engine
    assert "const observationSecond=300" in engine
    assert "Condition did not occur" in hud
    assert "Upcoming preview · report opens at" in hud
    assert "if(reportedSecond<checkpoint.at-session.profile.cueLead)return null" in engine


def test_benchmark_authority_is_explicitly_pending_expert_review():
    engine = (STATIC / "live-checkpoints.js").read_text(encoding="utf-8")
    hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    assert 'reviewState:"expert_review_required"' in engine
    assert 'benchmarkType:"derived_practice_range"' in engine
    assert "expert review remains required" in engine
    assert "Experimental practice estimate" in hud
    assert "Expert review unverified" in hud
    assert "Benchmark status: expert review required" in hud


def test_v112_clock_throttle_is_preserved_with_checkpoint_updates():
    hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    assert "let lastEngineSecond=null;" in hud
    assert "function syncEngineClock(force=false)" in hud
    assert "if(!force&&whole===lastEngineSecond)return;" in hud
    assert "if(force||whole%5===0)E.evaluate()" in hud
    assert "maybeCheckpointCue()" in hud


def test_checkpoint_runtime_harness():
    result = subprocess.run(
        ["node", str(ROOT / "tests" / "js" / "live_checkpoints_harness.cjs")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout
    assert "Live checkpoint harness passed" in result.stdout
