from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_pro_mind_branch_state_survives_clock_renders():
    script = (STATIC / "pro-mind.js").read_text(encoding="utf-8")
    assert "const openBranches=new Set()" in script
    assert "lastStructuralSignature" in script
    assert "data-pro-branch" in script
    assert "if(!force&&signature===lastStructuralSignature)" in script
    assert "updateDynamicAge(exp.age)" in script


def test_pro_mind_has_hover_help_and_battle_story_ui():
    script = (STATIC / "pro-mind.js").read_text(encoding="utf-8")
    css = (STATIC / "pro-mind.css").read_text(encoding="utf-8")
    assert 'data-tip="Click to keep this strategic branch open' in script
    assert "BATTLE STORY // HOW THE PLAN CREATES TIME" in script
    assert ".pro-story" in css
    assert "[data-tip]:hover:after" in css


def test_battle_stories_cover_all_matchups_and_pvt_false_front():
    stories = (STATIC / "pro-mind-stories.js").read_text(encoding="utf-8")
    for matchup in ("PvT", "PvZ", "PvP", "TvZ", "TvP", "TvT", "ZvT", "ZvP", "ZvZ"):
        assert f"{matchup}:{{" in stories
    assert 'title:"The False Front"' in stories
    assert "attention and army are pulled right" in stories
    assert "take the third elsewhere" in stories


def test_story_module_loads_before_pro_mind_and_release_versions_match():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    app_match = re.search(r'^CURRENT_VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"$', app, re.MULTILINE)
    installer_match = re.search(r'^!define VERSION "([0-9]+\.[0-9]+\.[0-9]+)"$', installer, re.MULTILINE)
    product_match = re.search(r'^VIProductVersion "([0-9]+\.[0-9]+\.[0-9]+)\.0"$', installer, re.MULTILINE)
    assert app_match and installer_match and product_match
    assert app_match.group(1) == installer_match.group(1) == product_match.group(1)
    assert app.index('"/pro-mind-stories.js"') < app.index('"/pro-mind.js"')
