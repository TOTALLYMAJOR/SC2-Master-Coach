from __future__ import annotations

import json
import time
from threading import Lock
from typing import Any, Mapping
from uuid import uuid4

from .capability_registry import CAPABILITIES, get_capability
from .contracts import CapabilityId
from .errors import ScienceError
from .feature_flags import ScienceMode, ScienceSettings, load_settings
from .rules import estimate_policy_commitments
from .storage import ScienceRepository, database_health
from .twin import (
    MODEL_NAME,
    MODEL_VERSION,
    RULESET_VERSION,
    SUPPORTED_PATCH,
    build_pvt_three_base_advisory,
    estimate_pvt_attack_hazard,
)


RUNTIME_VERSION = "0.1.0"


class ScienceRuntime:
    """Dependency-light local Strategy Science execution service.

    The runtime is advisory only. It never mutates the Strategic OS canonical
    state and defaults to Shadow Mode while the v1.11 runtime is calibrated.
    """

    def __init__(self, settings: ScienceSettings | None = None) -> None:
        self.settings = settings or load_settings()
        self.repository = ScienceRepository(self.settings.database_path)
        self.repository.register_model(
            model_name=MODEL_NAME,
            model_version=MODEL_VERSION,
            capability_id=CapabilityId.DIGITAL_TWIN.value,
            deterministic=True,
        )

    def health(self) -> dict[str, Any]:
        db = database_health(self.repository.database_path)
        capability_states = {}
        for descriptor in CAPABILITIES:
            if descriptor.capability_id is CapabilityId.DIGITAL_TWIN:
                state = "ready" if self.settings.enabled else "disabled"
            elif descriptor.capability_id in {
                CapabilityId.PROOF_RECOMMENDATIONS,
                CapabilityId.FORMAL_INVARIANTS,
            }:
                state = "foundation_ready"
            elif descriptor.capability_id is CapabilityId.STRATEGY_DISCOVERY:
                state = "experimental_not_implemented"
            else:
                state = "design_only"
            capability_states[descriptor.capability_id.value] = state
        return {
            "ok": bool(db.get("ok")),
            "runtime_version": RUNTIME_VERSION,
            "mode": self.settings.mode.value,
            "enabled": self.settings.enabled,
            "may_influence_live_surface": self.settings.may_influence_live_surface,
            "state_authority": "strategic_os",
            "patch": SUPPORTED_PATCH,
            "ruleset_version": RULESET_VERSION,
            "database": db,
            "capabilities": capability_states,
        }

    def capabilities(self) -> list[dict[str, Any]]:
        return [
            {
                "id": descriptor.capability_id.value,
                "title": descriptor.title,
                "phase": descriptor.phase,
                "priority": descriptor.priority,
                "feature_flag": descriptor.feature_flag,
                "patch_sensitive": descriptor.patch_sensitive,
                "live_eligible": descriptor.live_eligible,
                "human_review_required": descriptor.human_review_required,
                "summary": descriptor.summary,
                "performance_budget_ms": descriptor.performance_budget_ms,
                "implemented": descriptor.capability_id
                in {
                    CapabilityId.DIGITAL_TWIN,
                    CapabilityId.PROOF_RECOMMENDATIONS,
                    CapabilityId.FORMAL_INVARIANTS,
                },
            }
            for descriptor in CAPABILITIES
        ]

    def models(self) -> list[dict[str, Any]]:
        return [
            {
                "name": MODEL_NAME,
                "version": MODEL_VERSION,
                "capability_id": CapabilityId.DIGITAL_TWIN.value,
                "patch": SUPPORTED_PATCH,
                "ruleset_version": RULESET_VERSION,
                "deterministic": True,
                "scope": "Protoss vs Terran three-base strategic timing, evidence, opportunity-cost commitments, and qualitative near-term attack hazard",
                "mode": self.settings.mode.value,
            }
        ]

    def run(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        if not self.settings.enabled:
            raise ScienceError(
                "runtime_disabled",
                "Python Strategy Science is disabled. Set SC2_STRATEGY_SCIENCE_MODE=shadow to enable the development runtime.",
                503,
            )

        immutable_payload = json.loads(json.dumps(dict(payload)))
        capability_raw = str(immutable_payload.get("capability_id") or "").strip()
        try:
            capability_id = CapabilityId(capability_raw)
        except ValueError as exc:
            raise ScienceError("unknown_capability", f"Unknown science capability: {capability_raw or 'missing' }.", 400) from exc

        descriptor = get_capability(capability_id)
        if capability_id is not CapabilityId.DIGITAL_TWIN:
            raise ScienceError(
                "model_unavailable",
                f"{descriptor.title} is registered but not implemented in v1.13.0.",
                501,
            )

        patch = str(immutable_payload.get("patch") or "").strip()
        ruleset = str(immutable_payload.get("ruleset_version") or "").strip()
        if not patch or not ruleset:
            raise ScienceError(
                "missing_patch_context",
                "Science requests require both patch and ruleset_version.",
                400,
            )

        try:
            event_sequence = int(immutable_payload.get("event_sequence"))
        except (TypeError, ValueError) as exc:
            raise ScienceError("invalid_event_sequence", "event_sequence must be a non-negative integer.", 400) from exc
        if event_sequence < 0:
            raise ScienceError("invalid_event_sequence", "event_sequence must be a non-negative integer.", 400)

        request_id = str(immutable_payload.get("request_id") or f"request-{uuid4()}")
        run_id = f"run-{uuid4()}"
        self.repository.start_run(
            run_id=run_id,
            request_id=request_id,
            capability_id=capability_id.value,
            game_patch=patch,
            ruleset_version=ruleset,
            model_name=MODEL_NAME,
            model_version=MODEL_VERSION,
            session_id=str(immutable_payload.get("session_id") or "") or None,
            event_sequence=event_sequence,
            seed=immutable_payload.get("seed"),
            request_payload=immutable_payload,
        )

        started = time.perf_counter()
        try:
            advisory, _evidence = build_pvt_three_base_advisory(immutable_payload)
            duration_ms = max(0, round((time.perf_counter() - started) * 1000))
            advisory_dict = advisory.to_dict()
            parameters = dict(immutable_payload.get("parameters") or {})
            try:
                game_second = max(0, int(parameters.get("game_second", parameters.get("gameSecond", 0)) or 0))
            except (TypeError, ValueError):
                game_second = 0

            policy = dict(immutable_payload.get("policy") or {})
            intel = tuple(
                dict(row)
                for row in (immutable_payload.get("intel") or [])
                if isinstance(row, Mapping)
            )
            commitment_window = estimate_policy_commitments(
                policy,
                game_second=game_second,
                horizon_seconds=75,
            )
            threat_hazard = estimate_pvt_attack_hazard(
                intel,
                game_second=game_second,
            )
            metadata = dict(advisory_dict.get("metadata") or {})
            metadata["commitment_window"] = commitment_window
            metadata["threat_hazard"] = threat_hazard
            advisory_dict["metadata"] = metadata

            self.repository.complete_run(
                run_id=run_id,
                advisory=advisory_dict,
                duration_ms=duration_ms,
                proof_items=[
                    {
                        "claim": item.claim,
                        "evidence_ids": list(item.evidence_ids),
                        "rule_ids": list(item.rule_ids),
                        "limitation": item.limitation,
                    }
                    for item in advisory.proof.items
                ],
            )
            return {
                "ok": True,
                "run_id": run_id,
                "runtime": {
                    "version": RUNTIME_VERSION,
                    "mode": self.settings.mode.value,
                    "shadow": self.settings.mode is ScienceMode.SHADOW,
                    "canonical_state_mutated": False,
                },
                "advisory": advisory_dict,
            }
        except ScienceError as exc:
            self.repository.fail_run(
                run_id=run_id,
                status="failed",
                error_code=exc.code,
                warning=exc.message,
            )
            raise
        except Exception as exc:
            self.repository.fail_run(
                run_id=run_id,
                status="failed",
                error_code="runtime_error",
                warning=str(exc),
            )
            raise ScienceError("runtime_error", "Strategy Science model execution failed.", 500) from exc

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        return self.repository.get_run(run_id)


_RUNTIME: ScienceRuntime | None = None
_RUNTIME_LOCK = Lock()


def get_runtime() -> ScienceRuntime:
    global _RUNTIME
    if _RUNTIME is None:
        with _RUNTIME_LOCK:
            if _RUNTIME is None:
                _RUNTIME = ScienceRuntime()
    return _RUNTIME


def reset_runtime_for_tests() -> None:
    global _RUNTIME
    with _RUNTIME_LOCK:
        _RUNTIME = None
