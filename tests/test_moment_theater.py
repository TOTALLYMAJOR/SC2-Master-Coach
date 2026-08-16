from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def test_moment_theater_assets_expose_real_frame_modes():
    js = (ROOT / "static" / "moment-theater.js").read_text(encoding="utf-8")
    css = (ROOT / "static" / "moment-theater.css").read_text(encoding="utf-8")
    assert "Player POV" in js
    assert "Observer Truth" in js
    assert "Tactical Map" in js
    assert "/api/replay/capture" in js
    assert "moment-theater-ready" in css


def test_app_version_and_capture_routes_are_present():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert re.search(r'CURRENT_VERSION = "\d+\.\d+\.\d+"', app)
    assert '@app.post("/api/replay/capture")' in app
    assert '@app.get("/api/replay/capture/status")' in app
