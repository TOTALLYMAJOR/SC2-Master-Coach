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
    assert "Critical Moment Snapshots" in script
    assert "Save PNG" in script
    assert "not game-rendered video frames" in script
