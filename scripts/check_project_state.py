#!/usr/bin/env python3
"""Detect mechanical drift in the Canonical Project State ledger."""

from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
import json
from pathlib import Path, PurePosixPath
import re
import sys
from typing import Any, Iterable


ALLOWED_LIFECYCLE_STATES = (
    "IDEA", "SPECIFIED", "DESIGNED", "IMPLEMENTED", "TESTED", "VERIFIED",
    "DEPLOYED", "USED", "COMMERCIALLY_PROVEN", "DEPRECATED", "BLOCKED",
)
STATE_RANK = {
    "IDEA": 0, "SPECIFIED": 1, "DESIGNED": 2, "IMPLEMENTED": 3,
    "TESTED": 4, "VERIFIED": 5, "DEPLOYED": 6, "USED": 7,
    "COMMERCIALLY_PROVEN": 8,
}
EVIDENCE_RANK = {
    "source": 3, "documentation": 2, "workflow": 3, "git": 3,
    "test": 4, "runtime": 5, "deployment": 6, "usage": 7, "commercial": 8,
}
FILE_EVIDENCE_KINDS = {"source", "documentation", "workflow", "test"}
REQUIRED_TOP_LEVEL = (
    "schemaVersion", "project", "goals", "capabilities", "journeys",
    "decisions", "evidenceGraph", "dependencyGraph", "integrations", "risks",
    "blockers", "proofEvents", "commercialEvidence", "nextActions",
)
CANONICAL_FILES = (
    "PROJECT_STATE.md",
    "docs/project/CAPABILITIES.md",
    "docs/project/DECISIONS.md",
    "docs/project/EVIDENCE_GRAPH.md",
    "docs/project/DEPENDENCIES.md",
    "docs/project/EXPLORATIONS.md",
    "docs/project/PROOF.md",
    "docs/project/BLOCKERS.md",
    "docs/project/EXECUTIVE_STATE.md",
)
REFERENCE_PREFIXES = {
    "GOAL": "goals",
    "CAP": "capabilities",
    "JRN": "journeys",
    "DEC": "decisions",
    "INT": "integrations",
    "RSK": "risks",
    "BLK": "blockers",
    "PROOF": "proofEvents",
    "COM": "commercialEvidence",
    "ACT": "nextActions",
}


def _parse_date(value: Any, label: str, errors: list[str]) -> date | None:
    if not isinstance(value, str) or not value:
        errors.append(f"{label} must be an ISO date")
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        errors.append(f"{label} is not an ISO date: {value!r}")
        return None


def _items(value: Any, label: str, errors: list[str]) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        errors.append(f"{label} must be an array")
        return []
    result: list[dict[str, Any]] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            errors.append(f"{label}[{index}] must be an object")
        else:
            result.append(item)
    return result


def _ids(items: Iterable[dict[str, Any]], label: str, errors: list[str]) -> set[str]:
    seen: set[str] = set()
    for index, item in enumerate(items):
        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id:
            errors.append(f"{label}[{index}].id must be a non-empty string")
        elif item_id in seen:
            errors.append(f"duplicate {label} id: {item_id}")
        else:
            seen.add(item_id)
    return seen


def _validate_reference(
    reference: Any,
    label: str,
    reference_sets: dict[str, set[str]],
    errors: list[str],
) -> None:
    if not isinstance(reference, str) or not reference:
        errors.append(f"{label} must be a non-empty registered id")
        return
    prefix = reference.split("-", 1)[0]
    collection = REFERENCE_PREFIXES.get(prefix)
    if collection is None:
        errors.append(f"{label} uses unknown reference prefix: {reference}")
        return
    if reference not in reference_sets.get(collection, set()):
        errors.append(f"{label} references unknown {collection} id: {reference}")


def _validate_graph_edges(
    graph: Any,
    label: str,
    reference_sets: dict[str, set[str]],
    errors: list[str],
) -> None:
    if not isinstance(graph, dict):
        errors.append(f"{label} must be an object")
        return
    status = graph.get("status")
    if status not in {"ACTIVE", "ADVISORY", "DRAFT"}:
        errors.append(f"{label}.status is invalid: {status!r}")
    authority = graph.get("authority")
    if authority is not None:
        _validate_reference(authority, f"{label}.authority", reference_sets, errors)

    edges = _items(graph.get("edges"), f"{label}.edges", errors)
    _ids(edges, f"{label}.edges", errors)
    for index, edge in enumerate(edges):
        edge_label = f"{label}.edges[{index}]"
        for key in ("from", "to", "relationship"):
            if key not in edge:
                errors.append(f"{edge_label}.{key} is required")
        if "from" in edge:
            _validate_reference(edge.get("from"), f"{edge_label}.from", reference_sets, errors)
        if "to" in edge:
            _validate_reference(edge.get("to"), f"{edge_label}.to", reference_sets, errors)
        relationship = edge.get("relationship")
        if not isinstance(relationship, str) or not relationship:
            errors.append(f"{edge_label}.relationship must be a non-empty string")


def _safe_repo_path(root: Path, value: Any, label: str, errors: list[str]) -> Path | None:
    if not isinstance(value, str) or not value:
        errors.append(f"{label}.path must be a non-empty repository-relative path")
        return None
    pure = PurePosixPath(value)
    if pure.is_absolute() or ".." in pure.parts:
        errors.append(f"{label}.path escapes the repository: {value}")
        return None
    path = root.joinpath(*pure.parts)
    if not path.exists():
        errors.append(f"{label} referenced file not found: {value}")
        return None
    return path


def _validate_evidence(
    root: Path,
    evidence: Any,
    label: str,
    today: date,
    max_age_days: int,
    errors: list[str],
) -> int:
    rows = _items(evidence, f"{label}.evidence", errors)
    ceiling = -1
    for index, item in enumerate(rows):
        item_label = f"{label}.evidence[{index}]"
        kind = item.get("kind")
        if kind not in EVIDENCE_RANK:
            errors.append(f"{item_label}.kind is invalid: {kind!r}")
            continue

        confirmed = item.get("outcome") in {"passed", "observed", "confirmed"}
        if kind in FILE_EVIDENCE_KINDS:
            path = _safe_repo_path(root, item.get("path"), item_label, errors)
            symbol = item.get("symbol")
            if kind == "test" and (not isinstance(symbol, str) or not symbol):
                errors.append(f"{item_label}.symbol is required for test evidence")
            if path is not None and isinstance(symbol, str) and symbol:
                if symbol not in path.read_text(encoding="utf-8"):
                    errors.append(f"{item_label} symbol not found: {symbol}")

        if kind == "test" and item.get("outcome") == "passed":
            verified = _parse_date(item.get("verified_at"), f"{item_label}.verified_at", errors)
            if verified is not None and (today - verified).days > max_age_days:
                errors.append(
                    f"{item_label} passing-test evidence is stale: {verified.isoformat()} "
                    f"(limit {max_age_days} days)"
                )

        if confirmed or kind in {"source", "documentation", "workflow", "git"}:
            ceiling = max(ceiling, EVIDENCE_RANK[kind])
    return ceiling


def validate_state(
    root: Path,
    state: Any,
    *,
    today: date | None = None,
    max_age_days: int | None = None,
) -> list[str]:
    """Return deterministic validation errors for a parsed state ledger."""

    root = root.resolve()
    today = today or datetime.now(timezone.utc).date()
    errors: list[str] = []
    if not isinstance(state, dict):
        return ["state ledger root must be an object"]

    for key in REQUIRED_TOP_LEVEL:
        if key not in state:
            errors.append(f"missing top-level key: {key}")

    policy = state.get("verificationPolicy")
    if max_age_days is None:
        max_age_days = 30
        if isinstance(policy, dict):
            configured = policy.get("maxVerificationAgeDays", 30)
            if isinstance(configured, int) and configured > 0:
                max_age_days = configured
            else:
                errors.append("verificationPolicy.maxVerificationAgeDays must be a positive integer")

    for relative in CANONICAL_FILES:
        if not (root / relative).is_file():
            errors.append(f"canonical artifact missing: {relative}")

    project = state.get("project")
    if not isinstance(project, dict):
        errors.append("project must be an object")
    else:
        for key in ("id", "name", "repository", "primaryPurpose", "primaryUser", "stage", "deploymentTarget"):
            if not project.get(key):
                errors.append(f"project.{key} must be present")

    goals = _items(state.get("goals"), "goals", errors)
    capabilities = _items(state.get("capabilities"), "capabilities", errors)
    journeys = _items(state.get("journeys"), "journeys", errors)
    decisions = _items(state.get("decisions"), "decisions", errors)
    integrations = _items(state.get("integrations"), "integrations", errors)
    risks = _items(state.get("risks"), "risks", errors)
    blockers = _items(state.get("blockers"), "blockers", errors)
    proof_events = _items(state.get("proofEvents"), "proofEvents", errors)
    commercial = _items(state.get("commercialEvidence"), "commercialEvidence", errors)
    next_actions = _items(state.get("nextActions"), "nextActions", errors)

    goal_ids = _ids(goals, "goals", errors)
    capability_ids = _ids(capabilities, "capabilities", errors)
    journey_ids = _ids(journeys, "journeys", errors)
    decision_ids = _ids(decisions, "decisions", errors)
    integration_ids = _ids(integrations, "integrations", errors)
    risk_ids = _ids(risks, "risks", errors)
    blocker_ids = _ids(blockers, "blockers", errors)
    proof_event_ids = _ids(proof_events, "proofEvents", errors)
    commercial_ids = _ids(commercial, "commercialEvidence", errors)
    next_action_ids = _ids(next_actions, "nextActions", errors)
    reference_sets = {
        "goals": goal_ids,
        "capabilities": capability_ids,
        "journeys": journey_ids,
        "decisions": decision_ids,
        "integrations": integration_ids,
        "risks": risk_ids,
        "blockers": blocker_ids,
        "proofEvents": proof_event_ids,
        "commercialEvidence": commercial_ids,
        "nextActions": next_action_ids,
    }

    _validate_graph_edges(state.get("evidenceGraph"), "evidenceGraph", reference_sets, errors)
    _validate_graph_edges(state.get("dependencyGraph"), "dependencyGraph", reference_sets, errors)

    if sum(item.get("primary") is True for item in journeys) != 1:
        errors.append("exactly one journey must have primary=true")
    if sum(item.get("status") == "NEXT" for item in proof_events) != 1:
        errors.append("exactly one proof event must have status NEXT")

    capability_path = root / "docs/project/CAPABILITIES.md"
    capability_register = capability_path.read_text(encoding="utf-8") if capability_path.is_file() else ""
    for item in capabilities:
        item_id = item.get("id")
        lifecycle = item.get("lifecycle_state")
        matching_lines = [
            line for line in capability_register.splitlines()
            if isinstance(item_id, str) and item_id in line
        ]
        if isinstance(item_id, str) and not matching_lines:
            errors.append(f"capability register is missing {item_id}")
        elif lifecycle and not any(lifecycle in line for line in matching_lines):
            errors.append(f"capability register state drift for {item_id}: expected {lifecycle}")

    blocker_path = root / "docs/project/BLOCKERS.md"
    blocker_register = blocker_path.read_text(encoding="utf-8") if blocker_path.is_file() else ""
    for blocker_id in blocker_ids:
        if blocker_id not in blocker_register:
            errors.append(f"blocker register is missing {blocker_id}")

    decision_path = root / "docs/project/DECISIONS.md"
    decision_register = decision_path.read_text(encoding="utf-8") if decision_path.is_file() else ""
    for decision in decisions:
        decision_id = decision.get("id")
        if decision_id and decision_id not in decision_register:
            errors.append(f"decision register is missing {decision_id}")

    project_state_path = root / "PROJECT_STATE.md"
    project_state = project_state_path.read_text(encoding="utf-8") if project_state_path.is_file() else ""
    for proof_event in proof_events:
        proof_event_id = proof_event.get("id")
        if proof_event.get("status") == "NEXT" and isinstance(proof_event_id, str) and proof_event_id not in project_state:
            errors.append(f"PROJECT_STATE.md is missing next proof event {proof_event_id}")

    for item in capabilities:
        item_id = item.get("id", "<missing>")
        label = f"capability {item_id}"
        for key in (
            "name", "description", "lifecycle_state", "confidence", "dependencies",
            "blockers", "owner_or_authority", "unresolved_placeholders",
        ):
            if key not in item:
                errors.append(f"{label}.{key} is required")

        lifecycle = item.get("lifecycle_state")
        if lifecycle not in ALLOWED_LIFECYCLE_STATES:
            errors.append(f"{label}.lifecycle_state is invalid: {lifecycle!r}")
            continue

        evidence_ceiling = _validate_evidence(root, item.get("evidence"), label, today, max_age_days, errors)
        if lifecycle in STATE_RANK and STATE_RANK[lifecycle] > evidence_ceiling:
            errors.append(f"{label} claims {lifecycle} above its evidence ceiling ({evidence_ceiling})")

        placeholders = item.get("unresolved_placeholders")
        if not isinstance(placeholders, list):
            errors.append(f"{label}.unresolved_placeholders must be an array")
        elif lifecycle in STATE_RANK and STATE_RANK[lifecycle] >= STATE_RANK["VERIFIED"] and placeholders:
            errors.append(f"{label} cannot be {lifecycle} with unresolved placeholders")

        if lifecycle == "DEPRECATED" and item.get("current") is True:
            errors.append(f"{label} is DEPRECATED but marked current")

        last_verified = item.get("last_verified")
        if lifecycle in STATE_RANK and STATE_RANK[lifecycle] >= STATE_RANK["TESTED"]:
            verified = _parse_date(last_verified, f"{label}.last_verified", errors)
            if verified is not None and (today - verified).days > max_age_days:
                errors.append(
                    f"{label}.last_verified is stale: {verified.isoformat()} "
                    f"(limit {max_age_days} days)"
                )

        for dependency in item.get("dependencies", []):
            if dependency not in capability_ids:
                errors.append(f"{label} references unknown capability dependency: {dependency}")
        for blocker in item.get("blockers", []):
            if blocker not in blocker_ids:
                errors.append(f"{label} references unknown blocker: {blocker}")

    for collection_name, collection in (
        ("journey", journeys), ("decision", decisions), ("integration", integrations),
        ("risk", risks), ("proof event", proof_events),
    ):
        for item in collection:
            if "evidence" in item:
                _validate_evidence(
                    root, item.get("evidence"), f"{collection_name} {item.get('id', '<missing>')}",
                    today, max_age_days, errors,
                )

    for blocker in blockers:
        blocker_id = blocker.get("id", "<missing>")
        label = f"blocker {blocker_id}"
        if blocker.get("priority") not in {"P0", "P1", "P2", "P3", "P4"}:
            errors.append(f"{label}.priority is invalid")
        for ref in blocker.get("affectedGoals", []):
            if ref not in goal_ids:
                errors.append(f"{label} references unknown goal: {ref}")
        for ref in blocker.get("affectedJourneys", []):
            if ref not in journey_ids:
                errors.append(f"{label} references unknown journey: {ref}")
        for ref in blocker.get("affectedCapabilities", []):
            if ref not in capability_ids:
                errors.append(f"{label} references unknown capability: {ref}")
        for dependency in blocker.get("dependencies", []):
            if dependency not in blocker_ids:
                errors.append(f"{label} references unknown blocker dependency: {dependency}")

    for action in next_actions:
        proof_event_id = action.get("proofEventId")
        if proof_event_id not in proof_event_ids:
            errors.append(
                f"next action {action.get('id', '<missing>')} references unknown proof event: {proof_event_id}"
            )

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--state", type=Path, help="State ledger path")
    parser.add_argument("--today", type=date.fromisoformat)
    parser.add_argument("--max-age-days", type=int)
    args = parser.parse_args(argv)

    root = args.root.resolve()
    ledger_path = args.state.resolve() if args.state else root / ".project" / "state.json"
    try:
        state = json.loads(ledger_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"PROJECT STATE DRIFT: ledger not found: {ledger_path}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as exc:
        print(f"PROJECT STATE DRIFT: invalid JSON: {exc}", file=sys.stderr)
        return 1

    errors = validate_state(root, state, today=args.today, max_age_days=args.max_age_days)
    if errors:
        print("PROJECT STATE DRIFT DETECTED", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        "Canonical Project State check passed: "
        f"{len(state['capabilities'])} capabilities, "
        f"{len(state['blockers'])} blockers, 1 NEXT proof event."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
