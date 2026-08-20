from __future__ import annotations

from collections import defaultdict, deque
from typing import Iterable

from .contracts import (
    AdvisoryOutput,
    CapabilityDescriptor,
    CapabilityId,
    EvidenceKind,
    EvidenceRef,
    StateAuthority,
)


class ContractViolation(ValueError):
    """Raised when a Strategy Science boundary or invariant is violated."""


def validate_advisory_output(
    output: AdvisoryOutput,
    evidence: Iterable[EvidenceRef] = (),
) -> None:
    """Validate the shared live advisory and evidence-boundary contract."""
    try:
        output.validate()
    except ValueError as exc:
        raise ContractViolation(str(exc)) from exc

    evidence_rows = tuple(evidence)
    evidence_index = {row.evidence_id: row for row in evidence_rows}

    for row in evidence_rows:
        try:
            row.validate()
        except ValueError as exc:
            raise ContractViolation(str(exc)) from exc

    referenced = {
        evidence_id
        for item in output.proof.items
        for evidence_id in item.evidence_ids
    }
    missing = sorted(referenced - set(evidence_index))
    if missing:
        raise ContractViolation(f"proof references unknown evidence IDs: {missing}")

    # The Python runtime may reason from inference/simulation, but those rows
    # cannot masquerade as player-confirmed facts.
    for row in evidence_rows:
        if row.kind in {EvidenceKind.INFERENCE, EvidenceKind.SIMULATION, EvidenceKind.HYPOTHESIS}:
            if row.source_id == "player_confirmed":
                raise ContractViolation(
                    f"{row.kind.value} cannot be labeled player_confirmed"
                )

    if output.status.value == "patch_mismatch" and output.recommend_silence is False:
        raise ContractViolation("patch mismatch must not produce a live action")

    if output.recommend_silence and output.action.strip():
        raise ContractViolation("silence recommendation must not also issue an action")


def validate_capability_registry(
    capabilities: Iterable[CapabilityDescriptor],
) -> None:
    rows = tuple(capabilities)
    if len(rows) != 15:
        raise ContractViolation(f"expected 15 capabilities, found {len(rows)}")

    identifiers = [row.capability_id for row in rows]
    if len(set(identifiers)) != len(identifiers):
        raise ContractViolation("capability IDs must be unique")

    index = {row.capability_id: row for row in rows}
    feature_flags: set[str] = set()

    for row in rows:
        try:
            row.validate()
        except ValueError as exc:
            raise ContractViolation(str(exc)) from exc

        if row.feature_flag in feature_flags:
            raise ContractViolation(f"duplicate feature flag: {row.feature_flag}")
        feature_flags.add(row.feature_flag)

        if row.state_authority is not StateAuthority.STRATEGIC_OS:
            raise ContractViolation("Python capability cannot own canonical state")

        for dependency in row.dependencies:
            if dependency not in index:
                raise ContractViolation(
                    f"{row.capability_id.value} depends on missing {dependency.value}"
                )
            if dependency == row.capability_id:
                raise ContractViolation(
                    f"{row.capability_id.value} cannot depend on itself"
                )

    topological_capability_order(rows)


def topological_capability_order(
    capabilities: Iterable[CapabilityDescriptor],
) -> tuple[CapabilityId, ...]:
    rows = tuple(capabilities)
    index = {row.capability_id: row for row in rows}
    indegree: dict[CapabilityId, int] = {key: 0 for key in index}
    children: dict[CapabilityId, list[CapabilityId]] = defaultdict(list)

    for row in rows:
        for dependency in row.dependencies:
            if dependency not in index:
                raise ContractViolation(
                    f"missing dependency {dependency.value} for {row.capability_id.value}"
                )
            indegree[row.capability_id] += 1
            children[dependency].append(row.capability_id)

    ready = deque(sorted((key for key, degree in indegree.items() if degree == 0), key=lambda x: x.value))
    order: list[CapabilityId] = []

    while ready:
        current = ready.popleft()
        order.append(current)
        for child in sorted(children[current], key=lambda x: x.value):
            indegree[child] -= 1
            if indegree[child] == 0:
                ready.append(child)

    if len(order) != len(rows):
        cyclic = sorted(key.value for key, degree in indegree.items() if degree > 0)
        raise ContractViolation(f"capability dependency cycle detected: {cyclic}")

    return tuple(order)


def validate_patch_sensitive_run(
    capability: CapabilityDescriptor,
    game_patch: str | None,
    ruleset_version: str | None,
) -> None:
    if not capability.patch_sensitive:
        return
    if not game_patch or not game_patch.strip():
        raise ContractViolation(
            f"{capability.capability_id.value} requires game patch context"
        )
    if not ruleset_version or not ruleset_version.strip():
        raise ContractViolation(
            f"{capability.capability_id.value} requires ruleset version"
        )
