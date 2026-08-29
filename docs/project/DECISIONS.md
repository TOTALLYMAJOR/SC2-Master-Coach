# Decision Ledger

This register adopts existing decisions; it does not rewrite history. `DEC-003` now records the accepted product hierarchy that resolved the former implementation-versus-framing conflict.

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
- Decision: bind Flask to loopback, keep browser connections self-only, reject non-loopback Host values, cross-site requests, and cross-origin mutations, disable automatic update calls, store evidence locally, and make optional network features explicit.
- Alternatives Considered: cloud-first service; background update/provider calls; browser-direct external integrations; the chosen local-first boundary.
- Why Chosen: privacy, zero-cost operation, predictable latency, offline use, and explicit evidence authority.
- Authority: executable configuration and Master Intel implementation record; product owner confirmation is implicit rather than separately recorded.
- Affected Components: `app.py`, desktop shell, Master Intel data paths, CSP, update endpoints, voice runtime.
- Evidence: `app.py:apply_offline_security_headers`; `master_intel.py:enforce_loopback_browser_authority`; offline-boundary and DNS-rebinding/cross-origin tests.
- Reversible?: yes, through an explicit opt-in integration decision with privacy and fallback controls.
- Supersedes: older automatic-update behavior retained only as manual compatibility endpoints.
- Status: ACTIVE
- Revisit Trigger: any feature requires an external runtime service, background network traffic, cloud storage, or provider credentials.

## DEC-003 — Master Intel owns the improvement loop; Guided Execution is supporting

- Date: 2026-08-22 implementation; product hierarchy accepted and reconciled 2026-08-27
- Context: Master Intel became the executable default while historical release framing still centered the Combat HUD. The product-capability audit recommended one sequential improvement loop rather than competing product centers.
- Decision: Master Intel owns browser and Windows entry, replay-player identity selection, contextual review, and exactly one persistent active drill. Guided Execution at `/hud` is the supporting live mode; the drill may constrain experimental plan selection but never supersedes Strategic OS or player-report authority.
- Alternatives Considered: Combat HUD remains default; Master Intel becomes default; a neutral chooser becomes default.
- Why Chosen: it joins the strongest evidence and action models into one resumable user loop without adding a third authority or fabricating comparison.
- Authority: user-directed implementation on 2026-08-27 plus current Flask routes and focused tests.
- Affected Components: `/`, `/hud`, onboarding, README, release narrative, next proof event.
- Evidence: `README.md`; `desktop_app.py`; `app.py:index`; replay identity and Practice routes; active-drill, Windows-entry, and HUD handoff tests.
- Reversible?: yes.
- Supersedes: older default-HUD product thesis and the provisional documentation-drift status of this decision.
- Status: ACTIVE
- Revisit Trigger: real-player evidence shows the sequential review-to-execution loop is less understandable or less valuable than a different hierarchy.

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

## DEC-007 — Longitudinal learning fails closed on chronology, opening compatibility, and observability

- Date: 2026-08-26
- Context: comparing unrelated games creates persuasive but invalid patterns, while returning a list of every detected issue overloads the learner.
- Decision: persist one explicit player-reported identity and one player-scoped learning index per case; exclude unselected cases and prevent both sides of one replay from entering the personal cohort; compare first-five-minute behavior only across chronologically prior replays with exact race, matchup, patch, map, game mode, and complete opening coverage. Total match duration remains descriptive rather than a cohort gate because it is outcome-dependent. Exclude win/loss and opponent intent; require at least two signal-observable compatible games for recurrence; treat missing fields and sparse intervals as withheld rather than absence or duration; rank one provisional correction by a disclosed 95% Wilson recurrence lower bound, then count and current evidence timing while expert priority remains `UNVERIFIED`. Progression reports player-reported consistency rather than mastery, and evidence confidence requires both report volume and distinct sessions. Two latest met reports from distinct sessions create readiness for replay review—not mastery—and multiple distinct met follow-up replays create a player decision to keep or replace the target, never causal or durable-improvement proof.
- Alternatives Considered: compare every replay; use win rate as the main feature; infer opponent archetypes; return every issue; the chosen strict cohort and one-correction contract.
- Why Chosen: makes longitudinal processing efficient and keeps recommendations attributable to compatible evidence.
- Authority: normalized compatibility fingerprint and content-addressed local case index.
- Affected Components: `replay_intelligence.py`, `case_workspace.py`, `master_intel.py`, Master Intel replay route.
- Evidence: `test_learning_summary_uses_strict_cohorts_and_returns_one_provisional_correction`; `test_two_explicitly_owned_cases_unlock_personal_recurrence`; `test_total_game_duration_is_descriptive_not_a_first_five_cohort_gate`; `test_larger_cohort_can_outrank_perfect_two_game_rate_on_conservative_strength`; `test_signal_absence_is_withheld_when_required_fields_are_missing`; `test_sparse_single_samples_do_not_manufacture_exposure_windows`; `test_recurrence_denominator_excludes_games_without_signal_observability`; `test_player_report_confidence_requires_distinct_sessions_not_checkpoint_volume`; `test_focus_graduation_requires_met_reports_in_two_distinct_sessions`; `test_later_uncertain_report_blocks_focus_graduation`; `test_replay_followup_withholds_unknown_or_unevaluable_evidence`.
- Reversible?: yes, through a versioned compatibility migration with replayable cohort proof.
- Supersedes: no recorded predecessor.
- Status: ACTIVE
- Revisit Trigger: patch-family compatibility is validated, map equivalence classes are registered, or expert/player outcome trials justify a different correction-selection or graduation rule. The former exact-total-duration clause was superseded on 2026-08-28 because it incorrectly fragmented the shared first-five-minute evidence window using an outcome-dependent value.

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

## DEC-009 — Windows release assets remain bound to one exact source and acceptance candidate

- Date: 2026-08-28
- Context: the existing `v1.13.0` assets were rebuilt from a different commit than the tag target, and rebuilding between acceptance and publication would change the bytes being claimed as accepted.
- Decision: reserve `1.14.0` for the next candidate; require a version-matching tag; emit exact commit/ref/run metadata, dependency inventory, byte sizes, and SHA-256 values with every Windows build; prohibit `main` from clobbering tagged assets; and create tagged releases as drafts so clean-Windows acceptance runs against the exact assets later promoted unchanged.
- Alternatives Considered: continue replacing the current-version assets from `main`; accept a branch artifact then rebuild on tag; publish immediately and retract on failure; the chosen immutable draft-promotion path.
- Why Chosen: makes artifact identity auditable and prevents a successful source build or acceptance run from being attributed to different binaries.
- Authority: `PROOF-NEXT-001` exact-SHA evidence requirement plus the user-directed move toward a real acceptance candidate.
- Affected Components: `app.py`, NSIS metadata, `.github/workflows/windows-release.yml`, Windows release tests, proof kit.
- Evidence: `test_windows_artifacts_carry_exact_sha_provenance_and_checksums`; `test_windows_release_checks_primary_master_intel_modules`; `test_v113_dev_ci_builds_without_publishing_and_marks_only_after_artifacts`; version-consistency tests.
- Reversible?: only through another release process that preserves exact source-to-byte identity and tests the same bytes that are published.
- Supersedes: mutable `main`-branch release asset refresh and immediate publication of unaccepted tag builds.
- Status: ACTIVE
- Revisit Trigger: a signed reproducible-build pipeline or provider-native promotion mechanism can preserve stronger artifact identity with less manual handling.

## DEC-010 — Unbound legacy or corrupt replay metadata is recovery-only

- Date: 2026-08-28
- Context: older case folders and interrupted or tampered metadata generations do not carry the shared revision and manifest hashes required to prove that replay, analysis, and learning records belong together. Silently trusting or rewriting them would upgrade unverified local data into coaching authority.
- Decision: production reads validate replay digest, case identity, schema, shared revision, manifest-bound metadata hashes, and analysis/learning coherence. A failed or legacy case cannot supply replay facts or coaching, but remains discoverable as a privacy-safe `Replay needs re-import` placeholder when its stored replay exists. Re-importing the original authorized replay creates a new bound generation; there is no automatic trust migration.
- Alternatives Considered: trust old metadata indefinitely; hide failed cases completely; auto-sign existing files without their original source; the chosen visible recovery-only migration.
- Why Chosen: fails closed on evidence authority while preserving the player's route to recovery and avoiding silent data disappearance.
- Authority: offline-first evidence boundary and user-directed candidate hardening.
- Affected Components: `case_workspace.py`, `master_intel.py`, replay detail/player-selection APIs, recent replay library.
- Evidence: `test_case_metadata_tampering_fails_closed_in_production_detail`; `test_interrupted_metadata_generation_is_invisible_until_authorized_retry`; `test_legacy_case_remains_visible_only_as_privacy_safe_recovery_placeholder`.
- Reversible?: only through a versioned migration that can independently prove the original replay-to-metadata binding.
- Supersedes: implicit trust of pre-1.1 case metadata.
- Status: ACTIVE
- Revisit Trigger: a trustworthy migration can reconstruct and verify legacy generations without inventing provenance.

## DEC-011 — Personal Windows installation is fixed-path and non-destructive by default

- Date: 2026-08-28
- Context: the former directory-selection page allowed installation into an arbitrary existing folder while uninstall recursively removed `$INSTDIR`. The installer also replaced the default `.SC2Replay` association without retaining its previous owner.
- Decision: install only under the dedicated per-user application directory; abort uninstall if its resolved path differs; stop installation when the required WebView2 bootstrap fails; add a non-default **Open with SC2 Master Coach** command without taking over `.SC2Replay`; and pin direct desktop build dependencies.
- Alternatives Considered: retain arbitrary directory selection; trust users not to select a shared folder; replace and later guess the prior replay association; portable-only distribution; the chosen guarded personal installer plus portable artifact.
- Why Chosen: preserves a normal personal-app experience while removing avoidable deletion and file-association hazards.
- Authority: user-directed personal application packaging and destructive-action safety.
- Affected Components: `installer/sc2-master-coach.nsi`, `requirements-desktop.txt`, Windows packaging tests.
- Evidence: `test_nsis_installer_uses_a_fixed_personal_app_directory_and_guarded_uninstall`; `test_desktop_direct_dependencies_are_version_pinned_for_candidate_builds`.
- Reversible?: yes, but any future custom-path support must prove ownership of an app-created directory and restore prior shell integration safely.
- Supersedes: arbitrary NSIS install-directory selection and default `.SC2Replay` association replacement.
- Status: ACTIVE
- Revisit Trigger: a signed installer framework provides transactional ownership, association restoration, and stronger rollback.

## DEC-012 — Patched protobuf runs legacy SC2 descriptors in explicit compatibility mode

- Date: 2026-08-28
- Context: `protobuf==3.20.3` allowed the legacy generated `s2clientprotocol` descriptors to import, but current repository security alerts identify high-severity denial-of-service and JSON recursion issues. Patched native protobuf rejects those old generated descriptors.
- Decision: pin `protobuf==5.29.6` and set `PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python` before the optional SC2 capture protocol imports. Verify the real `s2clientprotocol` import in tests and the Windows workflow.
- Alternatives Considered: retain the vulnerable pin; suppress the alerts because the app is personal; regenerate upstream SC2 descriptors in this slice; remove capture; the chosen patched compatibility mode.
- Why Chosen: removes the known dependency vulnerabilities without disabling the bounded capture path or pretending the legacy native descriptors are compatible.
- Authority: repository security alert review plus executable protocol-import evidence.
- Affected Components: runtime and desktop requirements, `sc2_frame_capture.py`, Windows workflow, protocol compatibility tests.
- Evidence: isolated `protobuf 5.29.6` import experiment; `test_sc2_protocol_runtime_imports_with_supported_protobuf`; `test_frame_capture_sets_patched_protobuf_legacy_descriptor_compatibility`.
- Reversible?: yes, when upstream publishes regenerated descriptors compatible with patched native protobuf.
- Supersedes: the vulnerable `protobuf==3.20.3` compatibility pin.
- Status: ACTIVE
- Revisit Trigger: capture performance is inadequate, upstream descriptors are regenerated, or a newer patched protobuf line requires compatibility retesting.
