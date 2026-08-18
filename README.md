# SC2 Master Coach — Strategy Compiler + Live Coach

**Created by MBMapps**

SC2 Master Coach is a local-first StarCraft II strategy teaching application built around one goal:

> **Reduce live cognitive load while teaching the player why the next decision is correct.**

The default workflow is now:

```text
Choose race + opponent
        ↓
Choose strategic goal
        ↓
Compile one executable plan
        ↓
Understand its story, assumptions, and punish routes
        ↓
Run a minimal live coach
        ↓
Report only decision-changing intel
        ↓
Modify, hold, or fall back when evidence changes
        ↓
Optionally validate with replay review
```

The strategy baseline targets **StarCraft II 5.0.16b**, including the eight-worker economy introduced in 5.0.16 and the later 5.0.16b hotfix. Timing windows are coaching benchmarks rather than proof that an in-game action occurred. Scouting evidence outranks a memorized script.

Official patch reference: <https://news.blizzard.com/en-us/article/24291949/starcraft-ii-5-0-16b-hotfix-patch-notes>

## Release notes

### v1.8.0 — Strategy Compiler + Guided Visual Workflow

- Added the **1v1 Strategy Compiler** as the default application experience.
- Added a goal-first workflow: **my race → opponent → strategic objective → risk level → compiled plan**.
- Added ten strategic objectives across all nine 1v1 matchups:
  - safe expansion;
  - three-base economy;
  - balanced macro;
  - early pressure;
  - timing attack;
  - air control;
  - stable ground army;
  - map control;
  - defensive macro;
  - surprise strategy.
- Added a detailed PvT **Information-First Triple Nexus** policy with safe, balanced, and greedy routes.
- A Reaper is treated as early scouting/pressure evidence—not automatic proof of a rush. The coach asks for the Terran follow-up before changing the entire plan.
- Added event-sourced session state, time-limited evidence, declarative plan branches, fallbacks, voice intents, teaching mastery, and an attention queue.
- Added constrained voice commands such as **Reaper**, **No natural**, **Three Barracks**, **Factory**, **Starport**, **Move out**, **Safer plan**, and **Can I still expand?**
- Added **CONTINUE / MODIFY / HOLD / ABORT** plan states.
- Added the live cognitive-load contract:
  - one primary question;
  - one current action;
  - one concise reason;
  - no more than three future windows.
- Added explicit CTAs: **Forge My Strategy**, **Start Guided Coach**, **Can I still do my plan?**, **Try safer plan**, and **Try greedier plan**.
- Added accessible hover help and workflow popups throughout setup, plan review, assumptions, punish routes, build windows, voice input, and live evidence reporting.
- Added four self-contained original SVG illustrations for Protoss, Terran, Zerg, and Unknown. These are race-inspired MBMapps artwork, not official Blizzard assets.
- Preserved **2v2 Team Composer** and **Advanced Command Center** as secondary modes.
- Replay analysis remains available but is no longer the product's primary workflow.

### v1.7.0 — Team Composer

- Added four-race 2v2 setup, exactly ten team-plan archetypes, role assignment, battle stories, timing windows, and a minimal team live coach.

### v1.6.x — PRO MIND

- Added all-nine-matchup professional questions, scouting purpose, capability branches, expansion permission, information age, investment protection, persistent branch state, hover help, and battle stories.

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

## Strategy Compiler workflow

### 1. Choose the matchup

Select your race and the opponent race. The app displays original SVG race artwork to make the choice immediately visible.

### 2. Choose the goal

Select what you want to accomplish—not merely a unit or technology:

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

### 3. Review the compiled plan

The plan includes:

- a feasibility verdict;
- the battle story;
- tolerant build windows;
- assumptions;
- opponent punish routes;
- purposeful scouting questions;
- safer and greedier alternatives;
- evidence-driven branch rules;
- a fallback that tries to preserve the original strategic objective.

### 4. Start Guided Coach

Live mode is intentionally small:

```text
ONE QUESTION
ONE ACTION
ONE REASON
THREE UPCOMING WINDOWS
```

The coach does not attempt to display every available system during the match.

## Example: Protoss vs Terran, three-base economy

The balanced compiler route is **Information-First Triple Nexus**.

The strategic story is:

> Early Gateway units buy information and time. If Terran shows a normal economic floor and no concentrated move-out, convert that window into a third Nexus. Preserve the mobile screen and prepare reinforcement access so the new economy does not become an undefendable footprint.

Representative branches:

```text
Reaper seen
→ Continue
→ Confirm what follows it

No natural
→ Abort the fast third
→ Load the defensive two-base bridge

Extra production
→ Modify
→ Delay the third and add immediate units

Move-out
→ Hold
→ Defend first, then return to the three-base goal

Fast Terran third
→ Continue
→ Match economy and pressure exposed territory
```

## Voice input

Voice input is deliberately constrained and deterministic.

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

Recognition confidence and strategic confidence are separate. Ambiguous high-impact phrases require confirmation before changing plan state.

When browser/WebView speech recognition is unavailable, the Quick Intel buttons provide the same structured evidence without a paid service.

## What the coach knows live

Without direct game integration, the app knows:

- selected races;
- selected objective;
- compiled strategy;
- strategy rules and current-patch knowledge;
- manually synchronized game time;
- facts the player reports through buttons or voice.

It does **not** know:

- exact minerals or gas;
- exact army positions;
- exact production counts unless reported;
- current camera position;
- fog-of-war truth;
- whether a prompted action was completed.

The application must never present inference as player-confirmed fact.

## Event and teaching architecture

The live engine records deterministic events such as:

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

Evidence can expire, be retracted, or be replaced by newer information. Replaying the event log reconstructs the session state.

The teaching ladder is:

```text
Tell → Prompt → Question → Hint → Silent
```

As mastery improves, the coach becomes shorter and quieter. Emergency coaching always remains direct.

## Original SVG artwork

The application includes self-contained SVG scenes under `static/artwork/`:

- `protoss-strategy.svg`
- `terran-strategy.svg`
- `zerg-strategy.svg`
- `unknown-strategy.svg`

They are original MBMapps race-inspired illustrations created for this interface. They are not official Blizzard artwork and do not reuse official logos or packaged game assets.

## Secondary modes

### 2v2 Team Composer

The Team Composer remains available from the top-right CTA. It supports four race selectors, ten role-based team strategies, battle stories, ally responsibilities, and team timing windows.

### Advanced Command Center

The full Command HUD remains available for:

- PRO MIND;
- Spellbook / Coach Lab;
- Expansion Permission;
- tactical doctrines;
- replay analysis;
- Player POV / Observer Truth;
- observation reconstruction;
- critical moments;
- advanced telemetry.

### Replay review

Replay remains a secondary quality-control and personalization layer. It can validate execution, observation timing, decision latency, engagements, and the strategy branch actually taken.

## Developer run

### Desktop

```text
run_desktop_windows.bat
```

### Browser/service mode

```text
run_windows.bat
```

### WSL / Linux

```bash
chmod +x run_wsl.sh
./run_wsl.sh
```

## Test and release pipeline

The Windows workflow:

1. installs dependencies;
2. verifies SC2 protocol/Protobuf compatibility;
3. syntax-checks every HUD JavaScript file;
4. runs unit tests;
5. builds the desktop application with PyInstaller;
6. builds the NSIS installer;
7. creates the portable ZIP;
8. publishes the current semantic-version release.

## Product thesis

> **StarCraft strategy can be taught as a rules-driven policy under uncertainty. Master Coach should not pretend to see the game; it should help the player report the few facts that matter, understand why they matter, and choose the next action with less cognitive load.**
