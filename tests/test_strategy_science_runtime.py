from __future__ import annotations

from pathlib import Path

import pytest

from app import app
from python_strategy_science.errors import ScienceError
from python_strategy_science.feature_flags import ScienceMode, ScienceSettings
from python_strategy_science.service import ScienceRuntime, reset_runtime_for_tests
from python_strategy_science.storage import database_health
from python_strategy_science.twin import MODEL_VERSION, RULESET_VERSION


def _payload(intel=None, *, patch="5.0.16b", event_sequence=12):
    return {
        "request_id": "request-test",
        "capability_id": "digital_twin",
        "patch": patch,
        "ruleset_version": RULESET_VERSION,
        "model_version": MODEL_VERSION,
        "session_id": "session-test",
        "event_sequence": event_sequence,
        "mission": {
            "selfRace": "Protoss",
            "opponentRace": "Terran",
            "goal": "three_base_expand",
        },
        "policy": {
            "title": "Information-First Triple Nexus",
            "buildWindows": [
                {"start": 150, "end": 205, "action": "Renew Terran production"},
                {"start": 195, "end": 235, "action": "Third Nexus decision"},
                {"start": 220, "end": 280, "action": "Reinforcement access + production"},
                {"start": 300, "end": 350, "action": "Fourth future window"},
            ],
        },
        "intel": list(intel or []),
        "permissions": [],
        "obligations": [],
        "decision": {},
        "parameters": {"gameSecond": 180},
    }


def _intel(kind, evidence_id=None):
    return {
        "evidenceId": evidence_id or f"evidence-{kind}",
        "type": kind,
        "label": kind.replace("_", " "),
        "observedGameSecond": 175,
        "strategicConfidence": 1.0,
    }


def _runtime(tmp_path: Path) -> ScienceRuntime:
    return ScienceRuntime(
        ScienceSettings(
            mode=ScienceMode.SHADOW,
            discovery_enabled=False,
            database_path=str(tmp_path / "science.db"),
        )
    )


def test_sqlite_runtime_initializes_and_reports_health(tmp_path):
    runtime = _runtime(tmp_path)
    health = runtime.health()
    assert health["ok"] is True
    assert health["mode"] == "shadow"
    assert health["state_authority"] == "strategic_os"
    assert health["database"]["schema_version"] == 1
    assert health["database"]["table_count"] >= 20
    assert health["capabilities"]["digital_twin"] == "ready"


def test_digital_twin_returns_shadow_advisory_without_mutating_canonical_state(tmp_path):
    runtime = _runtime(tmp_path)
    result = runtime.run(_payload([_intel("normal_natural")]))
    assert result["ok"] is True
    assert result["runtime"]["shadow"] is True
    assert result["runtime"]["canonical_state_mutated"] is False
    advisory = result["advisory"]
    assert advisory["state_authority"] == "strategic_os"
    assert advisory["capability_id"] == "digital_twin"
    assert advisory["patch"]["game_patch"] == "5.0.16b"
    assert advisory["metadata"]["model_scope"] == "strategic timing and evidence only"
    assert advisory["metadata"]["primary_permission"] == "OPEN"
    assert len(advisory["future_windows"]) <= 3
    assert "natural" in advisory["reason"].lower()


def test_move_out_forces_hold_recommendation(tmp_path):
    result = _runtime(tmp_path).run(_payload([_intel("normal_natural"), _intel("move_out")]))
    advisory = result["advisory"]
    assert advisory["metadata"]["recommended_plan_state"] == "hold"
    assert advisory["metadata"]["primary_permission"] == "HOLD"
    assert "Hold the third" in advisory["action"]
    proof = advisory["proof"]["items"]
    assert any("movement" in item["claim"].lower() for item in proof)


def test_no_natural_recommends_abort_bridge(tmp_path):
    result = _runtime(tmp_path).run(_payload([_intel("no_natural")]))
    advisory = result["advisory"]
    assert advisory["metadata"]["recommended_plan_state"] == "abort"
    assert advisory["metadata"]["primary_permission"] == "HOLD"
    assert "defensive two-base bridge" in advisory["action"]


def test_extra_production_modifies_but_preserves_mission(tmp_path):
    result = _runtime(tmp_path).run(_payload([_intel("normal_natural"), _intel("extra_production")]))
    advisory = result["advisory"]
    assert advisory["metadata"]["recommended_plan_state"] == "modify"
    assert advisory["metadata"]["primary_permission"] == "CAUTION"
    assert "Delay" in advisory["action"]
    assert "mission" in advisory["reason"].lower() or "third Nexus" in advisory["reason"]


def test_reaper_does_not_become_automatic_all_in(tmp_path):
    result = _runtime(tmp_path).run(_payload([_intel("reaper")]))
    advisory = result["advisory"]
    assert advisory["metadata"]["recommended_plan_state"] == "continue"
    assert "not automatic proof of a rush" in advisory["reason"]


def test_patch_mismatch_fails_closed(tmp_path):
    runtime = _runtime(tmp_path)
    with pytest.raises(ScienceError) as exc:
        runtime.run(_payload([], patch="5.0.15"))
    assert exc.value.code == "patch_mismatch"
    assert exc.value.http_status == 409


def test_unsupported_mission_fails_without_inventing_advice(tmp_path):
    runtime = _runtime(tmp_path)
    payload = _payload([])
    payload["mission"]["selfRace"] = "Zerg"
    with pytest.raises(ScienceError) as exc:
        runtime.run(payload)
    assert exc.value.code == "unsupported_mission"


def test_completed_run_is_persisted_with_request_and_advisory(tmp_path):
    runtime = _runtime(tmp_path)
    result = runtime.run(_payload([_intel("normal_natural")]))
    stored = runtime.get_run(result["run_id"])
    assert stored is not None
    assert stored["status"] == "complete"
    assert stored["request"]["event_sequence"] == 12
    assert stored["advisory"]["state_authority"] == "strategic_os"
    assert stored["output_hash"]


def test_flask_science_health_and_run_endpoints(monkeypatch, tmp_path):
    monkeypatch.setenv("SC2_STRATEGY_SCIENCE_MODE", "shadow")
    monkeypatch.setenv("SC2_STRATEGY_SCIENCE_DB", str(tmp_path / "api-science.db"))
    reset_runtime_for_tests()
    client = app.test_client()

    health = client.get("/api/science/health")
    assert health.status_code == 200
    health_json = health.get_json()
    assert health_json["enabled"] is True
    assert health_json["mode"] == "shadow"

    response = client.post("/api/science/run", json=_payload([_intel("extra_production")]))
    assert response.status_code == 200
    body = response.get_json()
    assert body["runtime"]["shadow"] is True
    assert body["advisory"]["metadata"]["primary_permission"] == "CAUTION"

    run = client.get(f"/api/science/runs/{body['run_id']}")
    assert run.status_code == 200
    assert run.get_json()["run"]["status"] == "complete"
    reset_runtime_for_tests()


def test_science_health_source_is_enabled_in_v111_release():
    root = Path(__file__).resolve().parents[1]
    app_source = (root / "app.py").read_text(encoding="utf-8")
    assert 'CURRENT_VERSION = "1.11.1"' in app_source
    assert "app.register_blueprint(science_api)" in app_source
