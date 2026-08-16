from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_build_priority_assets_exist_and_relocate_the_build_ui():
    js = (ROOT / "static" / "build-priority.js").read_text(encoding="utf-8")
    css = (ROOT / "static" / "build-priority.css").read_text(encoding="utf-8")
    assert "buildPriorityZone" in js
    assert "command.after(zone)" in js
    assert "buildLogVisibility" in js
    assert "keepReplayTheaterOutsideBuildZone" in js
    assert "zone.after(theater)" in js
    assert "position:sticky" in css
    assert "ALWAYS VISIBLE" in js


def test_static_command_hud_loads_build_priority_assets():
    index = (ROOT / "static" / "index.html").read_text(encoding="utf-8")
    assert '<link rel="stylesheet" href="/build-priority.css">' in index
    assert '<script src="/build-priority.js"></script>' in index
    assert index.index('id="buildQueue"') < index.index('class="tactical-map"')
