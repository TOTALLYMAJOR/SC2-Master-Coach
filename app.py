from __future__ import annotations

from pathlib import Path
import os
import tempfile
import threading
import webbrowser

from flask import Flask, jsonify, request, send_from_directory

from replay_engine import analyze_replay, demo_analysis

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
MAX_REPLAY_BYTES = 40 * 1024 * 1024

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
    })


@app.get("/api/demo")
def demo():
    return jsonify(demo_analysis())


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
            result = analyze_replay(path)
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
