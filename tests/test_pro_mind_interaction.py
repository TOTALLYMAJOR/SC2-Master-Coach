from pathlib import Path

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


def test_v161_loads_story_module_before_pro_mind():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    assert 'CURRENT_VERSION = "1.6.1"' in app
    assert app.index('"/pro-mind-stories.js"') < app.index('"/pro-mind.js"')
    assert '!define VERSION "1.6.1"' in installer
    assert 'VIProductVersion "1.6.1.0"' in installer
