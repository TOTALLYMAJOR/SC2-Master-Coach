# SC2 Master Coach — Strategic OS

**Created by MBMapps**

SC2 Master Coach is a local-first StarCraft II strategy operating system built around one goal:

> **Maintain the strategic truth of the match so the player can focus on execution.**

The application does not need direct access to the live game to provide useful real-time guidance. The player states the mission, the system compiles a policy from documented rules and matchup knowledge, and the player reports only the few observations that change the operation.

The default workflow is now:

```text
MISSION CONTROL
Race + opponent + objective + risk + constraints
        ↓
WAR ROOM
Policy + assumptions + threats + permissions + obligations
        ↓
COMMAND SURFACE
One question + one action + one reason + three windows
        ↓
QUICK INTEL
Report only decision-changing facts
        ↓
TRANSITION
Continue / Modify / Hold / Abort / Fallback
        ↓
AFTER ACTION
Player debrief + optional replay validation
```

The strategy baseline targets **StarCraft II 5.0.16b**, including the eight-worker economy introduced in 5.0.16 and the later 5.0.16b hotfix. Timing windows are coaching benchmarks rather than proof that an in-game action occurred. Scouting evidence outranks a memorized script.

Official patch reference: <https://news.blizzard.com/en-us/article/24291949/starcraft-ii-5-0-16b-hotfix-patch-notes>

## Release notes

### v1.9.0 — Strategic OS

- Promoted the application from a Strategy Compiler interface into a **Strategic Operating System**.
- Added six canonical strategic objects:
  - **Mission** — what the player is trying to create;
  - **Policy** — the executable route;
  - **Intel** — player-reported, confidence-scored, expiring evidence;
  - **Permission** — which investments are currently legal;
  - **Obligation** — responsibilities created by the mission and policy;
  - **Decision** — the one question, action, and reason that deserves attention now.
- Added **Mission Control** as the default first screen.
- Added player constraints and doctrine preferences:
  - simpler execution;
  - low spellcaster micro;
  - stable-ground preference;
  - mobility preference;
  - avoid multi-prong;
  - information-first play.
- Added the **War Room** planning surface with:
  - original race-inspired SVG artwork;
  - mission and policy summaries;
  - operational story;
  - build windows;
  - assumption ledger;
  - threat model;
  - permission matrix;
  - obligation ledger;
  - safer and greedier policy variants;
  - manual confirmation for facts the application cannot observe live.
- Added the **Command Surface** for real-time use.
- Enforced the live cognitive-load contract:

```text
ONE QUESTION
ONE ACTION
ONE REASON
MAXIMUM THREE UPCOMING WINDOWS
```

- Added a deterministic Permission Engine:
  - expansion: `OPEN / CAUTION / HOLD`;
  - technology: `OPEN / CAUTION / HOLD`;
  - attack: `OPEN / CAUTION / HOLD`;
  - workers: `CONTINUE / CAUTION / COMPRESS`;
  - harassment: `ACTIVE / LIMITED / DISENGAGE`.
- Added an Obligation Engine for every strategic objective.
- Added the **NOW / SOON / NOT YET** scheduler.
- Added Quick Intel controls directly to the Command Surface.
- Added explicit microphone diagnostics instead of silently swallowing voice-start errors.
- Preserved Strategy Compiler, 2v2 Team Composer, PRO MIND, Spellbook, replay intelligence, and Advanced Command Center as secondary modes.
- Replay remains an optional after-action audit rather than the primary workflow.

### v1.8.1 — Readability and Spacing Pass

- Increased the Strategy Compiler's default type scale throughout setup, plan review, live coaching, Quick Intel, hover help, and workflow modals.
- Raised routine button and selector targets to a minimum comfortable height of 44 pixels.
- Rebalanced desktop and responsive spacing.

### v1.8.0 — Strategy Compiler

- Added a goal-first 1v1 Strategy Compiler across all nine matchups.
- Added current-patch plans, assumptions, punish routes, scouting questions, fallbacks, and constrained voice input.
- Added `CONTINUE / MODIFY / HOLD / ABORT` plan states.

### v1.7.0 — Team Composer

- Added four-race 2v2 setup, ten role-based team operations, battle stories, timing windows, and a minimal team live coach.

### v1.6.x — PRO MIND

- Added professional questions, scouting purpose, capability branches, expansion permission, information age, investment protection, hover help, and battle stories.

### v1.5.x and earlier

- Added Coach Lab / Spellbook, personal strategy effectiveness, strategy evolution, replay narratives, replay identity, actual local SC2 Player POV / Observer Truth rendering, build cues, snapshots, installer support, and replay discovery.

## Install on Windows

Download the latest release assets:

- **`SC2-Master-Coach-Setup.exe`** — recommended
- **`SC2-Master-Coach-Portable.zip`** — no-install alternative

The installer:

- installs per-user under `%LOCALAPPDATA%\Programs\SC2 Master Coach`;
- creates desktop and Start Menu shortcuts;
- installs WebView2 when required;
- registers uninstall support;
- associates `.SC2Replay` files with SC2 Master Coach.

The application is unsigned under the zero-cost release constraint, so Windows SmartScreen can initially display **Unknown Publisher**.

# Strategic OS workflow

## 1. Mission Control

Select:

- your race;
- opponent race;
- strategic mission;
- safe, balanced, or greedy risk;
- coach style;
- skill level;
- execution constraints.

Available missions include:

```text
Expand safely
Get three bases
Balanced macro
Pressure early
Hit a timing
Control the air
Build a strong ground army
Control the map
Defend and scale
Surprise the opponent
```

The main action is:

> **COMPILE OPERATION**

## 2. War Room

The War Room explains the complete operation before the match.

It shows:

```text
MISSION
What outcome the player wants

POLICY
The current executable route

INTEL
What is known, reported, fresh, aging, or missing

PERMISSION
Which investments are currently legal

OBLIGATION
What the operation must protect or maintain

DECISION
The current question, action, reason, and confidence
```

The War Room also contains:

- battle story;
- operation windows;
- assumptions;
- opponent punish routes;
- safer and greedier variants;
- manual confirmations;
- permission matrix;
- obligation list;
- `NOW / SOON / NOT YET` scheduler.

## 3. Command Surface

The Command Surface is the live interface.

It deliberately excludes replay analytics, full doctrine tables, source registries, and dense telemetry.

It displays:

```text
PLAN STATE
CONTINUE / MODIFY / HOLD / ABORT

ONE QUESTION
The fact that matters before the next decision

DO NOW
The current action

WHY
The strategic reason

PRIMARY PERMISSION
The highest-priority legality check

NEXT
No more than three upcoming windows
```

## 4. Quick Intel

The Strategic OS does not read the live SC2 process.

The player reports important observations through large buttons or constrained voice phrases:

```text
Reaper
Normal natural
No natural
Fast third
Extra production
Factory
Starport
Move-out
Turtle
Hidden tech
```

Each report records:

- observation type;
- source;
- game time;
- confidence;
- freshness and expiry.

Old information is not treated as permanently true.

# Canonical strategic objects

## Mission

The outcome the player is trying to create.

Example:

```text
Protoss vs Terran
Mission: three-base economy
Risk: balanced
Doctrine: information first, stable ground preference
```

## Policy

The executable route selected for the mission.

Example:

```text
Information-First Triple Nexus
```

## Intel

Player-reported facts that remain unexpired.

Example:

```text
Natural confirmed · 18 seconds old
Three Barracks · 7 seconds old
```

## Permission

A strategic legality decision.

Example:

```text
THIRD NEXUS
CAUTION

Reason:
Production increased and movement remains unknown.

Resolver:
Refresh move-out information before committing.
```

## Obligation

A responsibility created by the operation.

Example for a third base:

```text
Fresh threat read
Reinforcement access
Army coverage
Production conversion
Retreat plan
```

## Decision

The one current output allowed to dominate the Command Surface.

```text
QUESTION
Is Terran moving out?

ACTION
Delay the third and add units.

REASON
The mission remains valid, but the fast implementation lost safety margin.
```

# Permission Engine

The initial deterministic permission model maintains:

| Domain | States |
|---|---|
| Expansion | OPEN / CAUTION / HOLD |
| Technology | OPEN / CAUTION / HOLD |
| Attack | OPEN / CAUTION / HOLD |
| Workers | CONTINUE / CAUTION / COMPRESS |
| Harassment | ACTIVE / LIMITED / DISENGAGE |

These states are based on the current mission, policy status, and unexpired evidence.

They are not guarantees.

# Obligation Engine

Every mission creates responsibilities.

## Three-base economy

- fresh threat and production read;
- reinforcement access;
- army coverage;
- production conversion;
- retreat plan.

## Stable ground army

- frontline screen;
- vision;
- retreat geometry;
- counter monitoring.

## Early pressure

- credible threat;
- exit plan;
- follow-up investment;
- counterattack coverage.

## Air control

- recurring vision;
- ground safety;
- counter monitoring;
- expensive-unit preservation.

The application cannot verify all obligations live. Manual confirmation remains explicit.

# NOW / SOON / NOT YET

The Strategic Scheduler reduces cognitive load by classifying decisions.

Example:

```text
NOW
Refresh Terran production.

SOON
Third Nexus decision
Reinforcement Pylon
Additional Gateway production

NOT YET
Fourth Nexus
Second splash technology
Late-game upgrade split
```

`NOT YET` does not mean unimportant.

It means the player is permitted to defer the decision until its prerequisites become relevant.

# Example: Protoss vs Terran, three-base economy

The balanced route remains **Information-First Triple Nexus**.

Representative transitions:

```text
Reaper seen
→ CONTINUE
→ Confirm what follows it

No natural
→ ABORT fast third
→ Load defensive two-base bridge

Extra production
→ MODIFY
→ Delay third and add immediate units

Move-out
→ HOLD
→ Defend first, then return to the three-base mission

Fast Terran third
→ CONTINUE
→ Match economy and pressure exposed territory
```

# Voice input and microphone behavior

Voice input is constrained and deterministic.

Supported phrases include:

```text
Protoss / Terran / Zerg
Reaper
Natural
No natural
Fast third
Two Barracks / Three Barracks
Factory
Starport
Move out
Turtle
Hidden tech
Can I still expand?
Why?
What next?
Safer plan
Greedier plan
Pause coach
Resume coach
```

Recognition confidence and strategic confidence remain separate.

The v1.9 Command Surface reports specific errors for:

- speech API unavailable;
- microphone permission denied;
- no audio-capture device;
- speech service unavailable;
- no speech detected;
- microphone startup failure.

Quick Intel buttons remain the reliable zero-cost fallback when WebView2 does not expose browser speech recognition.

# What the Strategic OS knows live

Without direct game integration, it knows:

- selected races;
- selected mission;
- compiled policy;
- strategy rules and current-patch knowledge;
- manually synchronized game time;
- facts reported by the player;
- which reported facts have expired.

It does **not** know:

- exact minerals or gas;
- exact army positions;
- exact production counts unless reported;
- current camera position;
- fog-of-war truth;
- whether a prompted action was completed.

Inference must never be presented as player-confirmed fact.

# Secondary modes

## Strategy Compiler

The v1.8 Strategy Compiler remains available from the top navigation.

## 2v2 Operations

Team Composer remains available for:

- four-race setup;
- ten role-based team operations;
- ally responsibilities;
- battle stories;
- synchronized timing windows.

## Advanced Command Center

Advanced mode retains:

- PRO MIND;
- Spellbook / Coach Lab;
- Expansion Permission;
- tactical doctrines;
- replay analysis;
- Player POV / Observer Truth;
- observation reconstruction;
- critical moments;
- advanced telemetry.

## Replay review

Replay is an optional after-action audit.

It can validate:

- execution timing;
- observation timing;
- decision latency;
- engagements;
- policy branch actually taken;
- whether manual reports matched replay evidence.

# Architecture

The Strategic OS architecture is documented in:

```text
docs/strategic-os-architecture.md
```

The live kernel derives its state from the event-sourced Strategy Compiler engine.

Relevant browser events include:

```text
match.configured
strategy.compiled
session.started
clock.set
evidence.reported
evidence.retracted
plan.evaluated
attention.cue_queued
attention.cue_spoken
mastery.updated
```

Replaying the event log reconstructs the underlying Strategy Compiler state.

# Developer run

## Desktop

```text
run_desktop_windows.bat
```

## Browser/service mode

```text
run_windows.bat
```

## WSL / Linux

```bash
chmod +x run_wsl.sh
./run_wsl.sh
```

# Test and release pipeline

The Windows workflow:

1. installs dependencies;
2. verifies SC2 protocol/Protobuf compatibility;
3. syntax-checks every HUD JavaScript file;
4. runs unit tests;
5. builds the desktop application with PyInstaller;
6. builds the NSIS installer;
7. creates the portable ZIP;
8. publishes the current semantic-version release.

# Product thesis

> **A build-order tool tells you what to build. A coach tells you what it thinks you should do. A Strategic Operating System maintains your mission, intelligence, legal decisions, obligations, and fallback routes throughout the match.**
