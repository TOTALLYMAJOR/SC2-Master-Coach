# QuietPilot Architecture Adoption Report

Date: 2026-08-27

## Scope And Evidence

This report compares the current SC2 Master Coach architecture with a read-only
inspection of QuietPilot. It is an adoption report, not an implementation
change, state promotion, release claim, or proof event.

SC2 evidence inspected:

- `PROJECT_STATE.md`
- `.project/state.json`
- `docs/project/CAPABILITIES.md`
- `docs/project/DECISIONS.md`
- `docs/project/BLOCKERS.md`
- `docs/project/PROOF.md`
- `docs/README.md`
- `docs/strategic-os-architecture.md`
- `docs/python-strategy-science-architecture.md`
- `app.py`
- `master_intel.py`
- `case_workspace.py`
- `replay_intelligence.py`

QuietPilot evidence inspected read-only:

- `/home/administrator/QP/QuietPilot` at `60a5d4ef` on
  `work/vis001-owner-status-ledger`, with local modifications present.
- `AGENTS.md`
- `package.json`, `apps/web/package.json`, `packages/domain/package.json`,
  `packages/application/package.json`
- `docs/governance/README.md`
- `docs/agentic-framework.md`
- `docs/atlas/00-governance/source-authority.md`
- `docs/atlas/00-governance/status-model.md`
- `docs/product/proof-boundary-registry.md`
- `docs/architecture/adr/0001-modular-monolith.md`
- `docs/architecture/adr/0002-source-of-truth-boundaries.md`
- `docs/architecture/adr/0004-ai-assistive-boundary.md`
- `docs/architecture/revenue-platform/03-codex/current-route-service-map.md`
- `docs/architecture/revenue-platform/03-codex/current-dependency-directions.md`
- `docs/atlas/03-capabilities/capability-model.md`
- `docs/atlas/04-workflows/commercial-spine.md`
- `packages/*/src/index.ts`

QuietPilot branch state, backlog state, provider state, and worktree contents are
time-sensitive. This report uses QuietPilot as a structural reference only.

## Executive Finding

SC2 and QuietPilot already share the most important architecture doctrine:
deterministic authority first, advisory intelligence second, and proof language
that refuses to promote source files, tests, local browser behavior, workflow
definitions, or provider configuration into stronger evidence than they prove.

SC2 should not adopt QuietPilot's SaaS stack wholesale. QuietPilot is a hosted
multi-tenant revenue-operations monorepo with Next.js, Prisma/Postgres, Redis,
Firebase identity, Stripe, provider adapters, worker queues, and customer or
partner access grants. SC2 is a local-first Windows desktop application with a
loopback Flask service, static browser UI, local replay case storage, optional
offline voice, and local advisory Python.

The transferable architecture is therefore not the hosting model. The valuable
transfer is QuietPilot's governance and boundary machinery:

1. claim-specific proof boundaries;
2. route-to-service maps;
3. dependency-direction rules and automated guards;
4. source-of-truth records for irreversible or user-visible transitions;
5. advisory AI lanes that cannot mutate canonical state;
6. capability status axes that separate implementation, verification, release
   readiness, use, and commercial proof;
7. task packets with dependencies, owned files, validation, acceptance, and
   human approval checkpoints.

## What The Repositories Share

| Shared pattern | QuietPilot expression | SC2 expression | Transfer value |
| --- | --- | --- | --- |
| One canonical authority | Commercial spine, source-of-truth records, route/service authority, capability registers | Strategic OS event log, canonical browser state, local case manifest, `.project/state.json` | High. SC2 already has the doctrine; it can make the runtime seams more explicit. |
| Advisory intelligence boundary | AI parses, recommends, and drafts, but cannot approve, accept, settle, reserve, assign, schedule, waive, or mark ready | Python Strategy Science and replay intelligence advise; Strategic OS and replay case evidence remain authoritative | High. This is the strongest shared architectural invariant. |
| Evidence-class discipline | Atlas status model, proof-boundary registry, provider/hosted/commercial ladders | Lifecycle states, proof register, replay fact/derived/inference/withheld labels | High. SC2 can add a more claim-specific proof registry. |
| Modular monolith | `apps/web`, `packages/contracts`, `packages/domain`, `packages/application`, `packages/infrastructure`, `packages/db` | Flask app, static UI modules, replay engine, case workspace, Strategy Science package | Medium. SC2 should adopt the dependency discipline, not the workspace technology. |
| Explicit source records | `QuoteVersion`, `ConfigVersion`, `ApprovalDecision`, `AcceptanceRecord`, `Job`, `IntegrationJob` | replay `manifest.json`, `analysis.json`, `learning-index.json`, player packs, science run/proof records | High. SC2 needs a stronger recommendation/run ledger before broader coaching claims. |
| Read models do not own mutation | Command Center and AI Review summarize source-backed state but route mutations to owner services | Master Intel summarizes replay/case evidence; Combat HUD consumes player reports | High. SC2 should keep dashboards/reviews as summaries and route writes to case/Strategic OS/science authorities. |
| Proof-safe release semantics | Hosted, provider, production, customer, and transaction proof are separate | Windows artifact, clean install, real replay, voice/capture, human comprehension, usage, outcome, and revenue proof are separate | High. The current SC2 proof event aligns with this model. |

## What SC2 Should Not Adopt Yet

- Multi-tenant organization/workspace/session architecture.
- Firebase identity, customer bearer grants, partner grants, or tenant role
  matrices.
- Stripe, proposal, payment, settlement, job-readiness, or commercial-spine
  state machines as product truth.
- Redis queues and hosted workers unless a real SC2 workload justifies a
  separate local worker or opt-in hosted service.
- The full QuietPilot Atlas scale. A 93-capability enterprise registry would
  create process overhead before SC2 has target-environment and player-outcome
  proof.
- Provider-proof runbooks, except as inspiration for Windows artifact and clean
  installation proof.

## Best Adoption Candidates

### 1. SC2 Proof Boundary Registry

Adopt a SC2-specific version of QuietPilot's proof-boundary registry.

Recommended file:

- `docs/project/PROOF_BOUNDARIES.md`

Core SC2 claim rows:

- replay file selected;
- replay parsed;
- replay fact observed;
- derived metric calculated;
- decision context reconstructed;
- strategic safety withheld;
- provisional practice focus generated;
- compatible recurrence detected;
- player pack identity trusted;
- Python advisory generated;
- live HUD decision shown;
- voice phrase recognized;
- frame capture available;
- clean Windows journey verified;
- player improvement measured;
- commercial demand proven.

Each row should name required evidence, allowed wording, forbidden wording,
affected surfaces, and tests or guards. This is the highest-value adoption
because SC2 already has many proof-sensitive surfaces but only a general proof
register.

### 2. Route-Service Map And Dependency Directions

Adopt QuietPilot's route-service map pattern in a lightweight SC2 form.

Recommended files:

- `docs/architecture/current-route-service-map.md`
- `docs/architecture/current-dependency-directions.md`

Initial route families:

- `/` -> Master Intel shell;
- `/hud` -> preserved Combat HUD;
- `/api/health` -> local parser/capture status;
- `/api/demo` -> enriched synthetic demo analysis;
- `/api/launch-context` -> associated replay intake;
- `/api/replay/*` -> replay engine, observation enrichment, case workspace;
- `/api/intel/*` -> Master Intel player packs, case listing, learning summary;
- `/api/science/*` -> Strategy Science advisory runtime;
- `/api/cases/*` -> replay and frame access with path safety.

Initial dependency rules:

- browser/static UI may call only loopback APIs;
- Flask route handlers validate transport and delegate;
- replay parser output and case manifests own replay truth;
- `replay_intelligence.py` may derive or withhold, but must label evidence;
- Python Strategy Science cannot mutate Strategic OS live state;
- capture and voice adapters return explicit unavailable/fallback states;
- no module may introduce background external network access without an accepted
  decision and explicit feature flag.

This would make SC2 easier to extend without creating a second authority path.

### 3. Coaching Recommendation Source Records

QuietPilot's source-of-truth record pattern should be translated into SC2 as
local coaching records, not commercial records.

Recommended source records:

- `ReplayCaseManifest` already exists as `manifest.json`.
- `ReplayFactEnvelope` already exists in analysis output.
- `PracticeRecommendationRecord` should bind the recommendation to case id,
  player, matchup, patch, evidence classes, withheld claims, model/ruleset
  versions, and timestamp.
- `StrategicDecisionRecord` should bind live HUD recommendations to Mission,
  Policy, Intel, Permission, Obligation, Decision, timer state, and reported
  evidence.
- `ScienceAdvisoryRunRecord` should bind Strategy Science output to immutable
  inputs, model version, seed when relevant, assumptions, uncertainty, and
  acceptance or rejection by Strategic OS.

This is the strongest runtime adoption after proof boundaries. It supports real
player acceptance review and later coaching-outcome analysis.

### 4. Lightweight Capability Axes

SC2 already has lifecycle states. It should selectively adopt QuietPilot's
independent axes where a single label hides important distinctions.

Recommended SC2 axes:

- implementation: missing, partial, implemented;
- local validation: untested, unit tested, integration tested, manually observed;
- target verification: unverified, clean Windows observed, human accepted;
- release readiness: blocked, conditional, ready;
- outcome proof: unverified, used, improvement observed, commercially proven.

This should be an extension of `.project/state.json`, not a competing tracker.
The immediate benefit is clearer handling of capabilities such as offline voice
and frame capture, where code and local tests exist but target proof is missing.

### 5. Advisory Feature Flags And Review Lanes

QuietPilot keeps AI advisory features behind explicit review-only lanes and
feature enablement. SC2 should apply the same discipline to Strategy Science
expansion.

Recommended rule:

- Any new Strategy Science or replay-intelligence capability starts
  off-by-default or review-only until it has real replay fixtures, bounded tests,
  and a named acceptance path.

Candidate flags:

- `SC2_STRATEGY_SCIENCE_DISCOVERY`;
- `SC2_MASTER_COMPARISON`;
- `SC2_COHORT_LEARNING`;
- `SC2_VOICE_COMMANDS`;
- `SC2_FRAME_CAPTURE`.

The exact names can change. The architecture point is that advisory work should
enter through controlled lanes rather than silently becoming coaching truth.

### 6. AgentFlow-Style Task Packets For SC2

QuietPilot's AgentFlow packet discipline is useful when SC2 work becomes
parallel or multi-file:

- `depends_on`;
- `owns`;
- `validate`;
- acceptance criteria;
- proof boundary affected;
- human approval checkpoint;
- blocked conditions.

SC2 should adopt the packet shape for substantial implementation work, especially
where replay intelligence, UI, packaging, and project state must move together.
This does not require importing QuietPilot's backlog hierarchy.

### 7. Generated Contract And Inventory Snapshots

QuietPilot uses API contract snapshots, route maps, check scripts, and generated
inventories to catch architectural drift. SC2 can use smaller equivalents:

- route inventory generated from Flask rules;
- API response contract fixtures for `/api/replay/*`, `/api/intel/*`, and
  `/api/science/*`;
- proof-boundary wording check for forbidden claims such as "verified",
  "master-level", "safe", "knows", or "improved" when evidence is missing;
- dependency guard for offline-only and advisory-only imports.

This should come after the docs establish the intended shape.

## Recommended Adoption Order

1. Create `docs/project/PROOF_BOUNDARIES.md`.
2. Create `docs/architecture/current-route-service-map.md` and
   `docs/architecture/current-dependency-directions.md`.
3. Add one checker for forbidden proof wording and offline/advisory dependency
   drift.
4. Add `PracticeRecommendationRecord` and `ScienceAdvisoryRunRecord` as local
   source records.
5. Extend `.project/state.json` only after the new axes have a concrete consumer
   in reports, tests, or release decisions.
6. Adopt AgentFlow-style task packets for the next multi-surface implementation
   slice.

## Highest-Leverage First Slice

The smallest useful slice is documentation plus one guard:

```text
SC2 proof boundary registry
  -> current route/service map
  -> forbidden-claim wording checker
  -> project-state checker integration
```

Why this first:

- It strengthens every future replay, coaching, UI, packaging, and release claim.
- It avoids adding runtime architecture before the clean-Windows real-replay proof
  event reveals the next bottleneck.
- It directly supports `BLK-001`, `BLK-002`, `BLK-003`, and `BLK-004` without
  pretending to resolve them.

## Product Spine Translation

QuietPilot's commercial spine should not be copied literally. The SC2 equivalent
is a coaching evidence spine:

```text
Local launch
  -> replay or player report
  -> source identity and compatibility
  -> observed facts
  -> derived metrics
  -> withheld claims
  -> reconstructed decision context
  -> provisional practice focus
  -> human comprehension
  -> repeated use
  -> measured improvement
  -> commercial proof, if monetized
```

This spine is the right adoption target because it fits SC2's product: a player
does not need tenant activation or payment settlement to get value; the player
needs an honest path from evidence to one useful next decision.

## Open Decisions

- Whether Master Intel or Combat HUD is the primary product journey remains
  unresolved in SC2 canonical state. Adoption work should avoid hardening one
  path's narrative until `BLK-005` is resolved.
- Whether Strategy Science should grow in-process or move to a dedicated local
  worker remains a future workload decision. QuietPilot's worker architecture is
  evidence that async isolation can help, not proof that SC2 needs it now.
- Whether commercial proof should become a near-term SC2 architecture concern is
  unverified. Until then, commercial records should stay out of the runtime model.

## Capability And State Impact

No SC2 capability changes state from this report. No canonical proof event
changes. No blocker is removed.

This report introduces no binding architecture decision by itself. It recommends
future adoption candidates that would require normal owner selection, bounded
implementation, focused validation, and canonical project-state reconciliation
when implemented.
