from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Mapping, Sequence


class CapabilityId(str, Enum):
    DIGITAL_TWIN = "digital_twin"
    STRATEGY_DISCOVERY = "strategy_discovery"
    COUNTERFACTUAL_LAB = "counterfactual_lab"
    FRAGILITY_ANALYZER = "fragility_analyzer"
    SCENARIO_ACADEMY = "scenario_academy"
    MISCONCEPTION_DETECTOR = "misconception_detector"
    CURRICULUM_PLANNER = "curriculum_planner"
    PROOF_RECOMMENDATIONS = "proof_recommendations"
    PATCH_MIGRATION = "patch_migration"
    KNOWLEDGE_CONFLICT_AUDIT = "knowledge_conflict_audit"
    STRATEGY_PACK_VALIDATOR = "strategy_pack_validator"
    SYNTHETIC_MATCH_GENERATOR = "synthetic_match_generator"
    FORMAL_INVARIANTS = "formal_invariants"
    TACTICAL_NARRATIVE = "tactical_narrative"
    COGNITIVE_OPTIMIZER = "cognitive_optimizer"


class AdvisoryStatus(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    UNSUPPORTED = "unsupported"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"
    INVALID_INPUT = "invalid_input"
    MODEL_UNAVAILABLE = "model_unavailable"
    PATCH_MISMATCH = "patch_mismatch"


class StateAuthority(str, Enum):
    STRATEGIC_OS = "strategic_os"


class EvidenceKind(str, Enum):
    GAME_RULE = "game_rule"
    PLAYER_REPORT = "player_report"
    REPLAY_FACT = "replay_fact"
    SOURCE_CLAIM = "source_claim"
    INFERENCE = "inference"
    SIMULATION = "simulation"
    HYPOTHESIS = "hypothesis"


class ConfidenceBand(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


@dataclass(frozen=True)
class PatchContext:
    game_patch: str
    ruleset_version: str
    verified_at: str

    def validate(self) -> None:
        if not self.game_patch.strip():
            raise ValueError("game_patch is required")
        if not self.ruleset_version.strip():
            raise ValueError("ruleset_version is required")
        if not self.verified_at.strip():
            raise ValueError("verified_at is required")


@dataclass(frozen=True)
class ModelRef:
    name: str
    version: str
    deterministic: bool
    seed: int | None = None

    def validate(self) -> None:
        if not self.name.strip() or not self.version.strip():
            raise ValueError("model name and version are required")
        if not self.deterministic and self.seed is None:
            raise ValueError("stochastic model runs require an explicit seed")


@dataclass(frozen=True)
class Confidence:
    band: ConfidenceBand
    score: float

    def validate(self) -> None:
        if not 0.0 <= self.score <= 1.0:
            raise ValueError("confidence score must be between 0 and 1")


@dataclass(frozen=True)
class EvidenceRef:
    evidence_id: str
    kind: EvidenceKind
    summary: str
    source_id: str | None = None
    game_second: int | None = None
    confidence: float | None = None

    def validate(self) -> None:
        if not self.evidence_id.strip():
            raise ValueError("evidence_id is required")
        if not self.summary.strip():
            raise ValueError("evidence summary is required")
        if self.confidence is not None and not 0.0 <= self.confidence <= 1.0:
            raise ValueError("evidence confidence must be between 0 and 1")
        if self.kind is EvidenceKind.SOURCE_CLAIM and not self.source_id:
            raise ValueError("source claims require source_id")


@dataclass(frozen=True)
class ProofItem:
    claim: str
    evidence_ids: tuple[str, ...]
    rule_ids: tuple[str, ...] = ()
    limitation: str | None = None

    def validate(self) -> None:
        if not self.claim.strip():
            raise ValueError("proof claim is required")
        if not self.evidence_ids and not self.rule_ids:
            raise ValueError("proof item requires evidence or rule references")


@dataclass(frozen=True)
class Proof:
    items: tuple[ProofItem, ...]
    assumptions: tuple[str, ...] = ()
    uncertainties: tuple[str, ...] = ()
    conflicting_evidence_ids: tuple[str, ...] = ()

    def validate(self) -> None:
        if not self.items:
            raise ValueError("proof must contain at least one item")
        for item in self.items:
            item.validate()


@dataclass(frozen=True)
class FutureWindow:
    label: str
    earliest_second: int
    latest_second: int

    def validate(self) -> None:
        if not self.label.strip():
            raise ValueError("future window label is required")
        if self.earliest_second < 0:
            raise ValueError("future window cannot begin before game start")
        if self.latest_second < self.earliest_second:
            raise ValueError("future window must end after it begins")


@dataclass(frozen=True)
class AdvisoryOutput:
    advisory_id: str
    capability_id: CapabilityId
    status: AdvisoryStatus
    patch: PatchContext
    model: ModelRef
    event_sequence: int
    action: str
    reason: str
    confidence: Confidence
    proof: Proof
    question: str | None = None
    future_windows: tuple[FutureWindow, ...] = ()
    expires_at_game_second: int | None = None
    recommend_silence: bool = False
    state_authority: StateAuthority = StateAuthority.STRATEGIC_OS
    output_mode: str = "advisory"
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def validate(self) -> None:
        if not self.advisory_id.strip():
            raise ValueError("advisory_id is required")
        if self.event_sequence < 0:
            raise ValueError("event_sequence must be non-negative")
        if self.state_authority is not StateAuthority.STRATEGIC_OS:
            raise ValueError("Strategic OS must remain the state authority")
        if self.output_mode != "advisory":
            raise ValueError("Python capability output must be advisory")
        if not self.action.strip() and not self.recommend_silence:
            raise ValueError("action is required unless silence is recommended")
        if not self.reason.strip():
            raise ValueError("reason is required")
        if len(self.future_windows) > 3:
            raise ValueError("live output may contain at most three future windows")
        if self.expires_at_game_second is not None and self.expires_at_game_second < 0:
            raise ValueError("expiration game second must be non-negative")
        self.patch.validate()
        self.model.validate()
        self.confidence.validate()
        self.proof.validate()
        for window in self.future_windows:
            window.validate()

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["capability_id"] = self.capability_id.value
        value["status"] = self.status.value
        value["state_authority"] = self.state_authority.value
        value["confidence"]["band"] = self.confidence.band.value
        return value


@dataclass(frozen=True)
class CapabilityDescriptor:
    capability_id: CapabilityId
    title: str
    phase: int
    priority: str
    dependencies: tuple[CapabilityId, ...]
    feature_flag: str
    patch_sensitive: bool
    live_eligible: bool
    human_review_required: bool
    output_contract: str
    state_authority: StateAuthority
    summary: str
    primary_artifacts: tuple[str, ...]
    performance_budget_ms: int | None = None

    def validate(self) -> None:
        if not self.title.strip() or not self.summary.strip():
            raise ValueError("capability title and summary are required")
        if self.phase < 0:
            raise ValueError("phase must be non-negative")
        if self.priority not in {"P0", "P1", "P2", "P3"}:
            raise ValueError("priority must be P0, P1, P2, or P3")
        if not self.feature_flag.startswith("science."):
            raise ValueError("feature flag must use science.* namespace")
        if self.output_contract != "advisory":
            raise ValueError("all science capabilities use advisory output")
        if self.state_authority is not StateAuthority.STRATEGIC_OS:
            raise ValueError("Strategic OS must remain the state authority")
        if self.live_eligible and self.performance_budget_ms is None:
            raise ValueError("live-eligible capability requires a performance budget")
        if not self.primary_artifacts:
            raise ValueError("capability must declare at least one artifact")


@dataclass(frozen=True)
class AcceptanceCase:
    case_id: str
    capability_id: CapabilityId
    category: str
    title: str
    given: tuple[str, ...]
    when: str
    then: tuple[str, ...]
    evidence_boundary: str
    automation: str
    priority: str

    def validate(self) -> None:
        if self.category not in {"happy_path", "uncertainty", "safety"}:
            raise ValueError("acceptance category is invalid")
        if not self.case_id.strip() or not self.title.strip():
            raise ValueError("acceptance case ID and title are required")
        if not self.given or not self.when.strip() or not self.then:
            raise ValueError("acceptance case requires given/when/then")
        if self.automation not in {"unit", "integration", "property", "contract", "manual"}:
            raise ValueError("unknown automation level")
        if self.priority not in {"P0", "P1", "P2", "P3"}:
            raise ValueError("acceptance priority is invalid")


def immutable_mapping(value: Mapping[str, Any] | None) -> Mapping[str, Any]:
    """Return a shallow immutable-friendly copy for use at contract boundaries."""
    return dict(value or {})


def tuple_of_strings(values: Sequence[str] | None) -> tuple[str, ...]:
    return tuple(str(value) for value in (values or ()))
