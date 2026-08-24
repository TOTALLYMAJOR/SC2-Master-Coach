from __future__ import annotations

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
    assert "replay" not in engine.lower()


def test_hud_exposes_progress_and_storage_failure_boundary():
    hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for phrase in (
        "SC2CoachProgression",
        "sc2-master-coach:progression:v2",
        "No-replay learning loop",
        "Next deliberate-practice drill",
        "Recorded for this session; local history is unavailable.",
        "P.toEvent({session:checkpointSession",
    ):
        assert phrase in hud


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
