from __future__ import annotations

from pathlib import Path
import os
import tempfile
import threading
import webbrowser
import json
import urllib.request

from flask import Flask, jsonify, request, send_from_directory

from replay_engine import analyze_replay, demo_analysis
from observation_service import enrich_replay_analysis, enrich_demo_analysis

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
MAX_REPLAY_BYTES = 40 * 1024 * 1024
CURRENT_VERSION = "1.1.0"
RELEASES_API = "https://api.github.com/repos/TOTALLYMAJOR/SC2-Master-Coach/releases/latest"

app = Flask(__name__, static_folder=str(STATIC), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = MAX_REPLAY_BYTES


@app.get("/")
def index():
    return send_from_directory(STATIC, "index.html")


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
    req = urllib.request.Request(RELEASES_API, headers={"User-Agent": "SC2-Master-Coach/1.1"})
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
        result = enrich_replay_analysis(replay_path, analyze_replay(replay_path))
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
        return jsonify(enrich_replay_analysis(latest, analyze_replay(latest)))
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
            result = enrich_replay_analysis(path, analyze_replay(path))
            return jsonify(result)
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


def open_browser():
    if os.environ.get("SC2_NO_BROWSER") != "1":
        webbrowser.open("http://127.0.0.1:8765")


if __name__ == "__main__":
    threading.Timer(1.0, open_browser).start()
    app.run(host="127.0.0.1", port=8765, debug=False)
