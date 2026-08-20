from __future__ import annotations

import json
import sqlite3
from collections import Counter
from pathlib import Path

import pytest

from python_strategy_science import (
    AdvisoryOutput,
    AdvisoryStatus,
    CAPABILITIES,
    CapabilityId,
    Confidence,
    ConfidenceBand,
    ContractViolation,
    EvidenceKind,
    EvidenceRef,
    FutureWindow,
    ModelRef,
    PatchContext,
    Proof,
    ProofItem,
    StateAuthority,
    topological_capability_order,
    validate_advisory_output,
    validate_capability_registry,
)
from python_strategy_science.invariants import validate_patch_sensitive_run


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "python_strategy_science"
SCHEMAS = PACKAGE / "schemas"


EXPECTED_CAPABILITIES = {
    "digital_twin",
    "strategy_discovery",
    "counterfactual_lab",
    "fragility_analyzer",
    "scenario_academy",
    "misconception_detector",
    "curriculum_planner",
    "proof_recommendations",
    "patch_migration",
    "knowledge_conflict_audit",
    "strategy_pack_validator",
    "synthetic_match_generator",
    "formal_invariants",
    "tactical_narrative",
    "cognitive_optimizer",
}


def _valid_output(*, windows: tuple[FutureWindow, ...] = ()) -> AdvisoryOutput:
    return AdvisoryOutput(
        advisory_id="advisory-1",
        capability_id=CapabilityId.DIGITAL_TWIN,
        status=AdvisoryStatus.COMPLETE,
        patch=PatchContext(
            game_patch="5.0.16b",
            ruleset_version="rules-test",
            verified_at="2026-08-19T00:00:00Z",
        ),
        model=ModelRef(
            name="test-model",
            version="0.1.0",
            deterministic=True,
        ),
        event_sequence=12,
        question="Is Terran moving out?",
        action="Delay the third until movement is renewed.",
        reason="The attack window overlaps defensive readiness.",
        future_windows=windows,
        confidence=Confidence(ConfidenceBand.MODERATE, 0.65),
        proof=Proof(
            items=(
                ProofItem(
                    claim="Movement information is unresolved.",
                    evidence_ids=("evidence-1",),
                    rule_ids=("rule-expansion-permission",),
                ),
            ),
            uncertainties=("Exact Terran production uptime is unknown.",),
        ),
    )


def test_registry_contains_all_fifteen_capabilities_and_is_acyclic():
    validate_capability_registry(CAPABILITIES)
    assert {row.capability_id.value for row in CAPABILITIES} == EXPECTED_CAPABILITIES
    order = topological_capability_order(CAPABILITIES)
    assert len(order) == 15
    assert len(set(order)) == 15


def test_every_capability_preserves_strategic_os_authority_and_advisory_output():
    for descriptor in CAPABILITIES:
        assert descriptor.state_authority is StateAuthority.STRATEGIC_OS
        assert descriptor.output_contract == "advisory"
        assert descriptor.feature_flag == f"science.{descriptor.capability_id.value}"
        assert descriptor.primary_artifacts


def test_live_eligible_capabilities_have_hard_budgets():
    live = [row for row in CAPABILITIES if row.live_eligible]
    assert live
    for descriptor in live:
        assert descriptor.performance_budget_ms is not None
        assert descriptor.performance_budget_ms <= 150


def test_patch_sensitive_capabilities_fail_without_patch_context():
    for descriptor in CAPABILITIES:
        if descriptor.patch_sensitive:
            with pytest.raises(ContractViolation):
                validate_patch_sensitive_run(descriptor, None, "rules")
            with pytest.raises(ContractViolation):
                validate_patch_sensitive_run(descriptor, "5.0.16b", None)


def test_advisory_contract_enforces_one_action_reason_and_three_windows():
    windows = tuple(
        FutureWindow(label=f"Window {index}", earliest_second=index * 10, latest_second=index * 10 + 5)
        for index in range(4)
    )
    with pytest.raises(ContractViolation, match="three future windows"):
        validate_advisory_output(
            _valid_output(windows=windows),
            evidence=(
                EvidenceRef(
                    evidence_id="evidence-1",
                    kind=EvidenceKind.PLAYER_REPORT,
                    summary="Player has not reported movement.",
                ),
            ),
        )


def test_advisory_proof_must_reference_known_evidence():
    with pytest.raises(ContractViolation, match="unknown evidence"):
        validate_advisory_output(_valid_output(), evidence=())


def test_inference_cannot_masquerade_as_player_confirmed_fact():
    with pytest.raises(ContractViolation, match="cannot be labeled player_confirmed"):
        validate_advisory_output(
            _valid_output(),
            evidence=(
                EvidenceRef(
                    evidence_id="evidence-1",
                    kind=EvidenceKind.SIMULATION,
                    source_id="player_confirmed",
                    summary="Simulated attack timing.",
                ),
            ),
        )


def test_stochastic_models_require_explicit_seed():
    output = _valid_output()
    invalid = AdvisoryOutput(
        **{
            **output.__dict__,
            "model": ModelRef(
                name="stochastic-model",
                version="0.1.0",
                deterministic=False,
                seed=None,
            ),
        }
    )
    with pytest.raises(ContractViolation, match="explicit seed"):
        validate_advisory_output(
            invalid,
            evidence=(
                EvidenceRef(
                    evidence_id="evidence-1",
                    kind=EvidenceKind.PLAYER_REPORT,
                    summary="Movement remains unknown.",
                ),
            ),
        )


def test_combined_json_schema_is_parseable_versioned_and_complete():
    path = SCHEMAS / "strategy-science.schema.json"
    schema = json.loads(path.read_text(encoding="utf-8"))
    assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
    assert schema["$id"].startswith("https://mbmapps.local/")
    assert schema["title"] == "SC2 Master Coach Python Strategy Science Contracts"

    expected_defs = {
        "advisory_request",
        "advisory_output",
        "proof",
        "digital_twin_state",
        "candidate_policy",
        "counterfactual_result",
        "fragility_result",
        "scenario",
        "misconception_hypothesis",
        "curriculum_assignment",
        "patch_migration_report",
        "knowledge_conflict_report",
        "strategy_pack",
        "synthetic_session",
        "invariant_report",
        "narrative_bundle",
        "cognitive_recommendation",
        "acceptance_case",
    }
    assert set(schema["$defs"]) == expected_defs
    assert len(schema["oneOf"]) == len(expected_defs)


def test_strategy_pack_schema_is_data_only():
    schema = json.loads((SCHEMAS / "strategy-science.schema.json").read_text(encoding="utf-8"))
    pack = schema["$defs"]["strategy_pack"]
    assert pack["properties"]["executable_code"]["const"] is False
    assert "patch" in pack["required"]
    assert "sources" in pack["required"]
    assert "policies" in pack["required"]


def test_acceptance_manifest_covers_happy_uncertainty_and_safety_for_every_capability():
    manifest = json.loads((PACKAGE / "acceptance_manifest.json").read_text(encoding="utf-8"))
    assert manifest["state_authority"] == "strategic_os"
    assert manifest["live_contract"] == {
        "max_questions": 1,
        "max_actions": 1,
        "max_reasons": 1,
        "max_future_windows": 3,
        "permanent_live_panels": 0,
    }

    cases = manifest["cases"]
    assert len(cases) == 45
    counts = Counter(case["capability_id"] for case in cases)
    assert set(counts) == EXPECTED_CAPABILITIES
    assert set(counts.values()) == {3}

    categories = {
        capability: {case["category"] for case in cases if case["capability_id"] == capability}
        for capability in EXPECTED_CAPABILITIES
    }
    assert all(value == {"happy_path", "uncertainty", "safety"} for value in categories.values())
    assert len({case["case_id"] for case in cases}) == len(cases)


def test_architecture_and_backlog_name_all_capabilities_and_boundaries():
    architecture = (ROOT / "docs" / "python-strategy-science-architecture.md").read_text(encoding="utf-8")
    backlog = (ROOT / "docs" / "python-strategy-science-backlog.md").read_text(encoding="utf-8")
    adr = (ROOT / "docs" / "adr" / "ADR-002-python-strategy-science-runtime-boundary.md").read_text(encoding="utf-8")

    for descriptor in CAPABILITIES:
        assert descriptor.title in architecture
        assert descriptor.title in backlog

    for phrase in (
        "Python must not independently mutate live Mission, Policy, Intel, Permission, Obligation, or Decision state.",
        "ONE QUESTION",
        "MAXIMUM THREE UPCOMING WINDOWS",
        "Every run records",
        "Offline-first",
    ):
        assert phrase in architecture

    assert "Strategic OS event log and canonical JavaScript state remain authoritative." in adr
    assert "Python never owns or directly mutates" in adr


def test_backlog_contains_foundation_vertical_slice_and_definition_of_done():
    backlog = (ROOT / "docs" / "python-strategy-science-backlog.md").read_text(encoding="utf-8")
    for story_id in (
        "PSS-001",
        "PSS-011",
        "PSS-021",
        "PSS-031",
        "PSS-041",
        "PSS-171",
        "PSS-197",
    ):
        assert story_id in backlog
    assert "Definition of ready" in backlog
    assert "Definition of done" in backlog
    assert "First six-week implementation plan" in backlog


def test_sqlite_schema_builds_cleanly_and_has_required_tables():
    schema_sql = (PACKAGE / "storage" / "schema.sql").read_text(encoding="utf-8")
    connection = sqlite3.connect(":memory:")
    try:
        connection.executescript(schema_sql)
        table_names = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        required = {
            "science_model_versions",
            "science_runs",
            "science_proof_items",
            "twin_snapshots",
            "candidate_policies",
            "counterfactual_results",
            "fragility_results",
            "generated_scenarios",
            "misconception_hypotheses",
            "curriculum_assignments",
            "knowledge_sources",
            "knowledge_claims",
            "knowledge_conflicts",
            "patch_migrations",
            "strategy_packs",
            "synthetic_sessions",
            "cognitive_metrics",
            "cognitive_experiments",
        }
        assert required <= table_names
        assert connection.execute("PRAGMA user_version").fetchone()[0] == 1
    finally:
        connection.close()
