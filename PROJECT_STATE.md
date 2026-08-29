# SC2 Master Coach — Canonical Project State

This file is the human entry point. The machine authority is [`.project/state.json`](.project/state.json); the detailed registers under [`docs/project/`](docs/project/) are evidence views of that ledger. Missing evidence is `UNVERIFIED`, never an implied pass.

## Identity

```text
Project: SC2 Master Coach
Repository: TOTALLYMAJOR/SC2-Master-Coach
Primary Purpose: Local, evidence-bounded StarCraft II replay intelligence and decision coaching
Primary User / Actor: A StarCraft II player seeking structured practice and review
Economic Buyer: Individual player hypothesis — UNVERIFIED
Problem Solved: Turn local replay evidence or explicit player reports into one understandable next decision without fabricated certainty
Current Product Stage: Local-first product beta; operational adoption and commercialization are UNVERIFIED
Primary Deployment Target: Unsigned per-user Windows desktop app with a loopback-only Flask service
Last Evidence Reconciliation: 2026-08-28 from the current worktree based on 862f1677543231730f58b631c36a37101975a05b
```

Portfolio membership is `UNVERIFIED`; no `.project/portfolio.json` is created without a stable interoperability contract.

## North-Star Goal

SC2 Master Coach succeeds when a player can install the local Windows app, supply a real replay or explicit battlefield report, understand the evidence and uncertainty behind one recommended practice decision, act without developer help, and return often enough to demonstrate measurable improvement.

- Technical success: local inputs produce bounded, reproducible outputs while privacy and authority contracts hold.
- User success: the player understands what to do next and why.
- Operational success: a clean Windows installation completes the journey with current artifact and acceptance evidence.
- Commercial success: paying players activate, retain, and show measured improvement; all commercial dimensions are currently `UNVERIFIED`.

## Evidence Semantics

`IDEA ≠ SPECIFIED ≠ DESIGNED ≠ IMPLEMENTED ≠ TESTED ≠ VERIFIED ≠ DEPLOYED ≠ USED ≠ COMMERCIALLY_PROVEN`.

The current repository has source and local-test evidence. That does not prove a current hosted build, clean-machine behavior, real hardware behavior, customer use, or revenue. See [PROOF.md](docs/project/PROOF.md), [EVIDENCE_GRAPH.md](docs/project/EVIDENCE_GRAPH.md), and [DEPENDENCIES.md](docs/project/DEPENDENCIES.md).

## Canonical Journey

The executable default at `/` makes the current primary journey:

```text
Local app launch
→ StarCraft II player
→ import a local replay or explicitly synthetic demo
→ persist a content-addressed local case
→ replay parser output + case manifest establish authority
→ normalize observed facts once and calculate explicitly derived local signals
→ explicitly identify which replay player is the user; withhold personal coaching until selected
→ inspect player-scoped evidence and activate one versioned local practice drill
→ use the drill focus to constrain an experimental Guided Execution plan while live player reports retain authority
→ recover an interruption paused with the clock marked approximate until resynchronized
→ save a bounded local session receipt and return to the same drill for later replay or checkpoint review
```

The supporting live journey is:

```text
Deploy experimental practice operation
→ player synchronizes time and reports battlefield evidence
→ Strategic OS updates Intel and chooses CONTINUE / MODIFY / HOLD / ABORT
→ Combat HUD shows one question, one action, and one reason
→ player acts while uncertainty remains explicit
→ interruption recovery preserves the plan and reports without inventing elapsed time or results
```

## Current Reality

- `app.py` serves Master Intel at `/`; the Windows desktop shell also launches `/`, and Guided Execution remains compatible at `/hud`.
- Master Intel consumes associated-replay launch context before onboarding and withholds personal replay coaching until the user explicitly selects their replay player.
- Replay-player identity is now durable case-local player-report authority. Cross-replay recurrence admits only explicitly owned, strictly compatible player-scoped indexes; selecting the opponent replaces ownership instead of contaminating the personal cohort.
- Master Intel persists exactly one versioned active drill locally. Replay-derived persistence now requires observed-replay authority, a calculated correction-specific anchor, explicit player identity, and provisional status; legacy unsafe drills and interrupted sessions fail closed. Synthetic cases remain tutorial-only across Home, Replay, and Practice.
- Replay reports are decision-first: the next practice target precedes collapsed normalized evidence, replay-observed facts remain separate from player-only reports, and a chronologically later replay reports one criterion as met, recurred, player-report-required, or withheld only when identity, race, matchup, patch, map, field-specific observability, and five-minute coverage align. A bounded local follow-up receipt preserves that observation for Practice, but one observation never becomes an automatic improvement claim.
- Replay review uses one patch fallback contract across summaries, reference readiness, drill activation, and follow-up comparison. Missing supply-timing evidence is labeled not observed; it is not translated into a parser or provider conclusion.
- Guided Execution previews future checkpoints without accepting reports, preserves a recently missed checkpoint as late, keeps mobile setup and scout actions reachable, constrains replay-derived targets to 1v1, guards clock synchronization, and preserves keyboard focus across rerenders.
- Guided Execution asks the replay focus once near its five-minute observation window and distinguishes `condition did not occur` from met, missed, or uncertain. Unknown, missing, or malformed legacy report status fails closed and cannot inflate progression. Two latest met reports from distinct sessions create only `reported_ready_for_replay_review`; a later uncertain or missed report blocks that state. Progression reports player-reported consistency rather than mastery, and evidence confidence requires both report volume and distinct sessions while coaching validity remains `UNVERIFIED`. The UI exposes that basis plus the bounded 240-event retention and 20-observation analysis horizons. Plan-status reports remain separate, reports for other targets remain history, and Practice scopes receipts to the active focus, case, and player. Voice reports use the same semantic persistence path as manual reports, and current-HUD diagnostics are reachable, open at their titles, expose an immediate close action, trap focus, close with Escape, and restore the trigger.
- Guided Execution persists one versioned interrupted session, resumes it paused with an explicitly approximate clock, and saves bounded receipts only after local persistence succeeds. Those receipts summarize UI and player-reported evidence; they do not claim gameplay execution or improvement.
- Master Intel tracks replay, player, pack, and readiness resources independently. A failed resource is labeled unavailable rather than empty, stale values remain visible, and bounded retries do not require a full-page reload.
- Settings provides an actual local system check, a privacy-bounded support report, allowlisted folder-open actions, and explicit manual-backup guidance. Local update selection reports filename, type, and size only; publisher authenticity and automated archive restore remain explicitly unverified.
- Compare remains reachable for compatibility, but it is no longer primary navigation; replay review now exposes exact race, matchup, and patch reference readiness inline while withholding unsupported calculations.
- Imported player packs may declare an identity claim, but the product labels it publisher-declared and never upgrades a pack's self-assertion into independent verification. Persisted packs are revalidated at read time, and ambiguous cross-pack player identifiers fail closed.
- The loopback service rejects non-loopback remote and Host values, cross-site browser requests, and cross-origin mutations while allowing the dynamic local port used by the desktop shell. Packaged-runtime network observation remains `UNVERIFIED`.
- Replay parsing, local case persistence, player packs, the compatibility gate, the Combat HUD, adaptive checkpoints, Strategic OS, Strategy Compiler, 2v2 Team Composer, the bounded Python Digital Twin, offline voice contracts, frame-capture boundaries, Windows release definitions, and loopback security have local test coverage.
- Replay case persistence now compares stored bytes with the authorized source digest and commits manifest, analysis, and learning data as one hash-bound generation. Production reads reject replay or cross-file identity drift. Corrupt and pre-1.1 cases cannot supply facts or coaching, but remain visible as privacy-safe re-import placeholders when their stored replay exists. Re-importing the original authorized replay creates a trusted generation; there is no automatic trust migration.
- The opt-in disposable-workspace genuine-replay smoke probe uses production enrichment, requires supported non-observer 1v1 participants and dense first-five-minute evidence, validates the persisted case generation, and can emit its bounded proof class only when bound to the exact build artifact or the same clean Git source. Mocked calls remain test-contract-only. No genuine replay was supplied, so real parsing remains `UNVERIFIED`.
- The `1.14.0` candidate identity is reserved only in the worktree. Direct desktop dependencies and parser sources are pinned; primary Master Intel modules receive recursive syntax checks. The installer is fixed to the dedicated per-user directory, refuses an unexpected uninstall path, stops if WebView2 bootstrap fails, and adds a non-default replay Open With command without replacing the player's association. The Windows workflow emits exact-SHA/run manifests, checksums, and dependency inventory. Version tags create draft releases for acceptance before unchanged promotion; no current hosted run, artifact, tag, draft, or publication was created in this reconciliation.
- The Python runtime implements the bounded PvT three-base Digital Twin. Most registered Strategy Science capabilities remain design-only.
- The hard-data engine produces versioned per-player fact envelopes, compatibility fingerprints, compact second-resolution worker continuity, mineral-threshold exposure, and supply-block windows.
- The replay observation model now attaches conservative information-before-commitment windows, separates outcome from decision reasonableness, grades expansion evidence coverage, and exposes attention-gap and repeated-phase proxies.
- Each newly persisted case receives a compact player-scoped learning index. Personal macro vectors exclude win/loss; opponent vectors exclude intent; first-five-minute recurrence admits only chronologically prior replays with exact race, matchup, patch, map, game-mode, and observation-window compatibility. Total game duration remains descriptive because match length is outcome-dependent and does not determine whether the opening was comparable. Recurrence denominators include only games in which that specific signal was observable; provisional correction ranking uses the disclosed 95% Wilson lower bound, then count and the earliest current evidence anchor, so fragile perfect rates do not outrank materially stronger cohorts. Expert priority remains `UNVERIFIED`.
- The canonical state now includes an evidence graph and dependency graph. These records organize source, test, decision, blocker, capability, journey, and proof-event relationships without promoting target-environment, user-outcome, or commercial claims.
- Production utilization is calculated only when producer identity and cycle start/end facts exist; current real-replay parsing withholds that metric rather than estimating it.
- Exact private knowledge and strategic expansion safety without policy remain withheld; cross-replay recurrence is withheld unless at least two explicitly owned compatible case indexes exist.
- Real multi-replay cohort acceptance and the correction mapping's expert/player outcome validity remain `UNVERIFIED`.
- The comparison surface still withholds replay-to-master calculations because provenance-backed compatible references and the calculation engine do not exist.
- GitHub Actions source, dependency pins, proof-kit documents, and release tags are repository evidence of release machinery, not current build, deployment, installation, or acceptance receipts.
- External deployment, real-user acceptance, usage, outcomes, and commercial evidence are `UNVERIFIED`.

## Repository State at Reconciliation

- Active checkout: `/home/administrator/projects_new/SC2-Master-Coach`
- Active branch: `feat/master-intel-live-checkpoints`
- Reconciled source base: `862f1677543231730f58b631c36a37101975a05b` plus the current bounded product-quality worktree slice
- Remote tracking branch: `origin/feat/master-intel-live-checkpoints`
- One worktree was present.
- Local `main` was behind `origin/main`; it is not the authority for this reconciliation.
- Pre-existing untracked `.agents/` and `output/` content was preserved and is not evidence of committed product state.

Branch, remote, workflow, and deployment facts are time-sensitive and must be refreshed before release claims.

## External Verification Requirements

- Clean supported Windows environment and a real compatible `.SC2Replay` file.
- Installed StarCraft II binary for successful frame-capture proof.
- Real microphone and bundled Vosk model for voice acceptance.
- GitHub Actions/release access for exact-SHA workflow and artifact receipts; the runtime itself requires no provider credential.
- Named expert and player testers for coaching correctness, comprehension, and outcome evidence.

## Product Hierarchy Decision

The 2026-08-27 user-directed implementation adopts one primary improvement loop: Master Intel owns replay review, evidence boundaries, and the persistent active drill; Guided Execution at `/hud` is the supporting live mode. This resolves the former executable-versus-release-positioning contradiction recorded as `BLK-005`. Historical release notes remain historical evidence, not current product authority.

## NEXT PROOF EVENT

**Proof Event:** `PROOF-NEXT-001 — Clean Windows real-replay coaching loop`

**Why It Matters:** It is the smallest event crossing source, packaging, installation, real replay parsing, persistence, capture/voice fallback behavior, UX comprehension, and human acceptance.

**Prerequisites:** A version-matched draft artifact from an exact commit, a clean supported Windows environment, a supported real replay, and a named human acceptance owner.

**Acceptance Criteria:** Install and launch without developer tools; persist one real replay case; show patch, matchup, observed evidence, uncertainty, and one provisional practice focus; exercise frame capture or its explicit fallback; exercise voice or its manual fallback; record that the tester understood the next action and evidence boundary.

**Required Evidence:** Exact commit, tag, and workflow run; build manifest, dependency inventory, and artifact checksums; install/launch record; sanitized case manifest; capture and voice result; human acceptance record; and an unchanged draft-publication receipt if promoted.

**Current Blocker:** `BLK-001`.

## Next Actions

1. Freeze the intentional `1.14.0` candidate commit, create its version-matched tag draft, and retain the exact-SHA manifest, checksums, dependency inventory, and provider receipt.
2. Run the bound smoke probe with the consented genuine replay, then run the clean-Windows real-replay journey, including active-drill handoff plus capture and voice fallbacks.
3. Record human comprehension and acceptance.
4. Choose the next implementation slice only after that evidence is reconciled.

## Control Plane Operation

Run `python3 scripts/check_project_state.py` before declaring a capability-state change complete. The checker validates file and test references, verification freshness, lifecycle ceilings, duplicate IDs, blocker links, evidence-graph and dependency-graph references, deprecated/current contradictions, unresolved verified placeholders, and the single next proof event. Semantic promotion remains a human or explicitly authorized maintainer decision.
