from __future__ import annotations

import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_progression_engine_loads_before_combat_hud():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert '"/coach-progression.js"' in app
    assert app.index('"/live-checkpoints.js"') < app.index('"/coach-progression.js"')
    assert app.index('"/coach-progression.js"') < app.index('"/v110-hud.js"')


def test_progression_is_versioned_bounded_and_no_replay():
    engine = (STATIC / "coach-progression.js").read_text(encoding="utf-8")
    assert "const VERSION=2" in engine
    assert "const LIMIT=240" in engine
    assert "function migrateLegacy(rows)" in engine
    assert "recurring=row.evidence>=minEvidence" in engine
    assert "Math.pow(.5,ageDays/21)" in engine
    assert "replay_intelligence" not in engine
    assert "analysis_by_player" not in engine


def test_hud_exposes_progress_and_storage_failure_boundary():
    hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for phrase in (
        "SC2CoachProgression",
        "sc2-master-coach:progression:v2",
        "Player-report learning loop",
        "Next deliberate-practice drill",
        "Recorded for this session; local history is unavailable.",
        "P.toEvent({session:checkpointSession",
    ):
        assert phrase in hud


def test_focus_report_is_preserved_without_becoming_verified_outcome_evidence():
    engine = (STATIC / "coach-progression.js").read_text(encoding="utf-8")
    assert 'authority:"player_report"' in engine
    assert 'outcomeStatus:"reported_only"' in engine
    assert "event.report?.focus" not in engine.split("function classify(event)", 1)[1].split("function calculateTrend", 1)[0]
    assert "function summarizeFocus(events,focusCode=null)" in engine
    assert "focusSummary=summarizeFocus(events,focusCode)" in engine
    assert "otherFocusReports:allRows.length-rows.length" in engine
    assert 'status:graduationReady?"reported_ready_for_replay_review":"continue_reporting"' in engine
    assert "It is not proof of mastery, gameplay improvement, or replay-observed correction." in engine
    assert "mastery:" not in engine
    assert "reportedConsistency:" in engine


def _run_progression(expression: str):
    script = (
        "const fs=require('fs'),vm=require('vm'),context={};"
        "vm.createContext(context);"
        f"vm.runInContext(fs.readFileSync({json.dumps(str(STATIC / 'coach-progression.js'))},'utf8'),context);"
        "const P=context.SC2CoachProgression;"
        f"console.log(JSON.stringify({expression}));"
    )
    result = subprocess.run(
        ["node", "-e", script],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout
    return json.loads(result.stdout)


def _focus_event(event_id: str, session_id: str, value: str, recorded_at: int):
    return {
        "schema": 2,
        "id": event_id,
        "recordedAt": recorded_at,
        "sessionId": session_id,
        "report": {
            "status": "on_track",
            "focus": {
                "code": "SUPPLY_BLOCK_EXPOSURE",
                "value": value,
                "authority": "player_report",
                "outcomeStatus": "reported_only",
            },
        },
        "derived": {"changed": False, "confidence": "low"},
    }


def test_focus_graduation_requires_met_reports_in_two_distinct_sessions():
    same_session = [
        _focus_event("a", "session-1", "met", 1),
        _focus_event("b", "session-1", "met", 2),
    ]
    distinct_sessions = [
        _focus_event("a", "session-1", "met", 1),
        _focus_event("b", "session-2", "met", 2),
    ]

    same = _run_progression(
        f"P.summarizeFocus({json.dumps(same_session)},'SUPPLY_BLOCK_EXPOSURE')"
    )
    distinct = _run_progression(
        f"P.summarizeFocus({json.dumps(distinct_sessions)},'SUPPLY_BLOCK_EXPOSURE')"
    )

    assert same["graduation"]["status"] == "continue_reporting"
    assert same["graduation"]["distinctSessionsReported"] == 1
    assert distinct["graduation"]["status"] == "reported_ready_for_replay_review"
    assert distinct["outcomeStatus"] == "reported_only"
    assert distinct["graduation"]["authority"] == "player_report"
    assert "not proof of improvement" in distinct["recommendation"]["instruction"]


def test_later_uncertain_report_blocks_focus_graduation():
    events = [
        _focus_event("a", "session-1", "met", 1),
        _focus_event("b", "session-2", "met", 2),
        _focus_event("c", "session-3", "uncertain", 3),
    ]

    summary = _run_progression(
        f"P.summarizeFocus({json.dumps(events)},'SUPPLY_BLOCK_EXPOSURE')"
    )

    assert summary["graduation"]["status"] == "continue_reporting"
    assert summary["graduation"]["consecutiveMetSessions"] == 0


def test_progression_discloses_retention_and_analysis_horizons():
    events = [
        _focus_event(str(index), f"session-{index}", "met", index)
        for index in range(30)
    ]

    report = _run_progression(f"P.analyze({json.dumps(events)},{{now:30}})")

    assert report["horizon"] == {
        "authority": "bounded_local_history",
        "storedEventLimit": 240,
        "suppliedValidEvents": 30,
        "retainedEvents": 30,
        "scopedEvents": 30,
        "dimensionObservationLimit": 20,
        "availableDimensionObservations": 30,
        "dimensionObservationsUsed": 20,
        "storedLimitReached": False,
        "inputWasTruncated": False,
        "dimensionWindowTruncated": True,
        "focusReportsUsed": 30,
    }


def test_player_report_confidence_requires_distinct_sessions_not_checkpoint_volume():
    one_session = [
        _focus_event(str(index), "session-1", "met", index)
        for index in range(12)
    ]
    four_sessions = [
        _focus_event(str(index), f"session-{index // 3}", "met", index)
        for index in range(12)
    ]

    concentrated = _run_progression(f"P.analyze({json.dumps(one_session)},{{now:12}})")
    distributed = _run_progression(f"P.analyze({json.dumps(four_sessions)},{{now:12}})")

    assert concentrated["confidence"] == "low"
    assert concentrated["confidenceBasis"]["eligibleReports"] == 12
    assert concentrated["confidenceBasis"]["distinctSessions"] == 1
    assert concentrated["confidenceBasis"]["coachingValidity"] == "UNVERIFIED"
    assert concentrated["dimensions"][0]["confidence"] == "low"
    assert concentrated["dimensions"][0]["distinctSessions"] == 1
    assert "mastery" not in concentrated["dimensions"][0]
    assert "reportedConsistency" in concentrated["dimensions"][0]

    assert distributed["confidence"] == "high"
    assert distributed["confidenceBasis"]["distinctSessions"] == 4
    assert distributed["dimensions"][0]["confidence"] == "high"
    assert distributed["dimensions"][0]["confidenceAuthority"] == (
        "local_player_report_volume_and_distinct_sessions"
    )


def test_progression_runtime_harness():
    result = subprocess.run(
        ["node", str(ROOT / "tests" / "js" / "coach_progression_harness.cjs")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout
    assert "Coach progression harness passed" in result.stdout


def test_malformed_progression_status_fails_closed():
    engine = (STATIC / "coach-progression.js").read_text(encoding="utf-8")
    assert 'record.status)?record.status:"unknown"' in engine
    assert 'row.status)?row.status:"unknown"' in engine
    assert '!["on_track","behind"].includes(event.report?.status)' in engine
