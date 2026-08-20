from __future__ import annotations

import os
from pathlib import Path

from app import app
from python_strategy_science.audio import audio_diagnostics
from python_strategy_science.feature_flags import ScienceMode, ScienceSettings
from python_strategy_science.service import ScienceRuntime, reset_runtime_for_tests
from python_strategy_science.twin import RULESET_VERSION, SUPPORTED_PATCH


def request_payload(*intel: str) -> dict:
    return {
        "request_id": "test-request",
        "capability_id": "digital_twin",
        "patch": SUPPORTED_PATCH,
        "ruleset_version": RULESET_VERSION,
        "model_version": "0.1.0",
        "session_id": "test-session",
        "event_sequence": 12,
        "mission": {
            "selfRace": "Protoss",
            "opponentRace": "Terran",
            "goal": "three_base_expand",
            "risk": "balanced",
        },
        "policy": {
            "id": "pvt-test",
            "title": "Information-First Triple Nexus",
            "buildWindows": [
                {"start": 180, "end": 230, "action": "Third Nexus", "purpose": "Economic commitment"},
                {"start": 220, "end": 280, "action": "Production", "purpose": "Convert economy"},
            ],
        },
        "intel": [
            {
                "evidence_id": f"evidence-{index}",
                "type": evidence_type,
                "label": evidence_type.replace("_", " "),
                "observed_game_second": 180,
                "strategic_confidence": 1.0,
            }
            for index, evidence_type in enumerate(intel)
        ],
        "parameters": {"game_second": 190},
    }


def test_shadow_runtime_initializes_sqlite_and_never_mutates_canonical_state(tmp_path: Path):
    runtime = ScienceRuntime(
        ScienceSettings(
            mode=ScienceMode.SHADOW,
            discovery_enabled=False,
            database_path=str(tmp_path / "science.db"),
        )
    )
    health = runtime.health()
    assert health["ok"] is True
    assert health["mode"] == "shadow"
    assert health["state_authority"] == "strategic_os"
    assert health["may_influence_live_surface"] is False
    assert health["database"]["ok"] is True

    result = runtime.run(request_payload("normal_natural"))
    assert result["ok"] is True
    assert result["runtime"]["shadow"] is True
    assert result["runtime"]["canonical_state_mutated"] is False
    assert result["advisory"]["metadata"]["primary_permission"] == "OPEN"

    stored = runtime.get_run(result["run_id"])
    assert stored is not None
    assert stored["game_patch"] == SUPPORTED_PATCH


def test_digital_twin_moveout_and_no_natural_are_bounded_safety_branches(tmp_path: Path):
    runtime = ScienceRuntime(
        ScienceSettings(
            mode=ScienceMode.SHADOW,
            discovery_enabled=False,
            database_path=str(tmp_path / "science.db"),
        )
    )

    moveout = runtime.run(request_payload("normal_natural", "move_out"))["advisory"]
    assert moveout["metadata"]["recommended_plan_state"] == "hold"
    assert moveout["metadata"]["primary_permission"] == "HOLD"
    assert "Hold the third" in moveout["action"]

    no_natural = runtime.run(request_payload("no_natural"))["advisory"]
    assert no_natural["metadata"]["recommended_plan_state"] == "abort"
    assert no_natural["metadata"]["primary_permission"] == "HOLD"
    assert "defensive two-base bridge" in no_natural["action"]


def test_native_audio_diagnostics_has_stable_cross_platform_contract():
    row = audio_diagnostics()
    for key in (
        "ok",
        "platform",
        "backend",
        "native_input_supported",
        "device_count",
        "devices",
        "message",
    ):
        assert key in row
    assert isinstance(row["devices"], list)
    assert row["device_count"] == len(row["devices"])
    if os.name == "nt":
        assert row["backend"] == "winmm"
        assert row["native_input_supported"] is True


def test_flask_science_health_audio_and_run_endpoints(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SC2_STRATEGY_SCIENCE_MODE", "shadow")
    monkeypatch.setenv("SC2_STRATEGY_SCIENCE_DB", str(tmp_path / "api-science.db"))
    reset_runtime_for_tests()

    client = app.test_client()

    health = client.get("/api/science/health")
    assert health.status_code == 200
    body = health.get_json()
    assert body["ok"] is True
    assert body["mode"] == "shadow"
    assert body["state_authority"] == "strategic_os"

    audio = client.get("/api/science/audio/status")
    assert audio.status_code == 200
    audio_body = audio.get_json()
    assert "device_count" in audio_body
    assert "devices" in audio_body

    run = client.post("/api/science/run", json=request_payload("extra_production"))
    assert run.status_code == 200
    run_body = run.get_json()
    assert run_body["runtime"]["canonical_state_mutated"] is False
    assert run_body["advisory"]["metadata"]["recommended_plan_state"] == "modify"

    stored = client.get(f"/api/science/runs/{run_body['run_id']}")
    assert stored.status_code == 200
    assert stored.get_json()["ok"] is True

    reset_runtime_for_tests()
