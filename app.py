from __future__ import annotations

from pathlib import Path
import json
import os
import tempfile
import threading
import subprocess
import sys
import urllib.request
import webbrowser

from flask import Flask, jsonify, request, send_from_directory

from case_workspace import (
    create_or_update_case,
    resolve_case_frames,
    resolve_case_replay,
)
from observation_service import enrich_demo_analysis, enrich_replay_analysis
from replay_engine import analyze_replay, demo_analysis
from sc2_frame_capture import (
    CaptureRequest,
    CaptureUnavailable,
    capture_replay_views,
    capture_status,
)

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
MAX_REPLAY_BYTES = 40 * 1024 * 1024
CURRENT_VERSION = "1.7.0"
RELEASES_API = "https://api.github.com/repos/TOTALLYMAJOR/SC2-Master-Coach/releases/latest"

app = Flask(__name__, static_folder=str(STATIC), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = MAX_REPLAY_BYTES


@app.get("/")
def index():
    # Keep the full Command HUD available as Advanced Command Center while
    # Team Composer becomes the calmer default experience.
    html = (STATIC / "index.html").read_text(encoding="utf-8")
    for href in (
        "/experience.css",
        "/moment-theater.css",
        "/coach-intelligence.css",
        "/spellbook-lab.css",
        "/pro-mind.css",
        "/team-composer.css",
    ):
        if href not in html:
            html = html.replace("</head>", f'<link rel="stylesheet" href="{href}">\n</head>')
    scripts = (
        "/experience-bridge.js",
        "/replay-identity.js",
        "/strategy-library.js",
        "/experience.js",
        "/moment-theater.js",
        "/coach-intelligence.js",
        "/spellbook-core.js",
        "/spellbook-performance.js",
        "/spellbook-evolution.js",
        "/spellbook-signals.js",
        "/spellbook-sources.js",
        "/spellbook-curriculum.js",
        "/pro-mind-data.js",
        "/pro-mind-stories.js",
        "/pro-mind.js",
        "/team-composer-data.js",
        "/team-composer.js",
    )
    for src in scripts:
        if src not in html:
            html = html.replace("</body>", f'<script src="{src}"></script>\n</body>')
    return html


def _analyze_replay_path(path: str | Path) -> dict:
    replay_path = Path(path).expanduser().resolve()
    result = enrich_replay_analysis(replay_path, analyze_replay(replay_path))
    create_or_update_case(replay_path, result)
    return result


@app.get("/api/health")
def health():
    parser_ok = True
    parser_error = None
    try:
        import sc2reader  # noqa: F401
    except Exception as exc:
        parser_ok = False
        parser_error = str(exc)
    return jsonify({
        "ok": True,
        "parser_ready": parser_ok,
        "parser_error": parser_error,
        "max_replay_mb": MAX_REPLAY_BYTES // (1024 * 1024),
        "version": CURRENT_VERSION,
        "capture": capture_status(),
    })


@app.get("/api/demo")
def demo():
    return jsonify(enrich_demo_analysis(demo_analysis()))


def _version_tuple(value: str):
    value = (value or "").strip().lstrip("vV")
    parts = []
    for chunk in value.split("."):
        digits = "".join(ch for ch in chunk if ch.isdigit())
        parts.append(int(digits or 0))
    return tuple((parts + [0, 0, 0])[:3])


def _latest_release():
    req = urllib.request.Request(RELEASES_API, headers={"User-Agent": f"SC2-Master-Coach/{CURRENT_VERSION}"})
    with urllib.request.urlopen(req, timeout=4) as response:
        return json.loads(response.read().decode("utf-8"))


@app.get("/api/launch-context")
def launch_context():
    path = app.config.get("OPEN_REPLAY_PATH")
    if not path:
        return jsonify({"replay": None})
    replay_path = Path(path)
    if not replay_path.exists() or replay_path.suffix.lower() != ".sc2replay":
        return jsonify({"replay": None, "error": "Associated replay path is unavailable."})
    try:
        result = _analyze_replay_path(replay_path)
        app.config["OPEN_REPLAY_PATH"] = None
        return jsonify({"replay": result})
    except Exception as exc:
        return jsonify({"replay": None, "error": f"{type(exc).__name__}: {exc}"}), 422


@app.get("/api/update/check")
def update_check():
    try:
        release = _latest_release()
        tag = release.get("tag_name") or ""
        available = _version_tuple(tag) > _version_tuple(CURRENT_VERSION)
        setup_asset = next((a for a in release.get("assets", []) if str(a.get("name", "")).lower().endswith("setup.exe")), None)
        return jsonify({
            "current_version": CURRENT_VERSION,
            "latest_version": tag,
            "available": available,
            "release_url": release.get("html_url"),
            "installer_url": setup_asset.get("browser_download_url") if setup_asset else None,
        })
    except Exception as exc:
        return jsonify({"current_version": CURRENT_VERSION, "available": False, "error": str(exc)})


@app.post("/api/update/open")
def update_open():
    try:
        release = _latest_release()
        setup_asset = next((a for a in release.get("assets", []) if str(a.get("name", "")).lower().endswith("setup.exe")), None)
        url = (setup_asset or {}).get("browser_download_url") or release.get("html_url")
        if not url:
            return jsonify({"ok": False, "error": "No release URL available."}), 404
        webbrowser.open(url)
        return jsonify({"ok": True, "url": url})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502


@app.post("/api/replay/analyze-latest")
def replay_analyze_latest():
    roots = [
        Path.home() / "Documents" / "StarCraft II" / "Accounts",
        Path.home() / "OneDrive" / "Documents" / "StarCraft II" / "Accounts",
    ]
    candidates = []
    for root in roots:
        if root.exists():
            candidates.extend(root.glob("**/Replays/**/*.SC2Replay"))
    candidates = [p for p in candidates if p.is_file()]
    if not candidates:
        return jsonify({
            "error": "No local SC2 replay was found automatically.",
            "hint": "Use the Replay drop zone to choose a .SC2Replay file manually."
        }), 404
    latest = max(candidates, key=lambda p: p.stat().st_mtime)
    try:
        return jsonify(_analyze_replay_path(latest))
    except Exception as exc:
        return jsonify({"error": "Latest replay analysis failed.", "detail": f"{type(exc).__name__}: {exc}"}), 422


@app.post("/api/replay/analyze")
def replay_analyze():
    if "replay" not in request.files:
        return jsonify({"error": "Missing multipart field 'replay'."}), 400

    upload = request.files["replay"]
    filename = upload.filename or "upload.SC2Replay"
    if not filename.lower().endswith(".sc2replay"):
        return jsonify({"error": "Expected a .SC2Replay file."}), 400

    try:
        with tempfile.TemporaryDirectory(prefix="sc2-master-coach-") as tmp:
            path = Path(tmp) / Path(filename).name
            upload.save(path)
            if path.stat().st_size > MAX_REPLAY_BYTES:
                return jsonify({"error": "Replay exceeds the 40 MB safety limit."}), 413
            return jsonify(_analyze_replay_path(path))
    except ImportError:
        return jsonify({
            "error": "Replay parser is not installed.",
            "detail": "Install project requirements, then restart the server."
        }), 503
    except Exception as exc:
        return jsonify({
            "error": "Replay analysis failed.",
            "detail": f"{type(exc).__name__}: {exc}",
            "hint": "If this is a brand-new SC2 patch, update sc2reader from its upstream GitHub branch."
        }), 422


@app.get("/api/replay/capture/status")
def replay_capture_status():
    return jsonify(capture_status())


def _frame_urls(case_id: str, capture: dict) -> dict:
    result = dict(capture)
    result["case_id"] = case_id
    result["workspace"] = str(resolve_case_frames(case_id).parent)
    frames = {}
    for key, value in (capture.get("frames") or {}).items():
        if value and value.get("filename"):
            item = dict(value)
            item["url"] = f"/api/cases/{case_id}/frames/{value['filename']}"
            frames[key] = item
        else:
            frames[key] = value
    result["frames"] = frames
    return result


@app.post("/api/replay/capture")
def replay_capture():
    payload = request.get_json(silent=True) or {}
    case_id = str(payload.get("case_id") or "")
    try:
        player_id = int(payload.get("player_id"))
        second = float(payload.get("second"))
    except (TypeError, ValueError):
        return jsonify({"error": "player_id and second are required."}), 400
    if second < 0 or second > 8 * 60 * 60:
        return jsonify({"error": "The requested replay timestamp is invalid."}), 400

    camera = payload.get("camera") or {}
    try:
        camera_x = float(camera["x"]) if camera.get("x") is not None else None
        camera_y = float(camera["y"]) if camera.get("y") is not None else None
    except (TypeError, ValueError):
        return jsonify({"error": "Camera coordinates must be numeric."}), 400

    try:
        replay_path = resolve_case_replay(case_id)
        output_dir = resolve_case_frames(case_id)
        captured = capture_replay_views(CaptureRequest(
            replay_path=replay_path,
            output_dir=output_dir,
            second=second,
            player_id=player_id,
            camera_x=camera_x,
            camera_y=camera_y,
            width=1280,
            height=720,
            moment_key=str(payload.get("moment_key") or f"moment-{second:.1f}"),
        ))
        return jsonify(_frame_urls(case_id, captured))
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except CaptureUnavailable as exc:
        return jsonify({
            "error": "Actual SC2 frame capture is unavailable.",
            "detail": str(exc),
            "fallback": "The in-app tactical reconstruction remains available."
        }), 503
    except Exception as exc:
        detail = f"{type(exc).__name__}: {exc}"
        if "Descriptors cannot be created directly" in detail:
            return jsonify({
                "error": "SC2 protocol runtime compatibility error.",
                "detail": "This installation loaded an unsupported Protobuf runtime. Install SC2 Master Coach v1.3.1 or newer.",
                "fallback": "The Tactical Map remains available until the application is updated."
            }), 503
        return jsonify({"error": "SC2 frame capture failed.", "detail": detail}), 422


@app.get("/api/cases/<case_id>/frames/<path:filename>")
def case_frame(case_id: str, filename: str):
    try:
        directory = resolve_case_frames(case_id)
        return send_from_directory(directory, filename, as_attachment=False, max_age=86400)
    except (FileNotFoundError, ValueError):
        return jsonify({"error": "Frame not found."}), 404


@app.post("/api/cases/<case_id>/open")
def open_case_folder(case_id: str):
    try:
        directory = resolve_case_frames(case_id).parent
        if os.name == "nt":
            os.startfile(str(directory))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(directory)])
        else:
            subprocess.Popen(["xdg-open", str(directory)])
        return jsonify({"ok": True, "workspace": str(directory)})
    except Exception as exc:
        return jsonify({"ok": False, "error": f"{type(exc).__name__}: {exc}"}), 422


def open_browser():
    if os.environ.get("SC2_NO_BROWSER") != "1":
        webbrowser.open("http://127.0.0.1:8765")


if __name__ == "__main__":
    threading.Timer(1.0, open_browser).start()
    app.run(host="127.0.0.1", port=8765, debug=False)
