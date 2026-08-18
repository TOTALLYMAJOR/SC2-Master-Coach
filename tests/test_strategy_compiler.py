from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_strategy_compiler_assets_exist():
    for name in (
        "strategy-compiler-data.js",
        "strategy-compiler-engine.js",
        "strategy-compiler-ui.js",
        "strategy-compiler.css",
    ):
        assert (STATIC / name).is_file(), name


def test_strategy_compiler_covers_ten_goals_and_nine_matchups():
    data = (STATIC / "strategy-compiler-data.js").read_text(encoding="utf-8")
    goal_ids = re.findall(r'\{id:"([a-z_]+)",label:', data.split("const GOALS=[", 1)[1].split("];", 1)[0])
    assert len(goal_ids) == 10
    assert len(set(goal_ids)) == 10
    for matchup in ("PvT", "PvZ", "PvP", "TvP", "TvZ", "TvT", "ZvP", "ZvT", "ZvZ"):
        assert f"{matchup}:{{" in data
    assert 'const PATCH="5.0.16b"' in data


def test_pvt_three_base_has_rules_assumptions_scouts_and_fallbacks():
    data = (STATIC / "strategy-compiler-data.js").read_text(encoding="utf-8")
    for phrase in (
        "Information-First Triple Nexus",
        "Reaper scouting/pressure",
        "A Reaper is information and pressure, not automatic proof of a rush.",
        "No-natural production",
        "Hold the third. Add units and defensive geometry now.",
        "pvt-three-base-safe",
        "reinforcement_access",
    ):
        assert phrase in data


def test_event_sourced_engine_voice_mastery_and_attention_contracts():
    engine = (STATIC / "strategy-compiler-engine.js").read_text(encoding="utf-8")
    for phrase in (
        'schemaVersion:"1.0"',
        '"evidence.reported"',
        '"plan.evaluated"',
        '"mastery.updated"',
        '"attention.cue_queued"',
        "function parseVoice",
        "function activeEvidence",
        "function recordMastery",
        "function replayEvents",
        "confirmationRequired",
    ):
        assert phrase in engine
    assert ".slice(0,3)" in engine
    assert "recognitionConfidence" in engine
    assert "strategicConfidence" in engine


def test_guided_ctas_and_explanatory_workflow_are_visible():
    ui = (STATIC / "strategy-compiler-ui.js").read_text(encoding="utf-8")
    css = (STATIC / "strategy-compiler.css").read_text(encoding="utf-8")
    for phrase in (
        "Forge My Strategy",
        "Start Guided Coach",
        "Can I still do my plan?",
        "Tap to report intel",
        "How this works",
        "One question",
        "Only three future windows",
        "What Master Coach can know live",
        "Try safer plan",
        "Try greedier plan",
    ):
        assert phrase in ui
    assert ".strategy-modal" in css
    assert "[data-tip]:hover:after" in css
    assert "body.strategy-default>#teamShell" in css


def test_original_race_svg_art_is_self_contained_and_accessible():
    for name in (
        "protoss-strategy.svg",
        "terran-strategy.svg",
        "zerg-strategy.svg",
        "unknown-strategy.svg",
    ):
        path = STATIC / "artwork" / name
        assert path.is_file(), name
        text = path.read_text(encoding="utf-8")
        root = ET.fromstring(text)
        assert root.tag.endswith("svg")
        assert "<title" in text
        assert "<desc" in text
        assert "Not official Blizzard artwork" in text or name == "unknown-strategy.svg"
        assert "http://" not in text.replace('xmlns="http://www.w3.org/2000/svg"', "")
        assert "https://" not in text


def test_app_loads_compiler_in_dependency_order_and_versions_match():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    app_match = re.search(r'^CURRENT_VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"$', app, re.MULTILINE)
    installer_match = re.search(r'^!define VERSION "([0-9]+\.[0-9]+\.[0-9]+)"$', installer, re.MULTILINE)
    product_match = re.search(r'^VIProductVersion "([0-9]+\.[0-9]+\.[0-9]+)\.0"$', installer, re.MULTILINE)
    assert app_match and installer_match and product_match
    assert app_match.group(1) == installer_match.group(1) == product_match.group(1)
    for asset in (
        '"/strategy-compiler.css"',
        '"/strategy-compiler-data.js"',
        '"/strategy-compiler-engine.js"',
        '"/strategy-compiler-ui.js"',
    ):
        assert asset in app
    assert app.index('"/strategy-compiler-data.js"') < app.index('"/strategy-compiler-engine.js"') < app.index('"/strategy-compiler-ui.js"')
