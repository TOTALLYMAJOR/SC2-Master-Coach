from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_build_priority_assets_exist_and_relocate_the_build_ui():
    js = (ROOT / "static" / "build-priority.js").read_text(encoding="utf-8")
    css = (ROOT / "static" / "build-priority.css").read_text(encoding="utf-8")
    assert "buildPriorityZone" in js
    assert "command.after(zone)" in js
    assert "buildLogVisibility" in js
    assert "position:sticky" in css
    assert "ALWAYS VISIBLE" in js


def test_app_loads_build_priority_assets():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert '"/build-priority.css"' in app
    assert '"/build-priority.js"' in app
