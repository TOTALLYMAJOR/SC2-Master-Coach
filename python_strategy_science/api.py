from __future__ import annotations

from flask import Blueprint, jsonify, request

from .audio import audio_diagnostics
from .errors import ScienceError
from .service import get_runtime


science_api = Blueprint("strategy_science", __name__, url_prefix="/api/science")


def _error_response(exc: ScienceError):
    return jsonify(exc.to_dict()), exc.http_status


@science_api.get("/health")
def science_health():
    try:
        return jsonify(get_runtime().health())
    except ScienceError as exc:
        return _error_response(exc)
    except Exception:
        return jsonify({
            "ok": False,
            "error": {
                "code": "runtime_initialization_failed",
                "message": "Python Strategy Science could not initialize.",
            },
        }), 503


@science_api.get("/capabilities")
def science_capabilities():
    try:
        runtime = get_runtime()
        return jsonify({
            "ok": True,
            "mode": runtime.settings.mode.value,
            "state_authority": "strategic_os",
            "capabilities": runtime.capabilities(),
        })
    except ScienceError as exc:
        return _error_response(exc)


@science_api.get("/models")
def science_models():
    try:
        runtime = get_runtime()
        return jsonify({"ok": True, "models": runtime.models()})
    except ScienceError as exc:
        return _error_response(exc)


@science_api.get("/audio/status")
def science_audio_status():
    """Report native Windows microphone visibility without opening the device."""
    return jsonify(audio_diagnostics())


@science_api.post("/run")
def science_run():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({
            "ok": False,
            "error": {
                "code": "invalid_json",
                "message": "Expected a JSON object request body.",
            },
        }), 400
    try:
        return jsonify(get_runtime().run(payload))
    except ScienceError as exc:
        return _error_response(exc)


@science_api.get("/runs/<run_id>")
def science_get_run(run_id: str):
    try:
        row = get_runtime().get_run(run_id)
    except ScienceError as exc:
        return _error_response(exc)
    if row is None:
        return jsonify({
            "ok": False,
            "error": {
                "code": "run_not_found",
                "message": "Strategy Science run was not found.",
            },
        }), 404
    return jsonify({"ok": True, "run": row})
