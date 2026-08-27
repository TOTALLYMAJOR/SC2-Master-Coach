from __future__ import annotations

from copy import deepcopy
from datetime import date
from pathlib import Path

from scripts.check_project_state import validate_state


TODAY = date(2026, 8, 25)


def _write_canonical_files(root: Path) -> None:
    contents = {
        "PROJECT_STATE.md": "PROOF-001\n",
        "docs/project/CAPABILITIES.md": "| CAP-001 Example | outcome | TESTED |\n",
        "docs/project/DECISIONS.md": "DEC-001\n",
        "docs/project/EVIDENCE_GRAPH.md": "EG-001\n",
        "docs/project/DEPENDENCIES.md": "DEP-001\n",
        "docs/project/EXPLORATIONS.md": "canonical\n",
        "docs/project/PROOF.md": "canonical\n",
        "docs/project/BLOCKERS.md": "BLK-001\n",
        "docs/project/EXECUTIVE_STATE.md": "canonical\n",
    }
    for relative, content in contents.items():
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def _valid_state(root: Path) -> dict:
    _write_canonical_files(root)
    (root / "feature.py").write_text("def implemented_feature():\n    return True\n", encoding="utf-8")
    tests = root / "tests" / "test_feature.py"
    tests.parent.mkdir(parents=True, exist_ok=True)
    tests.write_text("def test_implemented_feature():\n    assert True\n", encoding="utf-8")
    return {
        "schemaVersion": "1.0",
        "verificationPolicy": {"maxVerificationAgeDays": 30},
        "project": {
            "id": "example", "name": "Example", "repository": "example",
            "primaryPurpose": "Exercise validation", "primaryUser": "Maintainer",
            "stage": "development", "deploymentTarget": "local",
        },
        "goals": [{"id": "GOAL-001", "name": "Prove it"}],
        "capabilities": [{
            "id": "CAP-001", "name": "Example capability",
            "description": "A tested example.", "lifecycle_state": "TESTED",
            "confidence": "HIGH",
            "evidence": [
                {"kind": "source", "path": "feature.py", "symbol": "implemented_feature"},
                {"kind": "test", "path": "tests/test_feature.py",
                 "symbol": "test_implemented_feature", "outcome": "passed",
                 "verified_at": "2026-08-25"},
            ],
            "dependencies": [], "blockers": ["BLK-001"],
            "last_verified": "2026-08-25", "owner_or_authority": "maintainer",
            "unresolved_placeholders": [], "current": True,
        }],
        "journeys": [{"id": "JRN-001", "name": "Example", "primary": True}],
        "decisions": [{"id": "DEC-001", "name": "Example"}],
        "evidenceGraph": {
            "status": "ACTIVE",
            "authority": "DEC-001",
            "edges": [{
                "id": "EG-001",
                "from": "CAP-001",
                "to": "JRN-001",
                "relationship": "supports",
            }],
        },
        "dependencyGraph": {
            "status": "ACTIVE",
            "authority": "DEC-001",
            "edges": [{
                "id": "DEP-001",
                "from": "CAP-001",
                "to": "PROOF-001",
                "relationship": "gates",
            }],
        },
        "integrations": [{"id": "INT-001", "name": "Local"}],
        "risks": [{"id": "RSK-001", "name": "Example"}],
        "blockers": [{
            "id": "BLK-001", "priority": "P2", "affectedGoals": ["GOAL-001"],
            "affectedJourneys": ["JRN-001"], "affectedCapabilities": ["CAP-001"],
            "dependencies": [],
        }],
        "proofEvents": [{"id": "PROOF-001", "name": "Next", "status": "NEXT"}],
        "commercialEvidence": [{"id": "COM-001", "name": "Unknown"}],
        "nextActions": [{"id": "ACT-001", "proofEventId": "PROOF-001"}],
    }


def test_valid_state_ledger_passes(tmp_path: Path):
    assert validate_state(tmp_path, _valid_state(tmp_path), today=TODAY) == []


def test_checker_detects_missing_files_tests_staleness_and_duplicate_ids(tmp_path: Path):
    state = _valid_state(tmp_path)
    state["capabilities"].append(deepcopy(state["capabilities"][0]))
    state["capabilities"][0]["evidence"][0]["path"] = "missing.py"
    state["capabilities"][0]["evidence"][1]["symbol"] = "test_no_longer_exists"
    state["capabilities"][0]["evidence"][1]["verified_at"] = "2026-01-01"
    errors = validate_state(tmp_path, state, today=TODAY)
    assert any("duplicate capabilities id: CAP-001" in error for error in errors)
    assert any("referenced file not found: missing.py" in error for error in errors)
    assert any("symbol not found: test_no_longer_exists" in error for error in errors)
    assert any("passing-test evidence is stale" in error for error in errors)


def test_checker_detects_reference_and_next_proof_event_drift(tmp_path: Path):
    state = _valid_state(tmp_path)
    state["capabilities"][0]["blockers"] = ["BLK-MISSING"]
    state["blockers"][0]["affectedGoals"] = ["GOAL-MISSING"]
    state["nextActions"][0]["proofEventId"] = "PROOF-MISSING"
    state["proofEvents"].append({"id": "PROOF-002", "name": "Also next", "status": "NEXT"})
    errors = validate_state(tmp_path, state, today=TODAY)
    assert any("unknown blocker: BLK-MISSING" in error for error in errors)
    assert any("unknown goal: GOAL-MISSING" in error for error in errors)
    assert any("unknown proof event: PROOF-MISSING" in error for error in errors)
    assert "exactly one proof event must have status NEXT" in errors


def test_checker_detects_lifecycle_contradictions(tmp_path: Path):
    state = _valid_state(tmp_path)
    capability = state["capabilities"][0]
    capability["lifecycle_state"] = "VERIFIED"
    capability["unresolved_placeholders"] = ["A known placeholder"]
    errors = validate_state(tmp_path, state, today=TODAY)
    assert any("claims VERIFIED above its evidence ceiling" in error for error in errors)
    assert any("cannot be VERIFIED with unresolved placeholders" in error for error in errors)


def test_checker_detects_human_register_drift(tmp_path: Path):
    state = _valid_state(tmp_path)
    (tmp_path / "docs/project/CAPABILITIES.md").write_text(
        "| CAP-001 Example | outcome | IMPLEMENTED |\n", encoding="utf-8"
    )

    errors = validate_state(tmp_path, state, today=TODAY)

    assert "capability register state drift for CAP-001: expected TESTED" in errors


def test_checker_rejects_deprecated_capability_marked_current(tmp_path: Path):
    state = _valid_state(tmp_path)
    capability = state["capabilities"][0]
    capability["lifecycle_state"] = "DEPRECATED"
    capability["last_verified"] = None
    errors = validate_state(tmp_path, state, today=TODAY)
    assert "capability CAP-001 is DEPRECATED but marked current" in errors


def test_checker_validates_evidence_and_dependency_graphs(tmp_path: Path):
    state = _valid_state(tmp_path)
    state["evidenceGraph"]["edges"][0]["to"] = "CAP-MISSING"
    state["dependencyGraph"]["authority"] = "DEC-MISSING"
    state["dependencyGraph"]["edges"][0]["from"] = "UNKNOWN-001"

    errors = validate_state(tmp_path, state, today=TODAY)

    assert any("evidenceGraph.edges[0].to references unknown capabilities id: CAP-MISSING" in error for error in errors)
    assert any("dependencyGraph.authority references unknown decisions id: DEC-MISSING" in error for error in errors)
    assert any("dependencyGraph.edges[0].from uses unknown reference prefix: UNKNOWN-001" in error for error in errors)
