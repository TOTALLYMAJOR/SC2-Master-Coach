# Dependency Register

Authority: [`.project/state.json`](../../.project/state.json). This register
records dependency direction for capabilities, blockers, proof events, and
future implementation packets. Dependencies control sequencing; they do not
inherit evidence or lifecycle state.

## Dependency Rules

- Capability dependencies are prerequisite authority or input relationships.
- Blocker dependencies identify the missing evidence that must clear first.
- Proof-event dependencies identify gates that must be satisfied before the
  event can prove anything.
- A dependency edge never upgrades the dependent node's proof level.
- A downstream capability may be locally `TESTED` while still blocked for target
  verification, usage, or outcome proof.
- Runtime dependencies must preserve the offline-first, loopback-only boundary
  unless a later accepted decision explicitly supersedes it.

## Current Capability Dependency Graph

```text
CAP-001 Master Intel shell
  -> no capability prerequisite

CAP-002 replay ingestion and case workspace
  -> CAP-001 shell

CAP-003 player-pack management
  -> CAP-001 shell

CAP-004 normalized replay hard data and compatibility gate
  -> CAP-002 replay cases
  -> CAP-003 player packs

CAP-005 Combat HUD
  -> CAP-007 Strategic OS
  -> CAP-008 Strategy Compiler

CAP-006 adaptive checkpoints and progression
  -> CAP-005 Combat HUD
  -> CAP-008 Strategy Compiler

CAP-007 Strategic OS decision kernel
  -> CAP-008 Strategy Compiler

CAP-008 Strategy Compiler
  -> no capability prerequisite

CAP-009 2v2 Team Composer
  -> CAP-005 Combat HUD

CAP-010 Python shadow Digital Twin
  -> CAP-007 Strategic OS

CAP-011 offline tactical voice
  -> CAP-005 Combat HUD
  -> CAP-010 Python shadow Digital Twin

CAP-012 replay frame-capture boundary
  -> CAP-002 replay cases

CAP-013 Windows release definition
  -> CAP-001 shell
  -> CAP-005 Combat HUD
  -> CAP-010 Python shadow Digital Twin
  -> CAP-011 offline tactical voice

CAP-014 offline runtime boundary
  -> CAP-001 shell

CAP-015 replay decision-context reconstruction
  -> CAP-002 replay cases
  -> CAP-004 normalized hard data

CAP-016 longitudinal replay learning fingerprints
  -> CAP-004 normalized hard data
  -> CAP-015 decision-context reconstruction

CAP-017 evidence graph and dependency control plane
  -> CAP-004 normalized hard data
  -> CAP-015 decision-context reconstruction
  -> CAP-016 longitudinal learning fingerprints
```

## Proof Dependencies

`PROOF-NEXT-001` depends on:

- `BLK-001` resolution: clean supported Windows install, real replay import,
  persisted case, bounded debrief, capture or fallback, voice or fallback, and
  human acceptance.
- `BLK-005` resolution: product-owner confirmation of whether Master Intel or
  Combat HUD is the primary journey.
- Exact artifact identity: commit, workflow run, artifact checksum, and local
  install record.
- Sanitized case evidence: case manifest, replay metadata, patch, matchup,
  observed facts, uncertainty, and one provisional practice focus.

## Blocker Dependencies

| Blocker | Depends on | Meaning |
| --- | --- | --- |
| BLK-001 | none | Target-environment evidence has not been captured. |
| BLK-002 | none | Provenance-backed replay comparison needs compatible references and calculation proof. |
| BLK-003 | none | Coaching validity needs expert review and player outcome evidence. |
| BLK-004 | BLK-001 | Operational and commercial claims cannot advance until clean target proof exists. |
| BLK-005 | none | Product-owner authority is required to resolve primary-journey drift. |

## Implementation Packet Shape

Any substantial future implementation packet should declare:

- `depends_on`: blocker, capability, decision, or proof-event prerequisites;
- `owns`: exact files or directories the packet may modify;
- `validates`: focused commands and expected evidence;
- `proof_boundary`: the claim boundary affected;
- `acceptance`: the smallest observable behavior or artifact that proves the
  packet's bounded outcome;
- `human_gate`: owner, expert, or player decision required before promotion;
- `blocked_if`: evidence, authority, or dependency condition that stops the work.

## Non-Adoption Boundary

This register does not introduce QuietPilot's tenant, payment, provider, or
commercial-spine dependencies. SC2's dependency graph is local-first and
coaching-evidence oriented:

```text
local launch
  -> replay or player report
  -> source identity and compatibility
  -> observed facts
  -> derived metrics
  -> withheld claims
  -> decision context
  -> provisional practice focus
  -> human comprehension
  -> repeated use
  -> measured improvement
```

Commercial dependencies remain `UNVERIFIED` until the product owner selects a
monetization path and transaction/outcome evidence exists.
