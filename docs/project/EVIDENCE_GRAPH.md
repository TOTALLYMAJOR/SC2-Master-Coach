# Evidence Graph

Authority: [`.project/state.json`](../../.project/state.json). This graph
explains how repository evidence supports SC2 Master Coach claims. It does not
promote a capability, proof event, release, usage, outcome, or commercial claim
without the required source evidence.

## Purpose

The evidence graph prevents a common failure mode: one artifact proves a narrow
fact and then gets reused as proof for a broader claim. Every edge below names
what the evidence supports and what it cannot prove.

## Node Types

| Type | Meaning |
| --- | --- |
| `source` | Current repository code or workflow definition. |
| `test` | Executed local validation, bounded by its command, date, and environment. |
| `documentation` | Accepted or advisory project documentation. |
| `capability` | A registered capability in `.project/state.json`. |
| `journey` | A user journey registered in `.project/state.json`. |
| `decision` | A recorded decision in `docs/project/DECISIONS.md`. |
| `proof_event` | A bounded event that can prove a target-environment or outcome claim. |
| `blocker` | Missing evidence or decision that prevents stronger claims. |

## Current Evidence Spine

```text
app.py route source
  -> CAP-001 Master Intel shell
  -> JRN-001 Local replay to persistent guided improvement loop

case_workspace.py + replay_engine.py
  -> CAP-002 replay ingestion and local case workspace
  -> ReplayCaseManifest evidence
  -> JRN-001

replay_intelligence.py
  -> CAP-004 normalized hard data
  -> CAP-015 decision-context reconstruction
  -> CAP-016 longitudinal learning fingerprints

Master Intel active-drill contract + Practice + Guided Execution handoff
  -> CAP-018 persistent replay-to-execution improvement loop
  -> JRN-001

Guided Execution session snapshot + recovery + receipt contract
  -> CAP-019 durable Guided Execution session continuity
  -> JRN-002

Master Intel resource-state + support/recovery contract
  -> CAP-020 truthful degraded-data handling
  -> JRN-001

Strategic OS static runtime
  -> CAP-005 Guided Execution HUD
  -> CAP-007 Strategic OS decision kernel
  -> JRN-002 Manual battlefield report to live coaching decision

python_strategy_science service and contracts
  -> CAP-010 Python shadow Digital Twin
  -> DEC-001 advisory-only authority

Windows workflow and installer definitions
  -> CAP-013 Windows release definition
  -> PROOF-NEXT-001 prerequisite evidence only
```

## Claim Boundaries

| Evidence | Supports | Does not prove |
| --- | --- | --- |
| Source file exists | Implementation evidence for its bounded behavior | Tests, clean Windows operation, user acceptance, release, or revenue |
| Passing local test | `TESTED` lifecycle for the named behavior | Target Windows runtime, real device behavior, deployment, use, or commercial proof |
| Replay parser output | Observed replay facts exposed by the parser | Player intent, exact fog-of-war knowledge, strategic safety, or master-level comparison |
| Derived replay metric | A calculation from labeled inputs | Causality unless the required source facts exist |
| Case manifest | Content-addressed local replay identity | Trusted player identity, clean Windows operation, or player improvement |
| Learning index | Local compatible-case comparison input | Broad cohort truth, win-rate causality, or expert-validated coaching |
| Strategic OS decision | Current manual-report-driven live coaching state | Direct game-process observation or completed player action |
| Local session receipt | The plan, elapsed local clock, and player-reported evidence saved by the UI | Gameplay execution, correctness, improvement, or coaching effectiveness |
| Sanitized support report | Bounded local readiness and count diagnostics without paths or player/replay identity | Clean-Windows behavior, successful recovery, or support usefulness |
| Python Strategy Science advisory | Local model output with proof and uncertainty | Live state mutation or authoritative coaching policy |
| Workflow definition | Release machinery exists in source | Current artifact, installer success, provider receipt, or user availability |
| Clean Windows proof event | Target journey observation when executed | Retention, measured improvement, or revenue unless separately recorded |

## Current Graph Edges

| Edge | Relationship | Source | Target | Current strength |
| --- | --- | --- | --- | --- |
| EG-001 | implements | `app.py:index` | CAP-001 | source |
| EG-002 | validates | `test_master_intel_is_default_and_legacy_hud_remains_explicit` | CAP-001 | local test |
| EG-003 | implements | `case_workspace.py:create_or_update_case` | CAP-002 | source |
| EG-004 | validates | replay persistence tests | CAP-002 | local test |
| EG-005 | feeds | CAP-002 | CAP-004 | repository dependency |
| EG-006 | implements | `replay_intelligence.py:build_player_hard_data` | CAP-004 | source |
| EG-007 | withholds unsupported claims | CAP-004 | BLK-002 | explicit blocker |
| EG-008 | implements | `replay_intelligence.py:attach_decision_context` | CAP-015 | source |
| EG-009 | constrains hindsight claims | DEC-006 | CAP-015 | active decision |
| EG-010 | implements | `replay_intelligence.py:build_case_learning_summary` | CAP-016 | source |
| EG-011 | constrains cohort claims | DEC-007 | CAP-016 | active decision |
| EG-012 | implements | `static/strategic-os-kernel.js:snapshot` | CAP-007 | source |
| EG-013 | governs live authority | DEC-001 | CAP-007 | active decision |
| EG-014 | constrains advisory output | DEC-001 | CAP-010 | active decision |
| EG-015 | preserves privacy/runtime boundary | DEC-002 | CAP-014 | active decision |
| EG-016 | requires target proof | BLK-001 | PROOF-NEXT-001 | blocking dependency |
| EG-018 | governs evidence and dependency graph controls | DEC-008 | CAP-017 | active decision |
| EG-019 | validates graph controls | `test_checker_validates_evidence_and_dependency_graphs` | CAP-017 | local test |
| EG-020 | governs product hierarchy | DEC-003 | CAP-018 | active decision |
| EG-021 | implements provenance-gated, fail-closed active-drill persistence | `normalizeDrill` + `setActiveDrill` + Practice/HUD routes | CAP-018 | source |
| EG-022 | validates cross-mode handoff | active-drill and HUD handoff tests | CAP-018 | local test |
| EG-023 | preserves live authority | DEC-001 | CAP-018 | active decision |
| EG-024 | implements interrupted-session recovery | `executionSnapshot` + `restoreExecution` | CAP-019 | source |
| EG-025 | preserves live authority | DEC-001 | CAP-019 | active decision |
| EG-026 | implements truthful local recovery | resource-state shell + support endpoints | CAP-020 | source |
| EG-027 | preserves offline privacy boundary | DEC-002 | CAP-020 | active decision |
| EG-028 | supplies correction-specific replay evidence | CAP-016 | CAP-018 | tested capability dependency |
| EG-029 | supplies required focus-report and separated progression contract | CAP-006 | CAP-018 | tested capability dependency |
| EG-030 | governs exact-SHA candidate identity and immutable promotion | DEC-009 | CAP-013 | active decision |
| EG-031 | governs case-integrity boundary | DEC-010 | CAP-002 | active decision |
| EG-032 | governs visible re-import recovery | DEC-010 | CAP-020 | active decision |
| EG-033 | governs fixed-path personal installer safety | DEC-011 | CAP-013 | active decision |
| EG-034 | governs patched legacy protocol compatibility | DEC-012 | CAP-012 | active decision |
| EG-035 | governs patched protobuf dependency pin | DEC-012 | CAP-013 | active decision |
| EG-036 | governs private personal-artifact acceptance path | DEC-013 | CAP-013 | active decision |

## Use Rules

- A graph edge proves only the named relationship.
- A source edge cannot substitute for a validation edge.
- A local-test edge cannot substitute for clean-Windows, human-acceptance, usage,
  outcome, or commercial proof.
- A blocker edge does not mean the capability failed; it means required evidence
  or authority is missing.
- A dependency edge does not inherit status. A dependent capability must carry
  its own evidence.
- Advisory outputs may cite evidence nodes, but they do not become evidence
  nodes for stronger claims until reviewed and recorded.

## Promotion Gate

Before a claim moves beyond `TESTED`, the graph must contain evidence at the
same strength as the claim:

```text
target Windows behavior -> clean-machine observation
release availability -> exact artifact and provider receipt
usage -> consented usage evidence
improvement -> defined baseline and measured outcome
commercial proof -> transaction plus outcome evidence
```

Missing graph evidence is `UNVERIFIED`, not complete and not failed.
