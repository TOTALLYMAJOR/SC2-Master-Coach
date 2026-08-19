from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_strategic_os_assets_exist():
    for name in (
        "strategic-os-kernel.js",
        "strategic-os-runtime-guard.js",
        "strategic-os-ui.js",
        "strategic-os.css",
        "strategic-os-fixes.css",
    ):
        assert (STATIC / name).is_file(), name


def test_kernel_exposes_six_canonical_objects_and_event_backing():
    kernel = (STATIC / "strategic-os-kernel.js").read_text(encoding="utf-8")
    for phrase in (
        "mission:missionObject()",
        "policy:policyObject()",
        "intel:intelObject()",
        "permissions:permissionsObject()",
        "obligations:obligationsObject()",
        "decision:decisionObject()",
        "events:{count:",
        "replayEvents",
    ):
        assert phrase in kernel


def test_permissions_obligations_and_not_yet_scheduler_are_implemented():
    kernel = (STATIC / "strategic-os-kernel.js").read_text(encoding="utf-8")
    for phrase in (
        'permission("expansion","HOLD"',
        'permission("technology","CAUTION"',
        'permission("workers","COMPRESS"',
        'permission("harassment","DISENGAGE"',
        "OBLIGATION_LIBRARY",
        "NOT_YET_LIBRARY",
        "fresh_threat_read",
        "reinforcement_access",
        "production_conversion",
    ):
        assert phrase in kernel


def test_runtime_guard_deduplicates_same_second_clock_events():
    guard = (STATIC / "strategic-os-runtime-guard.js").read_text(encoding="utf-8")
    assert "normalized===lastSecond" in guard
    assert "lastEvaluatedSecond!==normalized" in guard
    assert "return K.snapshot()" in guard


def test_war_room_and_command_surface_have_clear_cognitive_contract():
    ui = (STATIC / "strategic-os-ui.js").read_text(encoding="utf-8")
    for phrase in (
        "Mission Control",
        "War Room",
        "Command Surface",
        "Assumption ledger",
        "Permission engine",
        "Obligation engine",
        "Now, soon, and not yet",
        "ONE QUESTION",
        "DO NOW",
        "Only three future windows",
        "Report only decision-changing facts",
        "Can I still do my plan?",
    ):
        assert phrase in ui


def test_command_surface_keeps_replay_secondary_and_modes_accessible():
    ui = (STATIC / "strategic-os-ui.js").read_text(encoding="utf-8")
    css = (STATIC / "strategic-os.css").read_text(encoding="utf-8")
    assert "2v2 Operations" in ui
    assert "Strategy Compiler" in ui
    assert "Advanced" in ui
    command = ui.split("function commandView", 1)[1].split("function chrome", 1)[0]
    assert "Replay" not in command
    assert "body.strategic-os-default>#strategyCompilerShell" in css
    assert "body.strategic-os-default>#teamShell" in css
    assert "body.strategic-os-default>.hud" in css


def test_voice_adapter_reports_real_errors_and_startup_failures():
    ui = (STATIC / "strategic-os-ui.js").read_text(encoding="utf-8")
    for phrase in (
        "SpeechRecognition is unavailable in this embedded runtime",
        "Microphone permission was denied",
        "No usable microphone input was found",
        "Speech recognition is not permitted in this WebView runtime",
        "The microphone could not start",
        "recognition.onerror",
        "recognition.start()",
    ):
        assert phrase in ui


def test_app_loads_strategic_os_after_compiler_and_versions_match():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    app_match = re.search(r'^CURRENT_VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"$', app, re.MULTILINE)
    installer_match = re.search(r'^!define VERSION "([0-9]+\.[0-9]+\.[0-9]+)"$', installer, re.MULTILINE)
    product_match = re.search(r'^VIProductVersion "([0-9]+\.[0-9]+\.[0-9]+)\.0"$', installer, re.MULTILINE)
    assert app_match and installer_match and product_match
    assert app_match.group(1) == installer_match.group(1) == product_match.group(1)
    for asset in (
        '"/strategic-os.css"',
        '"/strategic-os-fixes.css"',
        '"/strategic-os-kernel.js"',
        '"/strategic-os-runtime-guard.js"',
        '"/strategic-os-ui.js"',
    ):
        assert asset in app
    assert app.index('"/strategy-compiler-engine.js"') < app.index('"/strategic-os-kernel.js"') < app.index('"/strategic-os-runtime-guard.js"') < app.index('"/strategic-os-ui.js"')
