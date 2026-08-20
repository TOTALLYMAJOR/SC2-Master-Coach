from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_python_shadow_adapter_exists_and_loads_after_combat_hud():
    path = STATIC / "v111-python-shadow.js"
    assert path.is_file()

    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert '"/v111-python-shadow.js"' in app
    assert app.index('"/v110-hud.js"') < app.index('"/v111-python-shadow.js"')
    # Development work must not silently become a new public release.
    assert 'CURRENT_VERSION = "1.10.0"' in app


def test_shadow_adapter_uses_local_science_health_and_run_endpoints():
    ui = (STATIC / "v111-python-shadow.js").read_text(encoding="utf-8")
    for phrase in (
        'fetch("/api/science/health"',
        'fetch("/api/science/run"',
        'capability_id:"digital_twin"',
        "ruleset_version",
        "event_sequence",
        "E.activeEvidence",
        "E.currentOutput",
    ):
        assert phrase in ui


def test_shadow_mode_visibly_preserves_strategic_os_authority():
    ui = (STATIC / "v111-python-shadow.js").read_text(encoding="utf-8")
    for phrase in (
        "Strategic OS · Authoritative",
        "Python Digital Twin · Shadow only",
        "canonical state mutated",
        "Python output is advisory and cannot replace deterministic HUD state",
        "may_influence_live_surface",
    ):
        assert phrase in ui

    # This adapter may read/evaluate canonical state, but must not report new
    # evidence, select a plan variant, or alter the Strategic OS configuration.
    assert "E.reportEvidence(" not in ui
    assert "E.selectVariant(" not in ui
    assert "E.configure(" not in ui


def test_can_i_still_do_my_plan_is_intercepted_for_side_by_side_comparison():
    ui = (STATIC / "v111-python-shadow.js").read_text(encoding="utf-8")
    assert 'closest?.("#v110CheckPlan")' in ui
    assert "stopImmediatePropagation" in ui
    assert "comparePlan()" in ui
    assert "Can I still do my plan?" in ui


def test_shadow_adapter_fails_safe_when_python_is_unavailable_or_out_of_scope():
    ui = (STATIC / "v111-python-shadow.js").read_text(encoding="utf-8")
    for phrase in (
        "Python Intelligence is unavailable, so the deterministic Strategic OS remains fully operational.",
        "The first Python Digital Twin currently supports Protoss vs Terran → three-base economy.",
        "Python Shadow · Unavailable",
        "deterministic Combat HUD remains authoritative",
    ):
        assert phrase in ui


def test_python_diagnostics_are_compact_and_do_not_create_live_hud_panel():
    ui = (STATIC / "v111-python-shadow.js").read_text(encoding="utf-8")
    assert "Python Intelligence Diagnostics" in ui
    assert "SQLite" in ui
    assert "Digital Twin" in ui
    assert "Python Shadow · Ready" in ui
    assert "v111-science-overlay" in ui
    # Diagnostics are an on-demand overlay/status chip, not a permanent HUD grid.
    assert "v110-live-grid" not in ui
