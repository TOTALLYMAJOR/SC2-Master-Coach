# Decision Ledger

This register adopts existing decisions; it does not rewrite history. `DEC-003` is explicitly unresolved because current implementation and product framing disagree.

## DEC-001 — Strategic OS owns live state

- Date: 2026-08-19
- Context: Python simulation and research capabilities could create a competing live authority.
- Decision: Strategic OS event log and canonical browser state own Mission, Policy, Intel, Permission, Obligation, and Decision. Python receives immutable snapshots and returns advisory output.
- Alternatives Considered: immediate Python replacement; Python browser-state callbacks; one permanent panel per model; the chosen advisory boundary.
- Why Chosen: preserves deterministic replay, cognitive-load limits, local fallback, and one state authority.
- Authority: MBMapps; accepted `docs/adr/ADR-002-python-strategy-science-runtime-boundary.md`.
- Affected Components: Strategic OS, `/api/science/*`, `ScienceRuntime`, Python Shadow adapter.
- Evidence: ADR-002; architecture authority tests; non-mutation runtime tests.
- Reversible?: yes, but only through a superseding architecture decision and migration proof.
- Supersedes: no recorded predecessor.
- Status: ACTIVE
- Revisit Trigger: a proposed runtime needs to mutate live state, a dedicated worker changes the authority boundary, or deterministic fallback cannot be preserved.

## DEC-002 — Runtime is offline-first and loopback-only

- Date: 2026-08-22
- Context: replay, voice, player-reference, and update behavior can expose private local data or create hidden operational dependencies.
- Decision: bind Flask to loopback, keep browser connections self-only, disable automatic update calls, store evidence locally, and make optional network features explicit.
- Alternatives Considered: cloud-first service; background update/provider calls; browser-direct external integrations; the chosen local-first boundary.
- Why Chosen: privacy, zero-cost operation, predictable latency, offline use, and explicit evidence authority.
- Authority: executable configuration and Master Intel implementation record; product owner confirmation is implicit rather than separately recorded.
- Affected Components: `app.py`, desktop shell, Master Intel data paths, CSP, update endpoints, voice runtime.
- Evidence: `app.py:apply_offline_security_headers`; `test_offline_boundary_disables_background_update_and_external_connections`.
- Reversible?: yes, through an explicit opt-in integration decision with privacy and fallback controls.
- Supersedes: older automatic-update behavior retained only as manual compatibility endpoints.
- Status: ACTIVE
- Revisit Trigger: any feature requires an external runtime service, background network traffic, cloud storage, or provider credentials.

## DEC-003 — Master Intel is the executable default

- Date: 2026-08-22 implementation; reconciled 2026-08-25
- Context: Master Intel Milestone 0 changed `/` to the offline replay-intelligence shell and preserved the Combat HUD at `/hud`; current README framing still centers the Combat HUD.
- Decision: current executable behavior treats Master Intel as primary and the Combat HUD as a supporting journey. This records implementation truth, not final product-owner intent.
- Alternatives Considered: Combat HUD remains default; Master Intel becomes default; a neutral chooser becomes default.
- Why Chosen: no explicit current authority resolves the product-positioning conflict, so the running route is recorded without rewriting the conflicting claim.
- Authority: current Flask route and tests. Product-owner authority is REQUIRED to make this stable product policy.
- Affected Components: `/`, `/hud`, onboarding, README, release narrative, next proof event.
- Evidence: `app.py:index`; `app.py:legacy_hud`; `docs/master-intel-milestone-0.md`; Master Intel route test.
- Reversible?: yes.
- Supersedes: older default-HUD behavior in executable routing, but not yet the product thesis.
- Status: IMPLEMENTED_WITH_DOCUMENTATION_DRIFT
- Revisit Trigger: immediate product-owner confirmation or any release-positioning change.

## DEC-004 — One machine ledger, multiple evidence views

- Date: 2026-08-25
- Context: the repository had architecture and milestone documents but no single reconciled lifecycle, proof, blocker, or next-event authority.
- Decision: `.project/state.json` is the machine ledger; `PROJECT_STATE.md` and `docs/project/*` are bounded human views. A stdlib checker enforces mechanical consistency while humans retain semantic promotion authority.
- Alternatives Considered: one free-form status document; infer state entirely from code; a centralized external portfolio database; the chosen federated repository ledger.
- Why Chosen: traceability, offline operation, reviewable diffs, explicit uncertainty, and no external source-of-truth dependency.
- Authority: user-directed Canonical Project State mission.
- Affected Components: repository governance, completion reports, CI, project-state documents.
- Evidence: `scripts/check_project_state.py`; `tests/test_project_state_control.py`; `.project/state.json`.
- Reversible?: yes, only if a replacement preserves lifecycle semantics, evidence references, and repository-local availability.
- Supersedes: ad hoc reconstruction from README, old milestone notes, and chat memory.
- Status: ACTIVE
- Revisit Trigger: schema cannot represent a material state, false positives block normal work, or a portfolio contract requires stable interoperability metadata.

## DEC-005 — Replay metrics preserve evidence boundaries

- Date: 2026-08-26
- Context: periodic replay stats can support useful duration metrics, but interpolation, supply-cause classification, production utilization, intent, and master comparison do not share the same evidentiary strength.
- Decision: normalize parser facts once; label replay facts, derived metrics, and withheld claims separately. Encode second-resolution worker continuity as compact stepwise segments. Calculate production utilization only when explicit producer identity and cycle start/end facts exist. Never present a local anomaly as master-reference divergence.
- Alternatives Considered: infer missing queues from resource spending; label every parser-adjacent value observed; wait for the complete master-comparison system; the chosen incremental evidence contract.
- Why Chosen: delivers useful local analysis without fabricating intermediate events, production causality, player intent, or reference authority.
- Authority: replay parser output and the normalized hard-data contract.
- Affected Components: `replay_intelligence.py`, `replay_engine.py`, local case analysis, Master Intel replay route.
- Evidence: `test_hard_data_normalizes_once_and_exposes_bounded_metrics`; `test_production_utilization_requires_explicit_cycles_and_calculates_idle_time`.
- Reversible?: yes, through a versioned contract migration that preserves stored-case readability and evidence semantics.
- Supersedes: no recorded predecessor.
- Status: ACTIVE
- Revisit Trigger: the parser exposes reliable production-order lifecycle facts, compatible reference packs become available, or a metric cannot preserve its fact-to-derivation lineage.

## DEC-006 — Outcomes do not retroactively grade decisions

- Date: 2026-08-26
- Context: replay outcomes are visible with hindsight, while the player acted from incomplete information. Treating every failed result as an unreasonable decision would fabricate knowledge and causality.
- Decision: store the reconstructed information state, outcome window, and reasonableness judgment separately. Expansion reviews grade scouting-evidence coverage only; strategic safety remains withheld until an applicable matchup policy and adequate information evidence exist.
- Alternatives Considered: grade decisions from outcome alone; infer exact private knowledge; issue a single blended score; the chosen separation.
- Why Chosen: prevents hindsight bias while retaining useful evidence about what was plausibly observable and what followed.
- Authority: observation-model evidence boundary and normalized decision-context contract.
- Affected Components: `replay_intelligence.py`, `observation_service.py`, Master Intel replay route.
- Evidence: `test_decision_context_separates_information_outcome_and_policy_judgment`; `test_observation_enrichment_attaches_bounded_decision_context`.
- Reversible?: yes, only through a versioned policy contract with stronger information-state proof.
- Supersedes: no recorded predecessor.
- Status: ACTIVE
- Revisit Trigger: exact fog-of-war reconstruction becomes available, validated matchup policies are registered, or human review establishes a stronger grading contract.

## DEC-007 — Longitudinal learning fails closed on compatibility

- Date: 2026-08-26
- Context: comparing unrelated games creates persuasive but invalid patterns, while returning a list of every detected issue overloads the learner.
- Decision: persist one compact learning index per case; compare only exact race, matchup, patch, map, and duration buckets; exclude win/loss and opponent intent; require at least two compatible games for recurrence; return at most one provisional correction.
- Alternatives Considered: compare every replay; use win rate as the main feature; infer opponent archetypes; return every issue; the chosen strict cohort and one-correction contract.
- Why Chosen: makes longitudinal processing efficient and keeps recommendations attributable to compatible evidence.
- Authority: normalized compatibility fingerprint and content-addressed local case index.
- Affected Components: `replay_intelligence.py`, `case_workspace.py`, `master_intel.py`, Master Intel replay route.
- Evidence: `test_learning_summary_uses_strict_cohorts_and_returns_one_provisional_correction`.
- Reversible?: yes, through a versioned compatibility migration with replayable cohort proof.
- Supersedes: no recorded predecessor.
- Status: ACTIVE
- Revisit Trigger: patch-family compatibility is validated, map equivalence classes are registered, or outcome trials justify a different correction-selection rule.

## DEC-008 — Evidence graph and dependency register govern proof sequencing

- Date: 2026-08-27
- Context: QuietPilot's architecture review showed that SC2 shares the same need to keep source evidence, local tests, target verification, user outcomes, and commercial proof distinct while work becomes more dependency-heavy.
- Decision: Add an SC2-specific evidence graph and dependency register as canonical project-state views. The machine ledger records `evidenceGraph` and `dependencyGraph`; human-readable views live in `docs/project/EVIDENCE_GRAPH.md` and `docs/project/DEPENDENCIES.md`; the project-state checker validates that graph edges reference registered IDs.
- Alternatives Considered: copy QuietPilot's full Atlas; keep only prose in the adoption report; infer dependencies from capability rows only; the chosen lightweight SC2-native graph.
- Why Chosen: captures the useful QuietPilot pattern without importing SaaS, tenant, payment, provider, or commercial-spine complexity into the local coaching product.
- Authority: user-directed architecture adoption from the QuietPilot comparison.
- Affected Components: `.project/state.json`, `docs/project/EVIDENCE_GRAPH.md`, `docs/project/DEPENDENCIES.md`, `docs/README.md`, `scripts/check_project_state.py`, `tests/test_project_state_control.py`.
- Evidence: graph/register docs, checker implementation, and graph validation test.
- Reversible?: yes, through a replacement project-state schema that preserves evidence edges, dependency sequencing, and proof-boundary semantics.
- Supersedes: adoption-report-only treatment of evidence graph and dependencies.
- Status: ACTIVE
- Revisit Trigger: graph validation creates false confidence, dependencies need weighted or typed semantics, or runtime source records require a richer schema.
