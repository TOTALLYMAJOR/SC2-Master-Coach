from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_training_enhancement_assets_exist():
    assert (STATIC / "training-enhancements.js").is_file()
    assert (STATIC / "training-enhancements.css").is_file()


def test_training_enhancements_are_loaded():
    experience = (STATIC / "experience.js").read_text(encoding="utf-8")
    assert "/training-enhancements.css" in experience
    assert "/training-enhancements.js" in experience


def test_build_cues_and_snapshots_are_present():
    script = (STATIC / "training-enhancements.js").read_text(encoding="utf-8")
    assert "In five seconds" in script
    assert "Build Log" in script
    assert "In-App Snapshot View" in script
    assert "Save PNG" in script
    assert "not game-rendered video frames" in script


def test_build_order_is_above_tactical_map_and_theater_in_legacy_hud():
    html = (STATIC / "legacy-index.html").read_text(encoding="utf-8")
    css = (STATIC / "training-enhancements.css").read_text(encoding="utf-8")
    assert html.index('id="buildQueue"') < html.index('class="tactical-map"')
    assert ".center-stack>.build-priority-panel,.center-stack>.build-priority-zone{order:20}" in css
    assert ".center-stack>.moment-theater{order:70}" in css
