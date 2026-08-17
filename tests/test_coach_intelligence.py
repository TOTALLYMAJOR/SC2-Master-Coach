from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_coach_intelligence_assets_are_wired_into_desktop_shell():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert '"/coach-intelligence.css"' in app
    assert '"/replay-identity.js"' in app
    assert '"/strategy-library.js"' in app
    assert '"/coach-intelligence.js"' in app


def test_replay_identity_is_not_hardcoded_to_first_player_anymore():
    identity = (STATIC / "replay-identity.js").read_text(encoding="utf-8")
    assert "replayName" in identity
    assert "forcedPid" in identity
    assert "unique preferred race" in identity
    assert "first-player fallback" in identity
    assert "sc2ShowReplayAs" in identity


def test_strategy_library_covers_all_matchups_and_fast_third_scenario():
    library = (STATIC / "strategy-library.js").read_text(encoding="utf-8")
    for matchup in (("Protoss","Terran"),("Protoss","Zerg"),("Protoss","Protoss"),("Terran","Zerg"),("Terran","Protoss"),("Terran","Terran"),("Zerg","Terran"),("Zerg","Protoss"),("Zerg","Zerg")):
        race, opponent = matchup
        assert f'race:"{race}",opponent:"{opponent}",scenario:"Standard"' in library
        assert f'race:"{race}",opponent:"{opponent}",scenario:"Opponent Fast Third / 3 Bases"' in library
    assert "Pin the Third, Don't Dive the Main" in library


def test_coach_panel_replaces_abstract_center_map_by_default_and_supports_voice():
    script = (STATIC / "coach-intelligence.js").read_text(encoding="utf-8")
    css = (STATIC / "coach-intelligence.css").read_text(encoding="utf-8")
    assert "Coach Narrative" in script
    assert "Viewing replay as" in script
    assert "Read briefing" in script
    assert "Read plan" in script
    assert "Load into coach" in script
    assert "Show decision map" in script
    assert "speechSynthesis" in script
    assert ".coach-replaced-map{display:none!important}" in css
