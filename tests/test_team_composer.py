from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_team_composer_defines_exactly_ten_strategy_archetypes():
    data = (STATIC / "team-composer-data.js").read_text(encoding="utf-8")
    ids = re.findall(r'\{id:"([a-z-]+)",title:', data)
    assert len(ids) == 10
    assert len(set(ids)) == 10
    assert "false-front" in ids
    assert "hammer-anvil" in ids
    assert "lantern-blade" in ids
    assert "two-doors" in ids
    assert "wild-card" in ids


def test_team_composer_contains_current_2v2_map_pool_and_patch_tag():
    data = (STATIC / "team-composer-data.js").read_text(encoding="utf-8")
    assert 'const PATCH="5.0.16b"' in data
    for name in (
        "Fields of Death CE",
        "Gemgarden LE",
        "New Bed of Chaos LE",
        "Reclamation LE",
        "Rhoskallian LE",
        "Rust Bucket LE",
        "Sludge City",
        "Undercurrent LE",
        "Yellowjacket",
    ):
        assert name in data


def test_default_workflow_is_four_races_to_ten_plans_to_live_coach():
    script = (STATIC / "team-composer.js").read_text(encoding="utf-8")
    css = (STATIC / "team-composer.css").read_text(encoding="utf-8")
    for phrase in (
        "Who is on the battlefield?",
        "Show 10 Team Strategies",
        "Choose one of 10 team plans",
        "Battle Story",
        "Your role",
        "Ally role",
        "Start Live Coach",
        "My action now",
        "Advanced Command Center",
    ):
        assert phrase in script
    assert "body.team-default>.hud{display:none!important}" in css
    assert "body.team-advanced>.hud{display:block!important}" in css


def test_team_plans_have_story_roles_scout_abort_and_build_windows():
    data = (STATIC / "team-composer-data.js").read_text(encoding="utf-8")
    assert data.count("story:") >= 10
    assert data.count("scout:") >= 10
    assert data.count("abort:") >= 10
    assert data.count("roles:") >= 10
    assert "yourBuild:buildFor" in data
    assert "allyBuild:buildFor" in data
    assert "timing windows are benchmarks" in data


def test_live_coach_keeps_evidence_boundary_and_high_value_signals():
    script = (STATIC / "team-composer.js").read_text(encoding="utf-8")
    for signal in ("No natural", "Fast third", "Extra production", "Move-out", "Air / tech", "Turtle", "Hidden tech"):
        assert signal in script
    assert "the coach does not see the live game" in script
    assert 'new CustomEvent("sc2:signal"' in script


def test_team_composer_assets_are_loaded_by_app():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert '"/team-composer.css"' in app
    assert '"/team-composer-data.js"' in app
    assert '"/team-composer.js"' in app
    assert app.index('"/team-composer-data.js"') < app.index('"/team-composer.js"')
