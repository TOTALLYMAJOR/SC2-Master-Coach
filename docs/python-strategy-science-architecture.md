# SC2 Master Coach — Python Strategy Science Architecture

**Status:** Approved design pack  
**Runtime authority:** Strategic OS event log and canonical browser state  
**Python role:** Local advisory, simulation, validation, persistence, and research runtime  
**Patch baseline:** StarCraft II 5.0.16b  
**Owner:** MBMapps

## 1. Mission

The Python Strategy Science Runtime exists to expand the Strategic OS from a rules-driven operating system into a reproducible strategy-research platform.

It must help the application:

1. simulate strategic state without pretending to simulate every combat interaction;
2. validate whether proposed builds are mechanically and economically possible;
3. discover unusual but legal strategies;
4. compare counterfactual decisions;
5. measure plan fragility;
6. generate training scenarios;
7. identify recurring misconceptions;
8. sequence an adaptive curriculum;
9. attach proof and uncertainty to recommendations;
10. migrate policies across patches;
11. audit conflicts between sources;
12. validate community strategy packs;
13. generate synthetic match histories;
14. render tactical narratives and SVG diagrams;
15. measure and reduce the cognitive load created by the application itself.

The runtime is not a second coach. It is a scientific service layer beneath the existing Mission, Policy, Intel, Permission, Obligation, and Decision objects.

## 2. Non-negotiable architecture boundaries

### 2.1 One source of strategic truth

The Strategic OS remains authoritative.

```text
Strategic OS event log
        ↓
Canonical match state
        ↓
Python advisory request
        ↓
Python advisory result
        ↓
Strategic OS validates and accepts/rejects
        ↓
Attention governor decides whether to display or speak
```

Python must not independently mutate live Mission, Policy, Intel, Permission, Obligation, or Decision state.

### 2.2 Advisory, not omniscient

Every Python result must distinguish:

- **game rule** — fixed or patch-versioned mechanics;
- **player report** — facts explicitly supplied by the player;
- **replay fact** — optional postgame evidence;
- **inference** — a reasoned but uncertain conclusion;
- **simulation** — output of a simplified model;
- **hypothesis** — an unverified candidate explanation.

No inference or simulation may be presented as a player-confirmed fact.

### 2.3 Live cognitive-load contract

No Python capability receives a permanent live panel.

All live output must reduce to:

```text
ONE QUESTION
ONE ACTION
ONE REASON
MAXIMUM THREE UPCOMING WINDOWS
```

A Python capability may also recommend silence.

### 2.4 Patch and model versioning

Every run records:

- StarCraft II patch;
- ruleset version;
- model name and version;
- input event-log sequence;
- random seed, when stochastic;
- source/provenance identifiers;
- assumptions;
- confidence and uncertainty;
- execution duration.

A result without patch provenance is not eligible for live use.

### 2.5 Offline-first and local privacy

The first production implementation must work locally.

- SQLite stores strategic research data.
- Voice models and strategy models remain on the player’s machine.
- Raw microphone audio is not retained by default.
- Web-ingested knowledge is staged for human approval before it enters the policy library.
- Optional network integrations must be feature-flagged and explicit.

## 3. System context

```text
┌────────────────────────────────────────────────────────────┐
│                    WEBVIEW / JAVASCRIPT                    │
│                                                            │
│ Mission Control · War Room · Command Surface               │
│ Strategic OS event log · Attention Governor                │
│ Quick Intel · Voice UI · Existing Strategy Compiler        │
└──────────────────────────────┬─────────────────────────────┘
                               │ localhost JSON API
                               │ immutable request envelopes
┌──────────────────────────────▼─────────────────────────────┐
│              PYTHON STRATEGY SCIENCE RUNTIME               │
│                                                            │
│ Contracts · Digital Twin · Constraint Solver               │
│ Policy Graph · Counterfactuals · Discovery                 │
│ Fragility · Scenarios · Learning · Knowledge Governance    │
│ Narrative Rendering · Cognitive Optimization               │
└──────────────────────────────┬─────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────┐
│                    LOCAL PERSISTENCE                       │
│                                                            │
│ SQLite · source snapshots · model runs · policy candidates │
│ scenarios · mastery · calibration · research experiments   │
└────────────────────────────────────────────────────────────┘
```

## 4. Runtime topology

### Phase A — In-process Flask service

The initial runtime is imported by the existing local Flask application.

Advantages:

- lowest packaging complexity;
- no second process;
- direct access to the existing local storage directory;
- easy API integration;
- simpler PyInstaller packaging.

Rules:

- CPU-heavy work runs in a bounded worker pool;
- every task has a timeout;
- live requests have strict latency budgets;
- long-running discovery jobs are explicitly user-initiated;
- cancellation tokens are mandatory.

### Phase B — Dedicated local worker

Move discovery, batch simulation, patch migration, and knowledge ingestion into a separate local process when workloads justify isolation.

Use a small IPC contract:

```text
Flask/UI process
    ↕ localhost / named pipe
Python Strategy Science worker
```

The browser never speaks directly to the worker.

## 5. Package architecture

```text
python_strategy_science/
├── __init__.py
├── contracts.py
├── capability_registry.py
├── invariants.py
├── service.py
├── errors.py
│
├── schemas/
│   └── strategy-science.schema.json
│       ├── advisory_request
│       ├── advisory_output
│       ├── proof
│       ├── digital_twin_state
│       ├── candidate_policy
│       ├── counterfactual_result
│       ├── fragility_result
│       ├── scenario
│       ├── misconception_hypothesis
│       ├── curriculum_assignment
│       ├── patch_migration_report
│       ├── knowledge_conflict_report
│       ├── strategy_pack
│       ├── synthetic_session
│       ├── invariant_report
│       ├── narrative_bundle
│       ├── cognitive_recommendation
│       └── acceptance_case
│
├── rules/
│   ├── catalog.py
│   ├── patch_registry.py
│   ├── prerequisites.py
│   ├── production.py
│   ├── economy.py
│   └── invariants.py
│
├── twin/
│   ├── state.py
│   ├── reducer.py
│   ├── economy_model.py
│   ├── production_model.py
│   └── uncertainty.py
│
├── planning/
│   ├── feasibility.py
│   ├── build_surgery.py
│   ├── policy_graph.py
│   ├── discovery.py
│   ├── counterfactual.py
│   └── fragility.py
│
├── simulation/
│   ├── red_team.py
│   ├── synthetic_matches.py
│   ├── sampling.py
│   └── robustness.py
│
├── learning/
│   ├── misconception.py
│   ├── curriculum.py
│   ├── mastery.py
│   └── calibration.py
│
├── knowledge/
│   ├── ingestion.py
│   ├── claim_graph.py
│   ├── conflict_audit.py
│   ├── patch_migration.py
│   ├── strategy_pack.py
│   └── provenance.py
│
├── narrative/
│   ├── tactical_story.py
│   ├── svg_renderer.py
│   ├── timeline.py
│   └── explanation_levels.py
│
├── cognition/
│   ├── metrics.py
│   ├── cue_optimizer.py
│   ├── interrupt_budget.py
│   └── experiments.py
│
└── storage/
    ├── database.py
    ├── migrations.py
    ├── repositories.py
    └── schema.sql
```

The design pack commits only the contracts, registry, schemas, acceptance manifest, documentation, and architecture tests. Runtime modules are delivered by the backlog slices.

## 6. Shared request envelope

Every Python request must use a common envelope.

```json
{
  "request_id": "uuid",
  "capability_id": "digital_twin",
  "patch": "5.0.16b",
  "ruleset_version": "rules-2026-08-19",
  "model_version": "digital-twin-0.1.0",
  "session_id": "session-id",
  "event_sequence": 284,
  "mission": {},
  "policy": {},
  "intel": [],
  "permissions": [],
  "obligations": [],
  "decision": {},
  "parameters": {},
  "seed": 4172
}
```

Requirements:

- inputs are immutable;
- the event sequence identifies the canonical state snapshot;
- patch and ruleset are required;
- stochastic models require an explicit seed;
- capabilities cannot read unrelated process memory.

## 7. Shared advisory output

All capabilities emit the same outer contract.

```json
{
  "advisory_id": "uuid",
  "capability_id": "attack_hazard",
  "status": "complete",
  "state_authority": "strategic_os",
  "output_mode": "advisory",
  "patch": "5.0.16b",
  "model": {
    "name": "attack-hazard",
    "version": "0.2.0"
  },
  "question": "Is the Terran army moving out?",
  "action": "Delay the third until movement is renewed.",
  "reason": "The earliest credible arrival overlaps your defensive readiness.",
  "future_windows": [],
  "confidence": {
    "band": "moderate",
    "score": 0.67
  },
  "proof": {},
  "assumptions": [],
  "uncertainties": [],
  "expires_at_game_second": 248,
  "recommend_silence": false
}
```

The Strategic OS may reject an advisory when:

- its event sequence is stale;
- its patch differs from the session;
- proof is incomplete;
- the result violates the cognitive-load contract;
- it attempts to claim state authority;
- it conflicts with a higher-priority deterministic safety rule.

## 8. Evidence and trust model

| Evidence class | Example | May become live fact? |
|---|---|---|
| `game_rule` | Gateway prerequisite | Yes, when patch-matched |
| `player_report` | “Three Barracks” | Yes, as reported evidence |
| `replay_fact` | Actual third Nexus timing | Yes, postgame only |
| `source_claim` | Guide recommends a timing | No; requires validation |
| `inference` | Pressure is more likely | No; display as inference |
| `simulation` | Earliest credible arrival | No; display as model result |
| `hypothesis` | Player misconception | No; requires corroboration |

Every proof item points to one or more evidence references.

## 9. Persistence model

SQLite is the canonical Python-side store.

Core tables:

- `science_model_versions`
- `science_runs`
- `science_run_inputs`
- `science_proof_items`
- `twin_snapshots`
- `candidate_policies`
- `counterfactual_results`
- `fragility_results`
- `generated_scenarios`
- `player_concept_observations`
- `misconception_hypotheses`
- `curriculum_assignments`
- `knowledge_sources`
- `knowledge_claims`
- `knowledge_conflicts`
- `patch_migrations`
- `strategy_packs`
- `synthetic_sessions`
- `cognitive_metrics`
- `cognitive_experiments`

Retention:

- raw audio: disabled by default;
- transcripts: optional, user-controlled;
- model inputs/outputs: retained for reproducibility;
- web source snapshots: retained with checksum and acquisition date;
- replay-derived rows: reference local case IDs rather than duplicate replay bytes.

## 10. API surface

### Health and capabilities

```text
GET  /api/science/health
GET  /api/science/capabilities
GET  /api/science/models
```

### Advisory execution

```text
POST /api/science/run
GET  /api/science/runs/<run_id>
POST /api/science/runs/<run_id>/cancel
```

### Digital twin and planning

```text
POST /api/science/twin/build
POST /api/science/policies/validate
POST /api/science/policies/discover
POST /api/science/policies/counterfactual
POST /api/science/policies/fragility
```

### Training

```text
POST /api/science/scenarios/generate
POST /api/science/scenarios/<id>/answer
GET  /api/science/curriculum/next
```

### Knowledge governance

```text
POST /api/science/knowledge/ingest
POST /api/science/knowledge/audit
POST /api/science/patches/migrate
POST /api/science/strategy-packs/validate
```

### Narrative and cognition

```text
POST /api/science/narrative/render
POST /api/science/cognition/record
GET  /api/science/cognition/recommendation
```

## 11. Capability architecture

### 11.1 Strategic Digital Twin

**Purpose:** maintain a lightweight strategic simulation of economy, supply, production, prerequisites, technology, and timing.

**Inputs**

- canonical mission/policy snapshot;
- patch rules;
- build windows;
- reported evidence;
- uncertainty ranges.

**Models**

- event-driven resource ledger;
- producer occupancy schedule;
- supply constraints;
- prerequisite graph;
- expansion payback approximation;
- bounded opponent-state ranges.

**Outputs**

- twin snapshot;
- feasible/infeasible timing ranges;
- resource and production envelopes;
- unresolved assumptions;
- proof object.

**Failure mode**

The twin may be strategically useful while still omitting micro, positioning, and combat variance. Its output must never be described as a complete game simulation.

### 11.2 Automated Strategy Discovery

**Purpose:** search legal build and policy space for uncommon plans satisfying a stated mission and constraints.

**Inputs**

- mission;
- player constraints;
- allowed units/technologies;
- required threat coverage;
- novelty target;
- digital-twin evaluator.

**Methods**

- constraint-guided search;
- beam search;
- evolutionary mutation;
- CP-SAT candidate scheduling;
- Pareto ranking.

**Outputs**

- candidate policies;
- feasibility proof;
- robustness, novelty, execution-load, and information-load scores;
- nearest standard comparison;
- rejection reasons.

**Safety**

A candidate remains `experimental` until mechanically valid, scenario-robust, and human approved.

### 11.3 Counterfactual Decision Lab

**Purpose:** compare alternative decisions from the same canonical state.

**Inputs**

- state snapshot;
- decision point;
- alternatives;
- evaluation horizon.

**Outputs**

- economic delta;
- safety delta;
- capability delta;
- new obligations;
- changed attack windows;
- uncertainty.

**Constraint**

The system says “under this simplified model” rather than “this would have happened.”

### 11.4 Strategy Fragility Analyzer

**Purpose:** determine which timings, units, scouts, and assumptions are sensitive.

**Methods**

- one-variable-at-a-time perturbation;
- local sensitivity;
- Monte Carlo perturbation;
- branch-boundary analysis.

**Outputs**

- critical dependencies;
- tolerant timings;
- brittle timings;
- invalidation thresholds;
- recommended guardrails.

### 11.5 Procedural Scenario Academy

**Purpose:** generate decision drills from policies and opponent branches.

**Scenario anatomy**

- mission;
- policy;
- clock;
- evidence sequence;
- stale/contradictory facts;
- current question;
- candidate actions;
- expected reasoning;
- rubric;
- concept tags.

**Output constraint**

Every scenario has at least one valid rationale, an uncertainty statement, and a reason why tempting alternatives fail.

### 11.6 Misconception Detector

**Purpose:** infer repeated incorrect beliefs behind player choices.

**Inputs**

- scenario answers;
- live decisions;
- confidence ratings;
- optional replay audit;
- prior teaching interventions.

**Outputs**

- misconception hypothesis;
- supporting and contradicting observations;
- confidence;
- alternative explanations;
- one corrective principle;
- required corroboration count.

**Safety**

A misconception is never treated as a diagnosis of the player. It is a revisable hypothesis about a decision pattern.

### 11.7 Adaptive Curriculum Planner

**Purpose:** choose the next concept and practice block.

**Inputs**

- concept graph;
- mastery observations;
- misconception hypotheses;
- mission preferences;
- recent fatigue/cognitive metrics.

**Outputs**

- next concept;
- prerequisites;
- five-game or scenario block;
- pass condition;
- coach verbosity;
- graduation rule.

### 11.8 Proof-Carrying Recommendations

**Purpose:** attach a machine-readable explanation to every advisory.

**Proof includes**

- evidence references;
- rule references;
- assumptions;
- uncertainty;
- model limitations;
- expiration;
- fallback;
- conflicting evidence.

A recommendation without proof cannot enter the Command Surface.

### 11.9 Patch Migration Compiler

**Purpose:** determine which rules, policies, timings, scenarios, and model calibrations are affected by a patch.

**Pipeline**

```text
Patch diff
  → rule dependency graph
  → affected policy set
  → re-simulation
  → status: current / review / stale / invalid
  → migration report
```

**Output**

- affected artifacts;
- impact explanation;
- automatic updates that are safe;
- required human reviews;
- before/after timing deltas.

### 11.10 Knowledge Conflict Auditor

**Purpose:** identify when sources disagree and expose the assumptions causing the disagreement.

**Inputs**

- normalized source claims;
- patch/date;
- build context;
- player level;
- risk;
- map/matchup conditions.

**Outputs**

- claim clusters;
- true contradiction versus contextual difference;
- unresolved conflicts;
- preferred evidence;
- questions required for reconciliation.

### 11.11 Strategy Pack Validator

**Purpose:** safely import community-authored strategy packs.

**Validation gates**

- JSON/YAML schema;
- patch declaration;
- prerequisites;
- resource/supply feasibility;
- branch coverage;
- fallbacks;
- unsupported claims;
- cognitive-load limits;
- provenance;
- unsafe code rejection.

Strategy packs are data-only. Arbitrary Python or JavaScript execution is forbidden.

### 11.12 Synthetic Match Generator

**Purpose:** generate internally consistent event streams for testing and training.

**Outputs**

- canonical event log;
- expected Strategic OS snapshots;
- expected permission transitions;
- expected advisory decisions;
- seed and generation recipe.

Synthetic sessions are visibly labeled and never mixed with real player performance.

### 11.13 Formal Rule and Invariant Testing

**Purpose:** prove the system does not produce contradictory or unsafe advice.

Required invariants include:

- every `ABORT` state has a fallback;
- expansion cannot be `OPEN` during a fresh move-out;
- workers cannot remain `CONTINUE` during an immediate survival override;
- stale evidence cannot be labeled fresh;
- unsupported policies cannot be labeled verified;
- prerequisites must exist before production;
- no live advisory has more than one question, one action, one reason, or three windows;
- inference never becomes reported fact;
- Python never owns canonical state.

### 11.14 Tactical Narrative and SVG Generator

**Purpose:** render one policy into consistent teaching artifacts.

Outputs:

- War Room story;
- short Command Surface rationale;
- SVG tactical diagram;
- timing ribbon;
- decision tree;
- printable cheat sheet;
- 16:9 visual;
- accessible text alternative.

The renderer uses original vector primitives and race-inspired assets; it does not redistribute official Blizzard artwork.

### 11.15 Cognitive-Load Optimizer

**Purpose:** measure whether the application helps or distracts.

Metrics:

- cues per minute;
- time to respond;
- prompt dismissals;
- repeated explanation opens;
- cue collision;
- live-word count;
- Quick Intel selection time;
- correction rate;
- post-cue decision accuracy;
- silence effectiveness.

Outputs:

- timing recommendation;
- phrase-length recommendation;
- button ordering;
- cue suppression;
- preferred modality;
- experimental confidence.

The optimizer may recommend silence. It may not silently alter emergency thresholds.

## 12. Capability dependency graph

```text
Contracts + provenance + SQLite
        ↓
Formal rules
        ↓
Strategic Digital Twin
        ├── Counterfactual Lab
        ├── Fragility Analyzer
        ├── Synthetic Match Generator
        └── Automated Strategy Discovery
                ↓
        Red-team / robustness evaluation
                ↓
Procedural Scenario Academy
        ├── Misconception Detector
        └── Adaptive Curriculum
Knowledge ingestion
        ├── Conflict Auditor
        ├── Patch Migration
        └── Strategy Pack Validator
Proof-Carrying Recommendations spans every capability
Narrative Generator consumes policy/scenario outputs
Cognitive Optimizer consumes interaction outcomes
```

## 13. Performance budgets

| Workload | Budget |
|---|---:|
| Live deterministic advisory | 50 ms target, 150 ms hard |
| Permission-support calculation | 30 ms target |
| Digital-twin incremental update | 100 ms target |
| Single counterfactual | 500 ms target |
| Fragility analysis | 5 s interactive |
| Scenario generation | 2 s interactive |
| Strategy-pack validation | 10 s |
| Discovery experiment | background, cancellable |
| Patch migration | background batch |
| SVG narrative | 1 s target |

If a live Python request exceeds its hard budget, the Strategic OS uses deterministic JavaScript rules and records the timeout.

## 14. Error and fallback policy

Every capability returns one of:

- `complete`
- `partial`
- `unsupported`
- `timeout`
- `cancelled`
- `invalid_input`
- `model_unavailable`
- `patch_mismatch`

No Python exception may cross the API boundary unstructured.

The UI receives:

- stable error code;
- user-safe message;
- operator detail;
- fallback recommendation;
- retryability.

## 15. Security and trust

- Strategy packs are parsed as data only.
- SVG output is sanitized before display.
- Web ingestion runs with explicit URL allowlists and size limits.
- SQLite queries are parameterized.
- Model files are checksum-verified.
- No raw audio retention by default.
- Every external source stores acquisition date and checksum.
- Every generated candidate is clearly marked `experimental`.
- Patch mismatch prevents live promotion.
- Long-running jobs are cancellable.
- Python endpoints bind only to the local app service.

## 16. Observability

Each model run records:

- run ID;
- capability;
- input hash;
- event sequence;
- patch;
- model version;
- seed;
- duration;
- status;
- warnings;
- proof count;
- output hash;
- accepted/rejected by Strategic OS;
- whether shown, spoken, deferred, or suppressed.

A local diagnostic screen may expose this in Advanced mode. It must not appear on the Command Surface.

## 17. Feature flags

Each capability is independently gated:

```text
science.digital_twin
science.discovery
science.counterfactual
science.fragility
science.scenarios
science.misconceptions
science.curriculum
science.proof
science.patch_migration
science.conflict_audit
science.strategy_packs
science.synthetic_matches
science.invariants
science.narrative
science.cognitive_optimizer
```

Default rollout:

- development: enabled selectively;
- packaged beta: proof, invariants, twin read-only;
- stable: only capabilities meeting their acceptance gate.

## 18. Release phases

### Phase 0 — Contracts and governance

Deliver:

- package skeleton;
- schemas;
- capability registry;
- SQLite schema;
- acceptance manifest;
- architecture tests.

### Phase 1 — Rules and Digital Twin

Deliver:

- patch registry;
- production/economy rules;
- twin state;
- deterministic feasibility;
- proof output.

### Phase 2 — Counterfactuals and fragility

Deliver:

- alternative-decision comparison;
- sensitivity analysis;
- timing criticality.

### Phase 3 — Discovery and simulation

Deliver:

- candidate mutation;
- constrained search;
- red-team scenarios;
- synthetic sessions.

### Phase 4 — Teaching science

Deliver:

- scenario academy;
- misconception hypotheses;
- adaptive curriculum.

### Phase 5 — Knowledge governance

Deliver:

- ingestion staging;
- conflict audit;
- patch migration;
- strategy-pack validation.

### Phase 6 — Narrative and cognition

Deliver:

- SVG/timeline generation;
- cognitive metrics;
- cue experiments;
- optimizer recommendations.

## 19. Definition of done for any Python capability

A capability is not done until:

1. it is registered;
2. request and response schemas exist;
3. patch provenance is enforced;
4. deterministic tests exist;
5. uncertainty is explicit;
6. proof is attached;
7. negative and timeout tests exist;
8. it cannot mutate Strategic OS state;
9. it satisfies the live cognitive-load contract;
10. it has a feature flag;
11. it records model-run metadata;
12. it has a documented fallback;
13. it passes Windows packaging;
14. it has an operator diagnostic;
15. its user-facing language avoids certainty beyond evidence.

## 20. Immediate implementation slice

The recommended first build is:

```text
PSS-000 Shared contracts and schemas
PSS-010 SQLite run/provenance store
PSS-020 Formal rule catalog
PSS-030 Digital Twin vertical slice
PSS-040 Proof-Carrying Advisory output
PSS-050 Strategic OS acceptance adapter
```

This slice creates one end-to-end transaction:

```text
Canonical PvT three-base state
        ↓
Python Digital Twin request
        ↓
Feasibility + threat-range advisory
        ↓
Proof and uncertainty
        ↓
Strategic OS validates
        ↓
War Room explanation
        ↓
Command Surface remains one question/action/reason
```

That transaction proves the architecture without attempting all fifteen capabilities at once.
