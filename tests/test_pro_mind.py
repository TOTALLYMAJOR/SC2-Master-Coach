from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_pro_mind_models_cover_all_nine_matchups():
    data = (STATIC / "pro-mind-data.js").read_text(encoding="utf-8")
    for matchup in ("PvT", "PvZ", "PvP", "TvZ", "TvP", "TvT", "ZvT", "ZvP", "ZvZ"):
        assert f"{matchup}:{{" in data
    assert 'patch:"5.0.16b"' in data
    assert data.count("signalResponses:") == 9
    assert data.count("expansion:X(") == 9


def test_pvt_teaches_capability_choice_scouting_and_third_permission():
    data = (STATIC / "pro-mind-data.js").read_text(encoding="utf-8")
    assert 'B("blink","Blink / mobility"' in data
    assert 'B("stargate","Stargate / air information"' in data
    assert 'B("colossus","Robo / Colossus stability"' in data
    assert 'X("Third Nexus"' in data
    assert "Correct information expires" in data
    assert "Pre-third permission scout" in data
    assert "YOU BOUGHT THIS" not in data


def test_pro_mind_ui_exposes_unspoken_reasoning_and_manual_evidence_boundary():
    script = (STATIC / "pro-mind.js").read_text(encoding="utf-8")
    css = (STATIC / "pro-mind.css").read_text(encoding="utf-8")
    assert "PRO MIND // Unwritten Game" in script
    assert "WHAT WOULD A PRO ASK RIGHT NOW?" in script
    assert "OPEN STRATEGIC BRANCHES" in script
    assert "EXPANSION PERMISSION" in script
    assert "YOU BOUGHT THIS — NOW PROTECT THE INVESTMENT" in script
    assert "no live SC2 integration" in script
    assert "signal-times:v1" in script
    assert ".pro-permission.good" in css
    assert ".pro-branch.favored" in css


def test_quick_signals_are_timestamped_and_notify_pro_mind():
    script = (STATIC / "spellbook-signals.js").read_text(encoding="utf-8")
    assert 'SIGNAL_TIME_KEY="sc2-master-coach:signal-times:v1"' in script
    assert 'new CustomEvent("sc2:signal"' in script
    assert "gameSecond" in script
    assert "Signals are time-stamped" in script


def test_pro_mind_assets_load_and_installer_version_matches_app():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    app_match = re.search(r'^CURRENT_VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"$', app, re.MULTILINE)
    installer_match = re.search(r'^!define VERSION "([0-9]+\.[0-9]+\.[0-9]+)"$', installer, re.MULTILINE)
    product_match = re.search(r'^VIProductVersion "([0-9]+\.[0-9]+\.[0-9]+)\.0"$', installer, re.MULTILINE)
    assert app_match and installer_match and product_match
    assert app_match.group(1) == installer_match.group(1) == product_match.group(1)
    assert '"/pro-mind.css"' in app
    assert '"/pro-mind-data.js"' in app
    assert '"/pro-mind-stories.js"' in app
    assert '"/pro-mind.js"' in app
    assert app.index('"/pro-mind-stories.js"') < app.index('"/pro-mind.js"')
