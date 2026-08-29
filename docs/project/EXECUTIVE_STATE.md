# Executive State

## What This Is

SC2 Master Coach is a local-first Windows improvement application for StarCraft II. Its checked-in product combines offline replay intelligence, one persistent active drill, player-report-driven Guided Execution, deterministic strategic policy, and a bounded Python advisory runtime.

## North Star

A player installs the app, supplies a real replay or explicit battlefield report, understands the evidence and uncertainty behind one useful next decision, and improves without surrendering private game data or relying on a developer.

## Current Reality

Twenty material repository capabilities are `TESTED` locally. Master Intel owns the primary replay-to-practice loop; Guided Execution is the supporting live mode at `/hud`. Replay-observed facts, player-only reports, and bounded later-replay follow-up are explicit. Replay-derived drill persistence requires observed-replay authority, explicit player identity, provisional status, and a calculated correction-specific anchor; follow-up requires a chronologically later opening-compatible replay plus signal-specific observability, uses consistent patch fallbacks, treats missing supply timing as not observed, then persists only a bounded local receipt. Total match duration is descriptive rather than an opening-cohort gate, and recurrence ranking uses a disclosed conservative sample-size-aware lower bound. Guided Execution keeps the selected target primary over its assigned scenario, reports consistency rather than mastery, fails closed on malformed status, requires distinct-session evidence for higher confidence, exposes progression horizons, and advances repeated met reports only to readiness for replay review. Replay metadata is committed as one cross-file integrity generation; corrupt or legacy cases cannot supply coaching and remain visible only as privacy-safe re-import placeholders. Synthetic cases remain tutorial-only. These statements do not promote target-environment or user-outcome proof.

Release-candidate preparation is also locally `TESTED`: replay storage verifies authorized-source digests; the opt-in genuine-replay smoke probe uses production enrichment, requires dense supported 1v1 evidence, validates the persisted case generation, and can claim its bounded proof class only when tied to the exact build artifact or the same clean Git source. Direct desktop dependencies are pinned. The personal installer uses a fixed per-user application directory, guards uninstall, stops on WebView2 bootstrap failure, and adds a non-default replay Open With command rather than replacing the existing association. The Windows workflow binds installer, portable package, and dependency inventory to one exact SHA/run before creating a version-matched draft release. No genuine replay or Windows artifact ran in this reconciliation. `1.14.0` is a worktree candidate identity, not yet a built or verified personal artifact.

## Capability State

- TESTED: 20
- VERIFIED in a target Windows environment: 0
- DEPLOYED with current provider evidence: 0
- USED with customer evidence: 0
- COMMERCIALLY_PROVEN: 0

Highest-value tested capabilities are replay ingestion and persistence, the persistent replay-to-execution loop, durable interrupted-session recovery, truthful degraded-data handling, the evidence-bounded Guided Execution HUD, Strategic OS, and the comparison guard.

## What Is Not Proven

- Clean-Windows install and real-replay completion from a current artifact.
- Real frame capture and microphone behavior on the target machine.
- Expert validity or player-outcome value of strategy benchmarks.
- Current deployment, active usage, retention, measured improvement, or revenue.

## Primary Journey

The executable primary journey is local launch → replay import → persisted case → explicit replay-player selection → player-scoped evidence review → one active drill → focus-constrained Guided Execution handoff → interruption-safe session receipt → later review. It is locally `TESTED`; target-environment, real-replay comprehension, and human acceptance are `UNVERIFIED`.

## Critical Decisions

- Strategic OS remains the only live state authority; Python is advisory.
- Runtime remains local, offline-first, and loopback-only.
- Master Intel owns the improvement loop; Guided Execution is the supporting live mode.
- `.project/state.json` is the machine ledger; human registers are evidence views.
- The evidence graph and dependency register govern proof sequencing and graph references inside the project-state control plane.
- Legacy or corrupt replay metadata is recovery-only until the original replay is re-imported into a verified generation.
- Personal Windows installation is fixed-path, uninstall-guarded, and non-default for replay shell integration.

## Critical Blockers

- P1: no current clean-Windows real-replay acceptance receipt.
- P1: normalized replay fingerprints and replay-to-master calculations are absent.
- P2: strategy benchmarks and coaching outcomes lack expert/player validation.
- P2: deployment, usage, retention, outcome, and revenue evidence are absent.

## Next Proof Event

`PROOF-NEXT-001`: install a current exact-commit Windows artifact on a clean machine, import a real supported replay, persist and review the case, exercise frame/voice behavior or their explicit fallbacks, and obtain a human comprehension record.

## Next Actions

1. Freeze the intentional `1.14.0` candidate commit and create its exact-SHA draft assets.
2. Execute the clean-Windows real-replay journey through active-drill handoff.
3. Record human acceptance and reconcile the evidence.
4. Select the next bounded product slice from what the proof event reveals.

## Commercial / Operational Evidence

Release workflow definitions, dependency pins, and the acceptance proof kit exist. No current provider receipt, clean-install record, consented usage, retention, outcome, or revenue evidence was inspected. Commercial readiness is `UNVERIFIED`.

## Confidence

**MEDIUM.** Repository architecture, source boundaries, and local tests are strong. Confidence stops below `VERIFIED` because the target Windows environment, real users, and external systems were not observed.
