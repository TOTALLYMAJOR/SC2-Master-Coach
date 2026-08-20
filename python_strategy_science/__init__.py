"""Python Strategy Science design contracts for SC2 Master Coach.

This package is intentionally dependency-light.  The first design slice exposes
shared contracts, capability metadata, and invariants without taking ownership
of the Strategic OS canonical state.
"""

from .capability_registry import CAPABILITIES, get_capability
from .contracts import (
    AcceptanceCase,
    AdvisoryOutput,
    AdvisoryStatus,
    CapabilityDescriptor,
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
    StateAuthority,
)
from .invariants import (
    ContractViolation,
    topological_capability_order,
    validate_advisory_output,
    validate_capability_registry,
)

__all__ = [
    "AcceptanceCase",
    "AdvisoryOutput",
    "AdvisoryStatus",
    "CAPABILITIES",
    "CapabilityDescriptor",
    "CapabilityId",
    "Confidence",
    "ConfidenceBand",
    "ContractViolation",
    "EvidenceKind",
    "EvidenceRef",
    "FutureWindow",
    "ModelRef",
    "PatchContext",
    "Proof",
    "ProofItem",
    "StateAuthority",
    "get_capability",
    "topological_capability_order",
    "validate_advisory_output",
    "validate_capability_registry",
]
