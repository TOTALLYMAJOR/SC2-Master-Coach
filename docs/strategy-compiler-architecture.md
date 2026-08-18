# Strategy Compiler Architecture

## Product constraint

The live coach must reduce cognitive load and increase strategic understanding.

Every live output is constrained to:

```text
ONE QUESTION
ONE ACTION
ONE REASON
MAXIMUM THREE UPCOMING WINDOWS
```

Replay analysis is secondary validation. The live system must remain useful without replay parsing or direct SC2 process integration.

## Runtime pipeline

```text
Setup / voice / quick intel / timer
                ↓
             Event log
                ↓
            State reducer
                ↓
        Active evidence set
                ↓
        Declarative branch rules
                ↓
          Compiled plan state
                ↓
         Teaching adaptation
                ↓
          Attention scheduler
                ↓
            Coach output
```

## Event contracts

Current browser events include:

- `match.configured`
- `strategy.compiled`
- `strategy.variant_selected`
- `session.started`
- `session.paused`
- `session.resumed`
- `clock.set`
- `evidence.reported`
- `evidence.retracted`
- `evidence.cleared`
- `plan.evaluated`
- `voice.pending`
- `voice.cleared`
- `mastery.updated`
- `attention.cue_queued`
- `attention.cue_spoken`

The event list is persisted locally. `replayEvents()` reconstructs state from an event sequence for deterministic debugging and future model comparisons.

## Evidence boundary

Every evidence item records:

- evidence type;
- subject;
- source;
- observed game second;
- recognition confidence where applicable;
- strategic confidence;
- freshness/expiry;
- active/retracted state.

Speech-recognition confidence is not strategic confidence. Correctly hearing “Reaper” does not prove a Reaper all-in.

## Voice grammar

The first voice implementation is constrained and deterministic. Examples:

- race: `Protoss`, `Terran`, `Zerg`;
- observations: `Reaper`, `Natural`, `No natural`, `Fast third`, `Three Barracks`, `Factory`, `Starport`, `Move out`, `Turtle`, `Hidden tech`;
- questions: `Can I still expand?`, `Why?`, `What next?`;
- plan control: `Safer plan`, `Greedier plan`;
- timer control: `Pause coach`, `Resume coach`.

Ambiguous or high-impact observations require confirmation before mutating plan state.

## Strategy data

Each compiled strategy includes:

- current patch and compiler data version;
- matchup and strategic objective;
- risk classification;
- battle story;
- capabilities purchased;
- assumptions;
- punish routes;
- purposeful scouting questions;
- tolerant build windows;
- declarative branch rules;
- safer and greedier alternatives;
- source/provenance statement.

## Plan states

- `continue`: current route remains valid;
- `modify`: preserve the goal, but change timing or immediate spending;
- `hold`: pause the intended commitment while resolving an immediate threat or information gap;
- `abort`: the current implementation's required assumption is invalid; load a fallback.

Fallbacks should preserve the player's original goal whenever survival permits.

## Teaching model

Concept mastery is stored for strategic concepts such as:

- production scouting;
- information expiration;
- expansion permission;
- attack windows;
- opportunity cost;
- army preservation;
- reinforcement geometry;
- technology transition;
- map control;
- counter-adaptation.

Teaching levels:

```text
Tell → Prompt → Question → Hint → Silent
```

Emergency and plan-invalidation cues always remain direct.

## Attention policy

Initial priority order:

```text
100  Survival emergency
90   Plan invalidation / hold
75   Plan modification
55   Scheduled/current action
35   Teaching prompt
```

Routine voice cues are rate-limited and deduplicated. Emergency cues bypass the routine cooldown.

## Visual and interaction policy

- Strategy Compiler is the default mode.
- 2v2 Team Composer and Advanced Command Center remain available through explicit CTAs.
- Original race-inspired SVG illustrations are self-contained and stored under `static/artwork/`.
- Official Blizzard art, logos, and packaged game assets are not redistributed.
- Major workflow decisions use text CTAs rather than icon-only controls.
- Every complex concept has hover help or a click-open explanation.
- Live mode does not expose source registries, replay telemetry, or full doctrine panels unless the player deliberately opens Advanced mode.

## Extension seams for advanced models

Future models should consume the same event/evidence state and return advisory output rather than creating separate live panels:

1. temporal build feasibility;
2. economic opportunity cost;
3. enemy production envelope;
4. attack arrival and interception;
5. map influence fields;
6. scouting value of information;
7. opponent transition detection;
8. counter-adaptation forecasting;
9. deception/information warfare;
10. robustness/regret-minimizing plan selection.

The attention scheduler decides whether any model output deserves the player's screen or voice channel.
