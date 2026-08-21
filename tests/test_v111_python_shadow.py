from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_python_shadow_adapter_exists_and_loads_after_combat_hud():
    shadow = STATIC / "v111-python-shadow.js"
    opportunity = STATIC / "v111-opportunity-cost.js"
    assert shadow.is_file()
    assert opportunity.is_file()

    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert '"/v111-python-shadow.js"' in app
    assert '"/v111-opportunity-cost.js"' in app
    assert app.index('"/v110-hud.js"') < app.index('"/v111-python-shadow.js"') < app.index('"/v111-opportunity-cost.js"')
    assert 'CURRENT_VERSION = "1.11.1"' in app


def test_shadow_adapter_uses_local_science_health_audio_and_run_endpoints():
    ui = (STATIC / "v111-python-shadow.js").read_text(encoding="utf-8")
    for phrase in (
        'fetch("/api/science/health"',
        'fetch("/api/science/audio/status"',
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
    released_hud = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    assert 'id="v110Check"' in released_hud
    assert 'closest?.("#v110Check")' in ui
    assert "#v110CheckPlan" not in ui
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


def test_python_diagnostics_are_compact_and_include_native_microphone_boundary():
    ui = (STATIC / "v111-python-shadow.js").read_text(encoding="utf-8")
    for phrase in (
        "Python Intelligence Diagnostics",
        "SQLite",
        "Digital Twin",
        'Python ${health.mode||"shadow"} · Ready',
        "Native microphone",
        "Windows-visible inputs",
        "This verifies Windows device visibility only",
        "v111-science-overlay",
    ):
        assert phrase in ui
    # Diagnostics are an on-demand overlay/status chip, not a permanent HUD grid.
    assert "v110-live-grid" not in ui


def test_shadow_status_observer_is_hud_scoped_and_idempotent():
    ui = (STATIC / "v111-python-shadow.js").read_text(encoding="utf-8")
    assert "setTextIfChanged(button,row.label)" in ui
    assert "if(node.textContent!==text)node.textContent=text" in ui
    assert 'observer.observe(hud,{subtree:true,childList:true})' in ui
    assert "observer.observe(document.documentElement" not in ui


def test_opportunity_cost_and_threat_hazard_are_on_demand_only():
    ui = (STATIC / "v111-opportunity-cost.js").read_text(encoding="utf-8")
    for phrase in (
        "Opportunity-cost window",
        "Recognized named commitments",
        "What those resources compete with",
        "commitment_window",
        "not an estimate of the player's exact live bank",
        "Near-term attack hazard · qualitative",
        "threat_hazard",
        "Next resolving intel",
        "no calibrated attack probability is claimed",
    ):
        assert phrase in ui
    assert "v111ScienceOverlay" in ui
    assert "data-v111-threat-hazard" in ui
    assert "data-v111-opportunity-cost" in ui
