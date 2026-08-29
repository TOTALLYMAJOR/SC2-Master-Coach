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
        "Deploy Practice Operation",
        "Reroll Scenario",
        "chooseRandomOperation",
        "chooseRandomOneVOne",
        "chooseRandomTeam",
        "Experimental practice estimate",
    ):
        assert phrase in ui
    assert "stop browsing builds" in ui.lower()


def test_v110_command_shell_uses_truthful_sc2_status_and_original_navigation():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    css = (STATIC / "v110-hud.css").read_text(encoding="utf-8")
    for phrase in (
        "Setup",
        "Live Coach",
        "Plan Reference",
        "Session Review",
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
        "function activeIntelSnapshot()",
        'label:"EXPIRED"',
        "Clear reported intel",
        "function clearReportedIntel()",
        "E.clearEvidence()",
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


def test_v110_mission_control_carries_the_active_master_intel_drill():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for phrase in (
        'ACTIVE_DRILL_KEY="sc2-master-coach:active-drill:v1"',
        "ACTIVE_DRILL_SCHEMA_VERSION=2",
        "function activeDrill()",
        "function validDrillAuthority(row)",
        "sourceLabel",
        "Practice target / Guided execution",
        "Selected practice target",
        "Assigned practice scenario",
        "The target above guides what to measure.",
        "live Strategic OS and player-reported battlefield evidence govern plan changes.",
        "Target:",
        "Measure:",
        "Source:",
        "Local practice selection, not observed game state.",
        "Analysis horizon",
        "dimensionObservationLimit",
        "coaching validity unverified",
        "eligible player reports across",
        'href="/#/practice"',
    ):
        assert phrase in ui
    assert "loadJson(ACTIVE_DRILL_KEY,null)" in ui
    assert 'saved?.schemaVersion!==ACTIVE_DRILL_SCHEMA_VERSION' in ui
    assert 'text(row.evidenceAnchorStatus)==="calculated"' in ui
    assert "saved.session.drill&&!validDrillAuthority(saved.session.drill)" in ui
    assert "source=text(row.source),sourceLabel=text(row.sourceLabel)||source" in ui
    assert "id&&title&&target&&why&&source&&measure&&scenario&&evidenceStatus" in ui
    assert "const drill=currentDrill();" in ui
    assert "const report=progressionReport(matchupKey())" in ui
    assert "WORKER_CONTINUITY_STALL" in ui
    assert "focusGoals" in ui
    css = (STATIC / "v110-hud.css").read_text(encoding="utf-8")
    assert ".v110-review>p.v110-analysis-horizon" in css
    assert ".v110-review h1{font-size:34px" in css
    assert "Context aligned" in ui
    assert "Player-chosen baseline" in ui
    assert "Transfer practice" in ui


def test_guided_execution_keeps_hud_route_compatibility_and_practice_return():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    legacy = (STATIC / "legacy-index.html").read_text(encoding="utf-8")
    assert '@app.get("/hud")' in app
    assert '(STATIC / "legacy-index.html").read_text' in app
    assert "SC2 Master Coach — Guided Execution" in legacy
    assert "Master Coach // Guided Execution" in legacy
    assert "Guided Execution is a coaching interface, not gameplay automation." in legacy
    assert 'href="/#/practice"' in legacy
    assert "Return to Practice" in legacy
    assert "Legacy Command HUD" not in legacy


def test_guided_execution_narrow_layout_preserves_priority_without_horizontal_status_scroll():
    css = (STATIC / "v110-hud.css").read_text(encoding="utf-8")
    legacy = (STATIC / "legacy-index.html").read_text(encoding="utf-8")
    assert ".v110-statusbar{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:hidden}" in css
    assert ".v110-status-cell:nth-of-type(2),.v110-status-cell:nth-of-type(7){display:none}" in css
    assert ".v110-return{position:relative;right:auto;top:auto;z-index:450;display:flex;width:100%" in css
    assert "text-decoration:none" in css
    assert ".v110-practice-focus{display:flex;flex-direction:column;gap:12px}" in css
    assert ".v110-deploy-cta{position:static;margin-top:16px" in css
    assert ".v110-deploy-cta>div{display:block}" in css
    assert "#v110Start{position:fixed;left:12px;right:12px;bottom:12px" in css
    assert 'class="v110-return" style=' not in legacy


def test_guided_execution_guards_sync_focus_and_1v1_replay_targets():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for phrase in (
        "let syncInProgress=false",
        'if(!currentPlan()){toast("Deploy a practice operation before synchronizing the match clock.")',
        'if(syncInProgress){toast("Clock synchronization is already in progress.")',
        'focusId:"v110Action"',
        "function focusSelector(node)",
        "drillKey:drillIdentity()",
        "Replay-derived practice targets are scoped to 1v1.",
        'window.SC2MasterCoachHud={reportEvidence:',
    ):
        assert phrase in ui


def test_guided_execution_persists_and_recovers_interrupted_sessions_truthfully():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    css = (STATIC / "v110-hud.css").read_text(encoding="utf-8")
    for phrase in (
        'ACTIVE_EXECUTION_KEY="sc2-master-coach:active-execution:v1"',
        'SESSION_RECEIPTS_KEY="sc2-master-coach:execution-receipts:v1"',
        "function executionSnapshot()",
        "function persistExecution()",
        "function restoreExecution()",
        "function appendExecutionReceipt",
        "Session resumed at",
        "Clock is approximate until you resync",
        "Resume session",
        "End session & review",
        "Latest local session receipt",
        "Reported checkpoint consistency",
        "neither proves gameplay outcomes or improvement",
        "Resume or discard the interrupted session before starting another",
    ):
        assert phrase in ui
    assert 'timerRunning=false;timerSynced=false' in ui
    assert '!["brief","hud","spellbook"].includes(view)' in ui
    assert "persistExecution();if(mode!==\"1v1\")return" in ui
    assert ".v110-resume-card" in css
    assert ".v110-receipt" in css
    assert ".v110-btn.end-session" in css


def test_guided_execution_preserves_native_keyboard_actions_and_announces_decisions():
    ui = (STATIC / "v110-hud.js").read_text(encoding="utf-8")
    for phrase in (
        'id="v110DecisionAnnouncement"',
        "button,a,summary,input,select,textarea,[contenteditable='true']",
        'closeOverlay("v110Palette");fn()',
        'window.confirm("Discard this interrupted session?',
        'setText("v110DecisionAnnouncement",announcement)',
        'document.querySelector(".v111-science-overlay")',
        'aria-label="${safe(label)}"',
        '.v110-help[data-tip]',
        'button.dataset.tip',
    ):
        assert phrase in ui
    hud_markup = ui.split("function hudView", 1)[1].split("function liveOutput", 1)[0]
    assert 'id="v110Pause" aria-pressed' not in hud_markup
    assert hud_markup.index('class="v110-scenario-box"') < hud_markup.index('id="v110Next"')
    assert 'permissionNode.className=`v110-permission ${o.permission===' in ui
