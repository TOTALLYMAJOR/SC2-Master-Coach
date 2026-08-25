from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_v110_hud_assets_exist():
    for name in ("v110-hud.js", "v110-hud.css"):
        assert (STATIC / name).is_file(), name


def test_v110_hud_is_default_and_versions_match():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    app_version = re.search(r'^CURRENT_VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"$', app, re.MULTILINE)
    installer_version = re.search(r'^!define VERSION "([0-9]+\.[0-9]+\.[0-9]+)"$', installer, re.MULTILINE)
    product_version = re.search(r'^VIProductVersion "([0-9]+\.[0-9]+\.[0-9]+)\.0"$', installer, re.MULTILINE)
    assert app_version and installer_version and product_version
    assert app_version.group(1) == installer_version.group(1) == product_version.group(1)
    assert '"/v110-hud.css"' in app
    assert '"/v110-hud.js"' in app
    assert app.index('"/strategy-library.js"') < app.index('"/live-checkpoints.js"') < app.index('"/v110-hud.js"')
    assert app.index('"/strategy-compiler-data.js"') < app.index('"/strategy-compiler-engine.js"') < app.index('"/v110-hud.js"')


def test_v110_navigation_random_operation_and_no_manual_plan_browser():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for phrase in (
        "Deploy",
        "Live HUD",
        "Spellbook",
        "Review",
        "Deploy Random Operation",
        "Reroll Operation",
        "chooseRandomOperation",
        "chooseRandomOneVOne",
        "chooseRandomTeam",
        "Curated random",
    ):
        assert phrase in ui
    assert "browse ten builds" in ui.lower()


def test_v110_command_shell_uses_truthful_sc2_status_and_original_navigation():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    css = (STATIC / "v110-hud.css").read_text(encoding="utf-8")
    for phrase in (
        "Mission Control",
        "Live Coach",
        "Doctrine Lab",
        "Debrief",
        "LOCAL-ONLY RUNTIME",
        "PLAYER-REPORTED INTEL",
        "No direct SC2 process access",
        "MATCH CLOCK",
        "UNREPORTED",
        "v110-command-shell",
    ):
        assert phrase in ui or phrase in css
    for copied_or_invented_phrase in (
        "AEGIS",
        "UPLINK SECURE",
        "SAT RELAY",
        "ACTIVE UNITS",
        "CLEARANCE",
    ):
        assert copied_or_invented_phrase not in ui
    assert "grid-template-columns:236px minmax(0,1fr)" in css
    assert "@media(max-width:1320px)" in css


def test_v110_timer_sync_and_command_palette_hotkeys():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for phrase in (
        "Sync 3–2–1 & Start HUD",
        'for(const value of ["3","2","1","LIVE"])',
        "let lastEngineSecond=null;",
        "function syncEngineClock(force=false)",
        "Ctrl/⌘ K",
        "sync timer to 4:25",
        'data-shift="-10"',
        'data-shift="10"',
        "Can I Still Do My Plan?",
        'if(/^[1-6]$/.test(e.key)',
        'if(key==="s")',
        'if(key==="r")',
        'if(key==="b")',
        'if(key==="h"',
    ):
        assert phrase in ui
    assert "if(!force&&whole===lastEngineSecond)return;" in ui
    assert "if(force||whole%5===0)E.evaluate()" in ui


def test_v110_player_reports_evidence_and_engine_selects_branch():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for phrase in (
        "Report what you see",
        "One click reports immediately. Optional detail improves confidence.",
        "E.reportEvidence",
        "E.evaluate()",
        "reaper",
        "normal_natural",
        "no_natural",
        "extra_production",
        "move_out",
        "fast_third",
    ):
        assert phrase in ui


def test_v110_accessibility_and_live_focus_contracts():
    ui = (ROOT / "static" / "v110-hud.js").read_text(encoding="utf-8")
    css = (ROOT / "static" / "v110-hud.css").read_text(encoding="utf-8")
    for phrase in (
        'href="#v110Main"',
        'role="dialog" aria-modal="true"',
        'role="status" aria-live="polite"',
        'role="alert" aria-live="assertive"',
        'aria-current="page"',
        'aria-pressed=',
        "function closeOverlay(id)",
        "function trapFocus(event,container)",
        "function updateScenarioButtons()",
        "function toggleTimer()",
    ):
        assert phrase in ui
    assert ".v110-shell :focus-visible" in css
    assert ".v110-sr-only" in css
    assert "@media(max-width:480px)" in css
    assert "@media(prefers-reduced-motion:reduce)" in css


def test_v110_build_context_teaches_strategy_not_only_timestamps():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for phrase in (
        "Mission",
        "First units' real job",
        "Expected response",
        "Pivot",
        "Failure condition",
        "Unspoken rule",
        "Build windows with reasons",
        "Pressure succeeds when it forces a costly response; damage is optional.",
        "An expansion is safe because the punish window is controlled",
    ):
        assert phrase in ui


def test_v110_live_cognitive_load_and_large_type_contract():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    css = (STATIC / "v110-hud.css").read_text(encoding="utf-8")
    assert "One question" in ui
    assert "Do now" in ui
    assert "Primary permission" in ui
    assert ".slice(0,3)" in ui
    assert "font-size:18px" in css
    assert "font-size:28px" in css
    assert "font-size:58px" in css
    assert "font-size:clamp(42px,5vw,70px)" in css
    assert "grid-template-columns:repeat(6,1fr)" in css


def test_v110_voice_prefers_more_natural_installed_windows_voices():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    assert "SpeechSynthesisUtterance" in ui
    assert "Aria|Jenny|Guy|Sonia|Ryan|Christopher" in ui
    assert "Natural|Neural" in ui
    assert "In five seconds" in ui


def test_v110_replay_is_secondary_but_advanced_remains_reachable():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    hud = ui.split("function hudView", 1)[1].split("function liveOutput", 1)[0]
    assert "Replay" not in hud
    assert "Open Advanced Review" in ui
    assert "Open Advanced Command Center" in ui
