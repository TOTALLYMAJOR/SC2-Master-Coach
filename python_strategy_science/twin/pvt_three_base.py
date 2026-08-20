from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Mapping
from uuid import uuid4

from ..contracts import (
    AdvisoryOutput,
    AdvisoryStatus,
    CapabilityId,
    Confidence,
    ConfidenceBand,
    EvidenceKind,
    EvidenceRef,
    FutureWindow,
    ModelRef,
    PatchContext,
    Proof,
    ProofItem,
)
from ..errors import ScienceError
from ..invariants import validate_advisory_output


SUPPORTED_PATCH = "5.0.16b"
RULESET_VERSION = "sc2-5.0.16b-pvt-three-base-foundation-1"
MODEL_NAME = "pvt-three-base-digital-twin"
MODEL_VERSION = "0.1.0"


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _race(value: Any) -> str:
    return str(value or "").strip().lower()


def _goal(value: Any) -> str:
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def _intel_type(row: Mapping[str, Any]) -> str:
    return str(row.get("type") or row.get("evidence_type") or row.get("evidenceType") or "").strip()


def _evidence_id(row: Mapping[str, Any], index: int) -> str:
    return str(row.get("evidence_id") or row.get("evidenceId") or f"player-report-{index + 1}")


def _game_second(row: Mapping[str, Any]) -> int | None:
    raw = row.get("observed_game_second", row.get("observedGameSecond"))
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _confidence(row: Mapping[str, Any]) -> float | None:
    raw = row.get("strategic_confidence", row.get("strategicConfidence", row.get("confidence")))
    try:
        if raw is None:
            return None
        return max(0.0, min(1.0, float(raw)))
    except (TypeError, ValueError):
        return None


def evidence_refs(rows: Iterable[Mapping[str, Any]]) -> tuple[EvidenceRef, ...]:
    result: list[EvidenceRef] = []
    for index, row in enumerate(rows):
        kind = _intel_type(row)
        if not kind:
            continue
        result.append(
            EvidenceRef(
                evidence_id=_evidence_id(row, index),
                kind=EvidenceKind.PLAYER_REPORT,
                summary=str(row.get("label") or row.get("summary") or kind.replace("_", " ")),
                source_id="player_report",
                game_second=_game_second(row),
                confidence=_confidence(row),
            )
        )
    return tuple(result)


def _window_rows(policy: Mapping[str, Any], game_second: int) -> tuple[FutureWindow, ...]:
    raw_rows = policy.get("build_windows") or policy.get("buildWindows") or []
    rows: list[FutureWindow] = []
    for raw in raw_rows:
        try:
            start = int(raw.get("earliest_second", raw.get("start", 0)))
            end = int(raw.get("latest_second", raw.get("end", start)))
        except (TypeError, ValueError):
            continue
        if end < game_second:
            continue
        label = str(raw.get("label") or raw.get("action") or "Upcoming operation window").strip()
        if not label:
            continue
        rows.append(FutureWindow(label=label, earliest_second=max(0, start), latest_second=max(start, end)))
    rows.sort(key=lambda item: (item.earliest_second, item.latest_second, item.label))
    return tuple(rows[:3])


def _request_context(request_payload: Mapping[str, Any]) -> tuple[str, str, str, int]:
    mission = dict(request_payload.get("mission") or {})
    parameters = dict(request_payload.get("parameters") or {})
    self_race = mission.get("self_race") or mission.get("selfRace") or mission.get("race")
    enemy_race = mission.get("opponent_race") or mission.get("opponentRace") or mission.get("enemy")
    goal = mission.get("goal") or mission.get("objective") or mission.get("mission")
    try:
        game_second = int(parameters.get("game_second", parameters.get("gameSecond", 0)) or 0)
    except (TypeError, ValueError):
        game_second = 0
    return _race(self_race), _race(enemy_race), _goal(goal), max(0, game_second)


def build_pvt_three_base_advisory(request_payload: Mapping[str, Any]) -> tuple[AdvisoryOutput, tuple[EvidenceRef, ...]]:
    patch = str(request_payload.get("patch") or "").strip()
    ruleset = str(request_payload.get("ruleset_version") or "").strip()
    if patch != SUPPORTED_PATCH:
        raise ScienceError(
            "patch_mismatch",
            f"Digital Twin requires {SUPPORTED_PATCH}; received {patch or 'no patch'}.",
            409,
        )
    if ruleset != RULESET_VERSION:
        raise ScienceError(
            "ruleset_mismatch",
            f"Digital Twin requires ruleset {RULESET_VERSION}; received {ruleset or 'no ruleset'}.",
            409,
        )

    self_race, enemy_race, goal, game_second = _request_context(request_payload)
    if self_race != "protoss" or enemy_race != "terran" or goal not in {
        "three_base_expand",
        "three_base_economy",
        "get_three_bases",
    }:
        raise ScienceError(
            "unsupported_mission",
            "The first Digital Twin slice supports Protoss vs Terran three-base economy only.",
            422,
        )

    intel_rows = tuple(dict(row) for row in (request_payload.get("intel") or []) if isinstance(row, Mapping))
    evidence = evidence_refs(intel_rows)
    evidence_by_type: dict[str, EvidenceRef] = {}
    for raw, ref in zip((row for row in intel_rows if _intel_type(row)), evidence):
        evidence_by_type[_intel_type(raw)] = ref
    active = set(evidence_by_type)

    policy = dict(request_payload.get("policy") or {})
    future_windows = _window_rows(policy, game_second)

    plan_state = "continue"
    permission = "CAUTION"
    question = "Is Terran expanding normally, and what follows the first scouting unit?"
    action = "Keep the three-base route flexible and renew Terran production before the next large commitment."
    reason = "The mission is viable, but the model does not yet have enough player-reported evidence to call the expansion window open."
    proof_items: list[ProofItem] = [
        ProofItem(
            claim="The current model scope is Protoss vs Terran three-base economy on patch 5.0.16b.",
            evidence_ids=(),
            rule_ids=("scope:pvt-three-base", "patch:5.0.16b"),
            limitation="This is a strategic timing twin, not a combat or fog-of-war simulator.",
        )
    ]
    uncertainties = [
        "Exact Terran production uptime, add-ons, army position, and fog-of-war state are unknown unless reported.",
        "Resource projections are not yet part of this foundation model.",
    ]

    def add_evidence_claim(kind: str, claim: str, rule_id: str) -> None:
        ref = evidence_by_type.get(kind)
        if ref:
            proof_items.append(
                ProofItem(
                    claim=claim,
                    evidence_ids=(ref.evidence_id,),
                    rule_ids=(rule_id,),
                )
            )

    if "move_out" in active:
        plan_state = "hold"
        permission = "HOLD"
        question = "Where will the Terran army arrive first, and can your current force meet it before the third?"
        action = "Hold the third. Convert the next spending into immediate units and defensive geometry."
        reason = "A player-reported move-out is direct timing evidence; survival outranks the economic script."
        add_evidence_claim("move_out", "Terran movement has been reported by the player.", "rule:move-out-overrides-greed")
    elif "no_natural" in active:
        plan_state = "abort"
        permission = "HOLD"
        question = "What immediate power is replacing the missing Terran expansion investment?"
        action = "Abort the fast-third implementation and use the defensive two-base bridge."
        reason = "The three-base policy assumed a normal Terran economic floor; that assumption is no longer supported."
        add_evidence_claim("no_natural", "The player reported no Terran natural.", "rule:economic-floor-required")
    elif "extra_production" in active:
        plan_state = "modify"
        permission = "CAUTION"
        question = "Is the additional Terran production moving out or protecting economy?"
        action = "Delay the next economic luxury and add immediate unit throughput while movement is renewed."
        reason = "Higher reported production compresses the time available for the third Nexus to pay back before pressure arrives."
        add_evidence_claim("extra_production", "The player reported increased Terran production.", "rule:production-compresses-payback")
    elif "hidden_tech" in active:
        plan_state = "hold"
        permission = "CAUTION"
        question = "Which missing technology fact could invalidate the next Nexus commitment?"
        action = "Renew the technology read before irreversible spending."
        reason = "An information gap should reduce expansion confidence rather than be interpreted as safety."
        add_evidence_claim("hidden_tech", "The player reported unresolved Terran technology.", "rule:unknown-tech-reduces-confidence")
    elif "fast_third" in active:
        permission = "OPEN"
        question = "How is Terran protecting the wider third-base footprint?"
        action = "Continue the three-base route and pressure exposed territory without donating the mobile screen."
        reason = "A reported Terran third represents future-economic investment, increasing the value of matching economy or taxing exposed map space."
        add_evidence_claim("fast_third", "The player reported a fast Terran third.", "rule:opponent-economy-opens-scaling-window")
    elif "normal_natural" in active:
        permission = "OPEN" if not ({"starport", "factory"} & active) else "CAUTION"
        question = "What follows the Terran natural: production, Factory control, Starport mobility, or another Command Center?"
        action = "Continue the three-base route, but refresh production before the third Nexus becomes irreversible."
        reason = "The Terran natural supports an economic floor, but it does not prove near-term production is harmless."
        add_evidence_claim("normal_natural", "The player confirmed a Terran natural.", "rule:natural-is-floor-not-safety")
    elif "reaper" in active:
        question = "What follows the Reaper: natural, additional Barracks, Factory, or Starport?"
        action = "Preserve the first mobile unit and confirm the Terran follow-up."
        reason = "A Reaper is scouting and pressure evidence, not automatic proof of a rush."
        add_evidence_claim("reaper", "The player reported a Reaper.", "rule:reaper-does-not-imply-all-in")

    confidence_score = 0.42
    if active:
        confidence_score += min(0.28, len(active) * 0.07)
    if {"normal_natural", "no_natural", "fast_third"} & active:
        confidence_score += 0.08
    if {"extra_production", "move_out", "factory", "starport"} & active:
        confidence_score += 0.08
    confidence_score = min(0.92, confidence_score)
    band = (
        ConfidenceBand.HIGH
        if confidence_score >= 0.76
        else ConfidenceBand.MODERATE
        if confidence_score >= 0.50
        else ConfidenceBand.LOW
    )

    output = AdvisoryOutput(
        advisory_id=f"advisory-{uuid4()}",
        capability_id=CapabilityId.DIGITAL_TWIN,
        status=AdvisoryStatus.COMPLETE,
        patch=PatchContext(
            game_patch=SUPPORTED_PATCH,
            ruleset_version=RULESET_VERSION,
            verified_at=_utc_now(),
        ),
        model=ModelRef(
            name=MODEL_NAME,
            version=MODEL_VERSION,
            deterministic=True,
        ),
        event_sequence=int(request_payload.get("event_sequence") or 0),
        question=question,
        action=action,
        reason=reason,
        future_windows=future_windows,
        confidence=Confidence(band=band, score=round(confidence_score, 3)),
        proof=Proof(
            items=tuple(proof_items),
            assumptions=(
                "The player-reported race and mission are correct.",
                "Unreported enemy state remains unknown rather than assumed safe.",
            ),
            uncertainties=tuple(uncertainties),
        ),
        expires_at_game_second=game_second + 45,
        metadata={
            "shadow_mode_safe": True,
            "recommended_plan_state": plan_state,
            "primary_permission": permission,
            "model_scope": "strategic timing and evidence only",
            "not_modeled": ["micro", "combat resolution", "exact fog", "exact resources"],
        },
    )
    validate_advisory_output(output, evidence)
    return output, evidence
