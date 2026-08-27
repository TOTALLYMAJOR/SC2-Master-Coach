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
Last Evidence Reconciliation: 2026-08-27 from the current worktree based on 1243d0b4a7c3c77d7000aad38d3ef0f79211217e
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
→ inspect evidence classes and open provisional practice
→ receive one bounded practice focus without fabricated master comparison
```

The supporting live journey is:

```text
Deploy curated operation
→ player synchronizes time and reports battlefield evidence
→ Strategic OS updates Intel and chooses CONTINUE / MODIFY / HOLD / ABORT
→ Combat HUD shows one question, one action, and one reason
→ player acts while uncertainty remains explicit
```

## Current Reality

- `app.py` serves Master Intel at `/` and the preserved Combat HUD at `/hud`.
- Replay parsing, local case persistence, player packs, the compatibility gate, the Combat HUD, adaptive checkpoints, Strategic OS, Strategy Compiler, 2v2 Team Composer, the bounded Python Digital Twin, offline voice contracts, frame-capture boundaries, Windows release definitions, and loopback security have local test coverage.
- The Python runtime implements the bounded PvT three-base Digital Twin. Most registered Strategy Science capabilities remain design-only.
- The hard-data engine produces versioned per-player fact envelopes, compatibility fingerprints, compact second-resolution worker continuity, mineral-threshold exposure, and supply-block windows.
- The replay observation model now attaches conservative information-before-commitment windows, separates outcome from decision reasonableness, grades expansion evidence coverage, and exposes attention-gap and repeated-phase proxies.
- Each newly persisted case receives a compact learning index. Personal macro vectors exclude win/loss; opponent vectors exclude intent; longitudinal recurrence requires exact race, matchup, patch, map, and duration compatibility; output is limited to one provisional correction.
- The canonical state now includes an evidence graph and dependency graph. These records organize source, test, decision, blocker, capability, journey, and proof-event relationships without promoting target-environment, user-outcome, or commercial claims.
- Production utilization is calculated only when producer identity and cycle start/end facts exist; current real-replay parsing withholds that metric rather than estimating it.
- Exact private knowledge and strategic expansion safety without policy remain withheld; cross-replay recurrence is withheld unless at least two compatible case indexes exist.
- Real multi-replay cohort acceptance and the correction mapping's expert/player outcome validity remain `UNVERIFIED`.
- The comparison surface still withholds replay-to-master calculations because provenance-backed compatible references and the calculation engine do not exist.
- GitHub Actions and release tags are repository evidence of release machinery, not current deployment or installation receipts.
- External deployment, real-user acceptance, usage, outcomes, and commercial evidence are `UNVERIFIED`.

## Repository State at Reconciliation

- Active checkout: `/home/administrator/projects_new/SC2-Master-Coach`
- Active branch: `feat/master-intel-live-checkpoints`
- Reconciled source base: `1243d0b4a7c3c77d7000aad38d3ef0f79211217e` plus the current normalized-hard-data worktree slice
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

## Critical Contradiction

Executable routing and Master Intel tests establish Master Intel as the default. The root README still frames the Combat HUD as the primary product center, while the Milestone 0 record says Master Intel was not released. This is not silently resolved: current code behavior governs the executable journey, and product-owner intent remains an open authority question (`BLK-005`).

## NEXT PROOF EVENT

**Proof Event:** `PROOF-NEXT-001 — Clean Windows real-replay coaching loop`

**Why It Matters:** It is the smallest event crossing source, packaging, installation, real replay parsing, persistence, capture/voice fallback behavior, UX comprehension, and human acceptance.

**Prerequisites:** A validated artifact from an exact commit, a clean supported Windows environment, a supported real replay, and a named human acceptance owner.

**Acceptance Criteria:** Install and launch without developer tools; persist one real replay case; show patch, matchup, observed evidence, uncertainty, and one provisional practice focus; exercise frame capture or its explicit fallback; exercise voice or its manual fallback; record that the tester understood the next action and evidence boundary.

**Required Evidence:** Exact commit and workflow run, artifact checksum, install/launch record, sanitized case manifest, capture and voice result, and human acceptance record.

**Current Blockers:** `BLK-001` and `BLK-005`.

## Next Actions

1. Confirm whether Master Intel or the Combat HUD is the intended primary product journey.
2. Produce a current Windows artifact with an exact-commit workflow receipt and checksum.
3. Run the clean-Windows real-replay journey, including capture and voice fallbacks.
4. Record human comprehension and acceptance.
5. Choose the next implementation slice only after that evidence is reconciled.

## Control Plane Operation

Run `python3 scripts/check_project_state.py` before declaring a capability-state change complete. The checker validates file and test references, verification freshness, lifecycle ceilings, duplicate IDs, blocker links, evidence-graph and dependency-graph references, deprecated/current contradictions, unresolved verified placeholders, and the single next proof event. Semantic promotion remains a human or explicitly authorized maintainer decision.
