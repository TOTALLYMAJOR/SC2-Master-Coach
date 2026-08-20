# SC2 Master Coach — Python Strategy Science Backlog

**Program code:** PSS  
**Target architecture:** `docs/python-strategy-science-architecture.md`  
**Delivery rule:** Python advises; Strategic OS owns canonical state.  
**Patch baseline:** 5.0.16b  
**Planning horizon:** Foundation through research-grade beta

## 1. Program objective

Build a local Python Strategy Science Runtime that can simulate, validate, discover, explain, test, and teach StarCraft strategy while preserving the Strategic OS live cognitive-load contract:

```text
ONE QUESTION
ONE ACTION
ONE REASON
MAXIMUM THREE UPCOMING WINDOWS
```

## 2. Priority definitions

| Priority | Meaning |
|---|---|
| P0 | Required before any science capability can ship |
| P1 | Core strategic intelligence |
| P2 | Teaching and knowledge governance |
| P3 | Research expansion and optimization |

## 3. Delivery lanes

| Lane | Scope |
|---|---|
| Kernel | Contracts, provenance, model execution, SQLite, API |
| Rules | Patch registry, unit/building/economy/production rules |
| Simulation | Twin, counterfactuals, fragility, synthetic sessions |
| Discovery | Candidate generation and strategy research |
| Learning | Scenarios, misconceptions, curriculum, calibration |
| Knowledge | Sources, conflicts, patch migration, strategy packs |
| Narrative | SVG, timelines, stories, accessible explanations |
| Cognition | Attention metrics and cue optimization |
| Product | Strategic OS adapter, feature flags, diagnostics |
| Quality | Invariants, fixtures, packaging, performance, security |

## 4. Milestones

### M0 — Design pack complete

- architecture;
- schemas;
- capability registry;
- acceptance manifest;
- backlog;
- architecture tests.

### M1 — Python advisory transaction

A Strategic OS snapshot is sent to Python and returns a proof-carrying advisory without mutating canonical state.

### M2 — Digital Twin beta

PvT three-base operation can be validated for prerequisites, resource feasibility, production capacity, and timing ranges.

### M3 — Strategy Laboratory beta

Counterfactual, fragility, synthetic-session, and discovery capabilities operate from the same twin.

### M4 — Teaching Science beta

Generated scenarios, misconception hypotheses, and curriculum plans share concept IDs and evidence.

### M5 — Knowledge Governance beta

Patch migration, source conflicts, and strategy-pack validation are operational.

### M6 — Research-grade local platform

Narrative generation, cognitive optimization, reproducible experiments, packaging, and diagnostics are complete.

# Epic PSS-000 — Shared contracts and authority boundary

**Priority:** P0  
**Milestone:** M0/M1  
**Goal:** Create one versioned contract used by every Python capability.

## Stories

### PSS-001 — Advisory request envelope

Define immutable request fields:

- request ID;
- capability ID;
- patch;
- ruleset version;
- model version;
- session ID;
- event sequence;
- canonical strategic objects;
- parameters;
- seed.

**Acceptance**

- Missing patch fails validation.
- Missing event sequence fails validation.
- Unknown capability fails validation.
- Inputs are never mutated by handlers.

### PSS-002 — Advisory response envelope

Define:

- status;
- state authority;
- output mode;
- question;
- action;
- reason;
- maximum three windows;
- confidence;
- proof;
- uncertainty;
- expiration;
- silence recommendation.

**Acceptance**

- More than three windows is rejected.
- `state_authority != strategic_os` is rejected.
- Live recommendation without proof is rejected.

### PSS-003 — Evidence taxonomy

Implement:

- game rule;
- player report;
- replay fact;
- source claim;
- inference;
- simulation;
- hypothesis.

**Acceptance**

- Inference cannot be serialized as player report.
- Replay facts are postgame-scoped.
- Source claims require source provenance.

### PSS-004 — Capability registry

Register all fifteen capabilities with:

- dependencies;
- phase;
- patch sensitivity;
- live eligibility;
- human-review requirement;
- feature flag;
- output type.

**Acceptance**

- Exactly fifteen unique capability IDs.
- Dependency graph is acyclic.
- Every dependency references an existing capability or foundation service.

### PSS-005 — Model-run identity and reproducibility

Record model name/version, seed, input hash, output hash, and execution duration.

**Acceptance**

- Same deterministic input produces same output hash.
- Stochastic run without seed is rejected.
- Model version is included in every stored run.

# Epic PSS-010 — Local persistence and execution service

**Priority:** P0  
**Milestone:** M1

### PSS-011 — SQLite schema

Create tables documented in the architecture.

**Acceptance**

- Migration is idempotent.
- Foreign keys are enabled.
- Run, proof, source, and model version records can be joined.

### PSS-012 — Repository layer

Implement parameterized access for runs, proofs, candidates, scenarios, mastery, and sources.

**Acceptance**

- No string-interpolated SQL.
- Transaction rollback preserves prior state.
- Corrupt rows produce typed errors.

### PSS-013 — Bounded worker pool

Implement timeouts, cancellation, and concurrency limits.

**Acceptance**

- Live advisory timeout returns structured fallback.
- Cancelled discovery run stops within bounded time.
- One expensive job cannot starve live requests.

### PSS-014 — Flask API blueprint

Expose `/api/science/*` endpoints.

**Acceptance**

- Malformed request returns stable error code.
- Endpoint never returns raw traceback.
- API binds only inside the existing local service.

### PSS-015 — Feature flags and diagnostics

Expose capability status and dependencies.

**Acceptance**

- Disabled capabilities return `model_unavailable`.
- Diagnostics show model/version/patch without exposing sensitive data.
- Stable build defaults experimental capabilities off.

# Epic PSS-020 — Formal StarCraft rule catalog

**Priority:** P0  
**Milestone:** M2

### PSS-021 — Patch registry

Store patch versions and activation dates.

**Acceptance**

- Current rules resolve to 5.0.16b.
- Unknown patch fails closed.
- Rule diffs are queryable.

### PSS-022 — Entity and prerequisite rules

Model units, structures, upgrades, producers, prerequisites, costs, supply, and build times.

**Acceptance**

- A unit cannot be scheduled before prerequisites complete.
- Producer occupancy is represented.
- Rules are patch-versioned.

### PSS-023 — Economy model

Model worker production, worker allocation assumptions, mineral/gas ranges, and expansion payback approximation.

**Acceptance**

- Assumptions are explicit.
- Exact resources are never claimed from manual state alone.
- Range output includes uncertainty.

### PSS-024 — Production capacity model

Model parallel producers and production cycles.

**Acceptance**

- Capacity upper bound respects producer count and completion time.
- Unknown add-ons widen the envelope.
- Output is a range, not an invented exact army.

### PSS-025 — Formal invariants

Implement the first invariant suite.

**Acceptance**

- Every ABORT has fallback.
- Move-out blocks expansion OPEN.
- Stale evidence cannot remain fresh.
- Live advisory contract is enforced.

# Epic PSS-030 — Strategic Digital Twin

**Capability 1**  
**Priority:** P1  
**Milestone:** M2  
**Dependencies:** PSS-000, PSS-010, PSS-020

### PSS-031 — Twin state reducer

Apply canonical events to a Python twin snapshot.

### PSS-032 — Self-state feasibility

Track economy, supply, structures, technology, production, and policy windows.

### PSS-033 — Opponent uncertainty envelope

Track only reported facts plus plausible bounded hypotheses.

### PSS-034 — Incremental update

Update twin from event sequence without full rebuild.

### PSS-035 — PvT three-base vertical slice

Validate Information-First Triple Nexus safe/balanced/greedy routes.

**Epic acceptance**

- Twin result is reproducible.
- It separates rules, reports, inference, and simulation.
- Incremental update meets 100 ms target.
- PvT result returns proof and model limitations.
- No exact enemy unit count is claimed from incomplete evidence.

# Epic PSS-040 — Proof-Carrying Recommendations

**Capability 8**  
**Priority:** P0/P1  
**Milestone:** M1/M2  
**Dependencies:** PSS-000, PSS-020

### PSS-041 — Proof item graph

Reference evidence, rules, assumptions, and conflicts.

### PSS-042 — Expiration and invalidation

Proof indicates when advice becomes stale.

### PSS-043 — Strategic OS acceptance adapter

Reject stale, mismatched, incomplete, or overlong advisories.

### PSS-044 — Human-readable explanation

Render proof into War Room and Command Surface depth levels.

**Epic acceptance**

- Every live advisory has proof.
- Conflicting evidence is visible.
- Patch mismatch prevents promotion.
- Command Surface output remains within cognitive contract.

# Epic PSS-050 — Counterfactual Decision Lab

**Capability 3**  
**Priority:** P1  
**Milestone:** M3  
**Dependencies:** Digital Twin, Proof

### PSS-051 — Decision-point snapshot

Freeze canonical state and alternatives.

### PSS-052 — Alternative evaluator

Compare economy, safety, capabilities, obligations, and windows.

### PSS-053 — Counterfactual uncertainty

Expose assumptions and sensitivity.

### PSS-054 — War Room comparison view

Show trade-offs without claiming certainty.

**Epic acceptance**

- Alternatives share the same starting state.
- Results are labeled simplified-model output.
- New obligations are listed.
- Unsupported alternatives fail with reason.

# Epic PSS-060 — Strategy Fragility Analyzer

**Capability 4**  
**Priority:** P1  
**Milestone:** M3  
**Dependencies:** Digital Twin, Counterfactual

### PSS-061 — Timing perturbation

Shift timings within configured bounds.

### PSS-062 — Assumption perturbation

Remove or weaken assumptions.

### PSS-063 — Unit-loss and scouting perturbation

Model screen loss, delayed scout, and stale information.

### PSS-064 — Critical dependency report

Classify tolerant, sensitive, critical, and invalidating variables.

**Epic acceptance**

- Same seed produces same sensitivity result.
- Critical dependencies are distinguishable from cosmetic delays.
- Result includes tested range and sample count.
- Analysis finishes within interactive budget for MVP.

# Epic PSS-070 — Automated Strategy Discovery

**Capability 2**  
**Priority:** P1/P3  
**Milestone:** M3  
**Dependencies:** Digital Twin, Fragility, Proof

### PSS-071 — Candidate representation

Encode build, policy branches, assumptions, and fallbacks.

### PSS-072 — Mutation operators

Modify workers, gas, expansion, production, units, tech, upgrades, scouts, and branches.

### PSS-073 — Constraint-guided search

Reject illegal candidates early.

### PSS-074 — Multi-objective ranking

Rank robustness, novelty, execution load, information load, and mission fit.

### PSS-075 — Promotion workflow

Experimental → mechanically valid → scenario robust → human approved → recommended.

**Epic acceptance**

- Illegal candidates never reach ranking.
- Novelty is measured against known policies.
- Every candidate has fallback coverage.
- Discovery is cancellable and background-only.
- No candidate enters live library automatically.

# Epic PSS-080 — Synthetic Match Generator

**Capability 12**  
**Priority:** P1  
**Milestone:** M3  
**Dependencies:** Rule catalog, Digital Twin

### PSS-081 — Event-sequence grammar

Generate legal evidence and clock sequences.

### PSS-082 — Expected-state oracle

Store expected permissions and decisions.

### PSS-083 — Contradictory/stale evidence cases

Generate supersession and expiration tests.

### PSS-084 — Seeded fixtures

Persist reproducible sessions.

**Epic acceptance**

- Generated event logs replay deterministically.
- Synthetic sessions are visibly labeled.
- Expected state matches Strategic OS adapter.
- No synthetic row enters personal-performance statistics.

# Epic PSS-090 — Procedural Scenario Academy

**Capability 5**  
**Priority:** P2  
**Milestone:** M4  
**Dependencies:** Synthetic Matches, Policy Graph, Proof

### PSS-091 — Scenario schema and generator

### PSS-092 — Distractor generation

Create tempting but wrong actions.

### PSS-093 — Reasoning rubric

Score action and explanation separately.

### PSS-094 — Difficulty adaptation

Control information completeness, contradiction, and time pressure.

### PSS-095 — Scenario history

Prevent repetitive drills.

**Epic acceptance**

- Every scenario has concept tags.
- At least one answer has a supported rationale.
- Uncertainty is explicit.
- Wrong options have explanations.
- Same seed is reproducible.

# Epic PSS-100 — Misconception Detector

**Capability 6**  
**Priority:** P2  
**Milestone:** M4  
**Dependencies:** Scenario Academy, mastery observations

### PSS-101 — Decision-pattern features

### PSS-102 — Hypothesis library

Examples: economic evidence equals safety; pressure must deal damage; static defense covers map.

### PSS-103 — Competing explanations

### PSS-104 — Corroboration threshold

### PSS-105 — Corrective principle output

**Epic acceptance**

- Output is labeled hypothesis.
- At least one alternative explanation is retained.
- Single error cannot produce high-confidence misconception.
- Corrective principle maps to a concept ID.

# Epic PSS-110 — Adaptive Curriculum Planner

**Capability 7**  
**Priority:** P2  
**Milestone:** M4  
**Dependencies:** Scenario Academy, Misconception Detector

### PSS-111 — Concept prerequisite graph

### PSS-112 — Mastery observation reducer

### PSS-113 — Next-concept selector

### PSS-114 — Bounded practice prescription

### PSS-115 — Graduation and regression rules

**Epic acceptance**

- Planner does not teach a concept before required prerequisites.
- Prescription has finite pass condition.
- Emergency coaching is never replaced by a quiz.
- Curriculum can work without replay data.

# Epic PSS-120 — Patch Migration Compiler

**Capability 9**  
**Priority:** P2  
**Milestone:** M5  
**Dependencies:** Rule catalog, Digital Twin, Knowledge store

### PSS-121 — Patch diff parser

### PSS-122 — Dependency impact graph

### PSS-123 — Policy re-simulation

### PSS-124 — Current/review/stale/invalid classifier

### PSS-125 — Migration report

**Epic acceptance**

- Changed rule identifies dependent policies.
- Unaffected policies remain current.
- Automatic migration never overwrites human-authored rationale silently.
- Live use blocks stale or invalid policy.

# Epic PSS-130 — Knowledge Conflict Auditor

**Capability 10**  
**Priority:** P2  
**Milestone:** M5  
**Dependencies:** Knowledge store, provenance, rule catalog

### PSS-131 — Claim normalization

### PSS-132 — Context extraction

Patch, matchup, risk, player level, map, and assumptions.

### PSS-133 — Contradiction clustering

### PSS-134 — Contextual reconciliation

### PSS-135 — Human review report

**Epic acceptance**

- Contextual difference is not mislabeled contradiction.
- Source dates and patches are visible.
- Unsupported reconciliation remains unresolved.
- No source popularity metric is treated as effectiveness.

# Epic PSS-140 — Strategy Pack Validator

**Capability 11**  
**Priority:** P2  
**Milestone:** M5  
**Dependencies:** Schemas, Rule catalog, Digital Twin, Proof

### PSS-141 — Data-only pack format

### PSS-142 — Schema and security validation

### PSS-143 — Feasibility validation

### PSS-144 — Branch/fallback validation

### PSS-145 — Approval and quarantine workflow

**Epic acceptance**

- Arbitrary executable code is rejected.
- Pack without patch is rejected.
- Every ABORT branch has fallback.
- Invalid pack cannot appear in live library.
- Validation report is actionable.

# Epic PSS-150 — Tactical Narrative and SVG Generator

**Capability 14**  
**Priority:** P2/P3  
**Milestone:** M6  
**Dependencies:** Policy graph, Proof, Scenario schema

### PSS-151 — Narrative depth adapter

War Room, Command Surface, study mode.

### PSS-152 — Tactical storyboard model

### PSS-153 — SVG renderer

### PSS-154 — Timeline and decision-tree renderer

### PSS-155 — Accessibility and sanitation

**Epic acceptance**

- Same policy produces consistent story and diagram.
- SVG contains title and description.
- Output is sanitized.
- Official Blizzard assets are not embedded.
- Live text remains concise.

# Epic PSS-160 — Cognitive-Load Optimizer

**Capability 15**  
**Priority:** P3  
**Milestone:** M6  
**Dependencies:** Interaction metrics, mastery, proof

### PSS-161 — Metrics collection

### PSS-162 — Cue collision analysis

### PSS-163 — Phrase/timing experiment framework

### PSS-164 — Recommendation engine

### PSS-165 — Safety boundary

Emergency thresholds remain human-controlled.

**Epic acceptance**

- Optimizer may recommend silence.
- Personal data remains local.
- Changes require confidence and sample thresholds.
- Emergency cues are never silently suppressed.
- User can reset learned preferences.

# Epic PSS-170 — Formal Rule and Invariant Testing

**Capability 13**  
**Priority:** P0/P1  
**Milestone:** M1–M6  
**Dependencies:** All contracts

### PSS-171 — Property-test event generator

### PSS-172 — Cross-runtime parity suite

Compare JS Strategic OS and Python advisory interpretation.

### PSS-173 — Cognitive-contract invariant

### PSS-174 — Evidence-boundary invariant

### PSS-175 — Packaging and patch invariant

**Epic acceptance**

- Thousands of seeded event sequences run without contradiction.
- JS/Python disagreement creates a failing fixture.
- Inference cannot become reported fact.
- Patch mismatch fails closed.
- Live output never exceeds contract.

# Epic PSS-180 — Knowledge ingestion foundation

**Priority:** P2  
**Milestone:** M5

### PSS-181 — Source acquisition contract

### PSS-182 — Snapshot/checksum storage

### PSS-183 — Claim extraction staging

### PSS-184 — Human approval workflow

### PSS-185 — Source retirement

**Acceptance**

- Ingested material is never live by default.
- Every claim retains source and acquisition metadata.
- Removed source does not erase prior audit history.
- Copyright-sensitive content stores claims and short excerpts, not copied full publications.

# Epic PSS-190 — Production hardening

**Priority:** P0/P1  
**Milestone:** All

### PSS-191 — Windows packaging

### PSS-192 — Model file checksums

### PSS-193 — Startup migration and rollback

### PSS-194 — Performance budgets

### PSS-195 — Local diagnostics

### PSS-196 — Privacy controls

### PSS-197 — Backup/export

**Acceptance**

- Installer works offline after installation.
- Missing optional model does not prevent app startup.
- Migration failure rolls back safely.
- Live deterministic fallback remains available.
- Diagnostics identify capability/model/patch status.

## 5. First six-week implementation plan

### Week 1 — Contracts

- PSS-001 through PSS-005
- PSS-171 cognitive and evidence invariants
- schema validation CI

### Week 2 — Persistence and API

- PSS-011 through PSS-015
- run/proof repository
- `/api/science/health` and `/api/science/run`

### Week 3 — Rule catalog

- PSS-021 through PSS-024
- PvT subset
- production and prerequisite fixtures

### Week 4 — Digital Twin

- PSS-031 through PSS-033
- Information-First Triple Nexus state

### Week 5 — Proof and adapter

- PSS-041 through PSS-044
- Strategic OS acceptance/rejection path

### Week 6 — Vertical acceptance

- PSS-035
- performance test
- Windows packaging
- operator diagnostic
- demo fixture: Reaper → natural → extra production → move-out

## 6. Definition of ready

A story is ready when:

- capability and contract are identified;
- canonical input state is defined;
- evidence boundary is stated;
- patch sensitivity is known;
- acceptance fixtures exist;
- fallback behavior is specified;
- performance budget is assigned.

## 7. Definition of done

A story is done when:

- implementation and tests pass;
- schema is versioned;
- proof/uncertainty is present;
- no canonical-state mutation occurs;
- feature flag exists;
- timeout/cancellation is handled;
- operator diagnostics exist;
- Windows packaging passes;
- documentation is updated;
- cognitive-load contract remains intact.

## 8. Risk register

| Risk | Mitigation |
|---|---|
| Python and JavaScript disagree | Strategic OS authority + parity fixtures |
| Simplified twin creates false confidence | proof, uncertainty, limitations, ranges |
| Discovery generates nonsense | early constraint rejection + human approval |
| Patch makes library stale | patch migration compiler + fail closed |
| Web knowledge pollutes live policies | staging and approval boundary |
| Models slow the live app | strict budgets + deterministic fallback |
| SQLite growth | retention and compaction |
| Strategy packs execute code | data-only format + parser sandbox |
| Cognitive optimizer overfits | sample thresholds + reset + emergency boundary |
| Tests validate docs but not behavior | vertical end-to-end fixtures per milestone |

## 9. Program success metrics

- 100% live advisories include proof and patch.
- 0 canonical-state mutations from Python.
- 0 live outputs exceed one question/action/reason/three windows.
- 95th-percentile live advisory under 150 ms.
- 100% ABORT branches have fallback.
- 100% candidate policies remain experimental until approved.
- 100% synthetic sessions excluded from personal performance.
- Every capability has happy-path, uncertainty, and safety acceptance tests.
