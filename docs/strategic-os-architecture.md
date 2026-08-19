# SC2 Master Coach — Strategic OS Architecture

## Product rule

The Strategic OS maintains the strategic truth of a match while exposing only the decision currently deserving the player's attention.

The Command Surface is constrained to:

```text
ONE QUESTION
ONE ACTION
ONE REASON
MAXIMUM THREE UPCOMING WINDOWS
```

Replay remains an optional after-action audit. The live operating system must be useful without replay parsing or direct access to the StarCraft II process.

## Canonical objects

The first Strategic Kernel slice derives six canonical objects from the event-sourced Strategy Compiler state:

1. **Mission** — matchup, intended outcome, risk, coaching style, and player constraints.
2. **Policy** — selected executable strategy, status, capabilities, source, and fallback.
3. **Intel** — active player-reported evidence with confidence, age, and expiration.
4. **Permission** — whether expansion, technology, attack, worker production, and harassment are currently legal.
5. **Obligation** — responsibilities created by the selected economic, technological, or military investment.
6. **Decision** — the single current question, action, reason, confidence, and up to three future windows.

The kernel also exposes assumptions, threats, a `NOW / SOON / NOT YET` scheduler, and event metadata.

## Runtime pipeline

```text
Mission Control
      ↓
Strategy Compiler / event log
      ↓
Strategic Kernel
      ↓
Mission + Policy + Intel
      ↓
Permission + Obligation
      ↓
Decision + Strategic Scheduler
      ↓
War Room or Command Surface
```

## Mission Control

Mission Control captures:

- player race;
- opponent race;
- strategic goal;
- safe, balanced, or greedy risk;
- coaching style;
- skill level;
- execution constraints such as low spellcaster micro, stable-ground preference, mobility preference, or avoiding multi-prong play.

The main action is **Compile Operation**.

## War Room

The War Room is the deep planning surface. It presents:

- mission and policy summary;
- battle story;
- operation windows;
- assumption ledger;
- threat model;
- permission matrix;
- obligation ledger;
- `NOW / SOON / NOT YET` scheduler;
- safer and greedier policy variants;
- original race-inspired SVG artwork.

Manual confirmations are explicit because the application cannot observe army coverage, reinforcement access, retreat geometry, or execution completion live.

## Command Surface

The Command Surface is the low-cognitive-load live interface. It shows:

- current policy state: `CONTINUE`, `MODIFY`, `HOLD`, or `ABORT`;
- one current question;
- one current action;
- one reason;
- the highest-priority permission;
- no more than three future windows;
- one active obligation;
- Quick Intel inputs;
- optional constrained voice input;
- a collapsible view of secondary permissions.

Replay analytics, source registries, doctrine essays, and detailed telemetry are deliberately absent from this surface.

## Permission engine

The initial deterministic permission model maintains:

- **Expansion:** `OPEN / CAUTION / HOLD`
- **Technology:** `OPEN / CAUTION / HOLD`
- **Attack:** `OPEN / CAUTION / HOLD`
- **Workers:** `CONTINUE / CAUTION / COMPRESS`
- **Harassment:** `ACTIVE / LIMITED / DISENGAGE`

Permissions are driven by current mission, policy state, and unexpired evidence such as a normal natural, no natural, extra production, hidden technology, fast third, turtle posture, or move-out.

## Obligation engine

Every strategic goal maps to responsibilities. Examples:

### Three-base economy

- fresh threat and production read;
- reinforcement access;
- army coverage;
- production conversion;
- retreat plan.

### Stable ground army

- frontline screen;
- vision;
- retreat geometry;
- counter monitoring.

### Early pressure

- credible threat;
- exit plan;
- follow-up investment;
- counterattack coverage.

The user may confirm obligations manually. Optional replay analysis may later validate them.

## Not Yet scheduler

The scheduler divides decisions into:

```text
NOW
SOON
NOT YET
```

`NOT YET` explicitly authorizes the player to defer real future decisions until they become relevant. This is a cognitive-load feature, not a claim that those decisions do not matter.

## Evidence boundary

The Strategic OS knows live:

- selected races and mission;
- compiled policy;
- manually synchronized time;
- player-reported Quick Intel or voice evidence;
- strategy rules and current-patch knowledge.

It does not know live:

- exact resources;
- exact army locations;
- current camera position;
- production counts unless reported;
- whether a prompted action was executed;
- fog-of-war truth.

Inferences are never displayed as player-confirmed facts.

## Voice adapter

The voice adapter remains constrained to supported tactical phrases. The v1.9 surface reports exact microphone errors instead of swallowing them:

- speech API unavailable;
- permission denied;
- no audio capture device;
- speech service unavailable;
- no speech detected;
- synchronous microphone startup failure.

Quick Intel buttons remain the dependable zero-cost fallback.

## Secondary modes

The Strategic OS is the default application mode. It preserves explicit routes to:

- **Strategy Compiler** — the v1.8 policy-compilation interface;
- **2v2 Operations** — Team Composer;
- **Advanced** — PRO MIND, Spellbook, replay intelligence, Player POV / Observer Truth, and full telemetry.

## Extension seams

The kernel is designed to accept future advisory models without granting each model permanent live screen space:

- temporal build feasibility;
- economic opportunity cost;
- enemy production envelope;
- attack-arrival estimates;
- map influence fields;
- scouting value of information;
- transition detection;
- counter-adaptation forecasts;
- deception and red-team analysis;
- regret-minimizing policy selection;
- force design;
- shared 2v2 operation state.

The attention governor—not the model—decides whether an output deserves the player's screen or voice channel.
