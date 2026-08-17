# SC2 Master Coach — Command HUD + Replay Intelligence

<img width="1536" height="1024" alt="SC2 Master Coach marketing artwork" src="https://github.com/user-attachments/assets/606eed8f-538c-40b8-b3b3-cac639a2ecf6" />

**Created by MBMapps**

SC2 Master Coach is a local-first StarCraft II coaching application built around one learning loop:

> **Choose a plan → scout → adapt → execute → replay → diagnose → refine → train again**

It combines a race-reactive Command HUD, matchup strategy library, spoken build timing, player-specific replay analysis, strategy narratives, actual SC2 engine-rendered replay frames, and a configurable **Coach Lab // Spellbook**.

The current strategy/build baseline targets **StarCraft II 5.0.16b**. This includes the 5.0.16 eight-worker starting economy and the later 5.0.16b balance hotfix. Build timings are benchmark windows: scouting evidence outranks a memorized script.

## Release Notes

### v1.5.0 — Coach Lab // Spellbook

Added five systems around the Spellbook concept:

1. **Personal Spell Effectiveness** — explicitly link your replays to a selected strategy and track your own W/L record, coach score, review flags, and sample maturity. The app does not invent a global strategy win rate.
2. **Replay-Driven Spell Evolution** — replay evidence proposes refinements such as earlier supply, production-conversion checkpoints, engagement gates, greed abort triggers, scouting checkpoints, and decision deadlines. Canonical strategies are never silently rewritten; accepted changes become local personal variants.
3. **Second-Screen Quick Signals** — one-tap live reporting for opponent race, fast third, extra production, move-out, air/tech, turtle, hidden tech, and no natural. A compact live mode removes nonessential replay/UI surfaces while playing.
4. **Knowledge Sources & Staleness** — separates official balance sources, curated strategy knowledge, and user-added web references. Every source is patch-tagged or marked as a stable principle / review-needed source.
5. **Post-Game Spell Prescription** — converts replay diagnosis into a bounded five-game experiment with one or more measurable training spells such as Scout on Schedule, Production Conversion, Engagement Gate, Greed Abort, or Worker Rhythm.

The Coach Lab also makes the live evidence boundary explicit: without a game integration, Master Coach does **not** know exact minerals, enemy production, unit locations, camera position, or whether a prompted build action was actually completed unless the player reports it or replay analysis later proves it.

### v1.4.0 — Coach Narrative + Strategy Library + Replay Identity

- Replaced the confusing center diagram with a plain-language **Coach Narrative** by default.
- Added a deterministic five-chapter replay strategy story and **Read briefing**.
- Added a **Build & Strategy Library** for all nine 1v1 matchups with Standard and Opponent Fast Third / 3 Bases scenarios.
- Added **Read plan** and **Load into coach**.
- Added explicit **Viewing replay as…** player selection and remembered local replay identity.
- Hid the conceptual decision map by default; it remains optional and clearly labeled as non-literal.

### v1.3.2 — Replay Renderer + Build-First HUD

- Fixed current-patch replay build selection using replay `BaseBuild` and `DataVersion`.
- Fixed Windows SC2 `Support64` / ICU runtime discovery.
- Moved the **Build / Decision Queue** directly below **Execute Now**.

### v1.3.1 — Protocol Hotfix

- Pinned the compatible Protobuf runtime and added SC2 protocol smoke tests.

### v1.3.0 — Actual SC2 Frames

- Added actual local SC2 engine-rendered **Player POV** and **Observer Truth** frames.
- Added Moment Intelligence Theater and persistent replay case folders.

### v1.2.0 — Build Execution

- Added five-second spoken/visual preparation cues.
- Restored Build Log.
- Added in-app critical-moment snapshot viewing.

### v1.1.0 — Observation Reconstruction + Installer

- Added camera/selection/command observation modeling.
- Added observation, inference-proxy, and decision latency.
- Added first-run onboarding, replay discovery, `.SC2Replay` association, update checking, and Windows installer.

## Install on Windows

Download the latest release assets:

- **`SC2-Master-Coach-Setup.exe`** — recommended
- **`SC2-Master-Coach-Portable.zip`** — no-install alternative

The installer is per-user, creates shortcuts, installs WebView2 when necessary, registers uninstall support, and associates `.SC2Replay` files with SC2 Master Coach.

The executable remains unsigned under the zero-cost release constraint, so Windows SmartScreen can initially show an **Unknown Publisher** warning.

## Live workflow

The intended live interaction is deliberately small:

```text
MY RACE
  ↓
OPPONENT UNKNOWN
  ↓
Identify opponent race
  ↓
Choose matchup strategy / spell
  ↓
Load into coach
  ↓
Build timing + 5-second voice cues
  ↓
Report only high-value scouting signals
  ↓
Coach adapts priority / threat state
```

The **Quick Signals** panel exists because Master Coach does not read the live SC2 process. It only knows live information supplied by the player plus the selected plan and timer.

Normal live callouts are intentionally short. Deep explanation belongs in replay review.

## Build & Strategy Library

The library filters by:

- your race
- opponent race
- scenario
- strategy/build

Opponent race can remain **Unknown** until you identify it. Once known, matchup-specific strategies populate.

All nine 1v1 matchups include at least:

- **Standard** — flexible matchup framework with benchmark timing windows.
- **Opponent Fast Third / 3 Bases** — response to early economic expansion.

Example PvT scenario:

> **Pin the Third, Don't Dive the Main** — pressure the exposed Terran third, preserve Blink units, take your own economy, and force defensive rotations instead of diving into the main army.

**Read plan** speaks the concept and timing milestones. **Load into coach** replaces the active Build / Decision Queue while preserving five-second preparation cues.

## Coach Lab // Spellbook

### Information boundary

The top strip shows what is currently known:

- your race
- opponent race, or Unknown
- active strategy/spell
- live evidence you reported

It also explicitly lists information that is **not available live** without integration.

### Personal Spell Effectiveness

A strategy's effectiveness is based only on replays you explicitly link to it. The UI reports:

- wins / losses
- number of linked games
- average replay coach score
- total review flags
- sample maturity: Early / Developing / Stronger Sample

This avoids presenting views, popularity, or source authority as if they were win-rate evidence.

### Replay-Driven Spell Evolution

Replay patterns can propose local personal variants. Examples:

- sustained supply block → move supply earlier
- bank conversion lag → add production checkpoint
- bad exchange → add engagement gate
- greed-under-pressure signature → add greed abort condition
- slow observation → add scouting/camera checkpoint
- slow response → add decision deadline

The original strategy remains unchanged until you deliberately create a personal variant.

### Quick Signals / second-screen mode

Available signals include:

- Fast third
- Extra production
- Move-out
- Air / tech
- Turtle
- Hidden tech
- No natural

The panel also lets you set the opponent race once it becomes known and enable **Compact live mode** so build execution and high-value reporting dominate the screen.

### Knowledge Sources & Staleness

The source panel separates:

- official Blizzard balance information
- MBMapps curated strategy synthesis
- user-added web/build/replay references

Sources are labeled **Current Patch**, **Stable Principle**, **Verify Patch**, or **Review / Stale**. Adding a URL does not automatically scrape or trust it; it records provenance for later curation.

### Post-Game Spell Prescription

After replay analysis, Master Coach selects up to three high-value training spells and gives each a measurable success condition. A five-game prescription uses:

1. baseline
2. focus
3. repeat
4. stress
5. verify

The goal is to change one important behavior at a time instead of constantly changing builds.

## How the app knows which replay player is you

A `.SC2Replay` contains all players. Master Coach analyzes each player independently.

When a replay opens, it shows:

> **Viewing replay as: [player name · race · result]**

Identity resolution is:

1. explicit player selection;
2. remembered replay identity;
3. local profile-name match;
4. unique preferred-race match;
5. temporary first-player fallback, visibly labeled unconfirmed.

The selected player ID drives the strategy narrative, observation timing, engagement review, and Player POV rendering.

## Replay Strategy Narrative

After a replay, the center Coach Narrative tells the game as five chapters:

1. **The plan** — matchup, map and doctrine.
2. **What you could know** — information opportunities and observation latency.
3. **Economy and conversion** — workers, expansions, bank and production conversion.
4. **Where the game bent** — the most consequential strategic/engagement checkpoint.
5. **What to do next** — concrete training changes.

**Read briefing** speaks the review aloud using local speech synthesis.

## Observation Reconstruction

The replay model analyzes:

```text
Camera + selections + unit-position evidence + conservative vision model
→ what the player could plausibly know
→ observation latency
→ inference proxy timing
→ decision timing
```

This is not presented as exact fog-of-war reconstruction. Replay-derived facts, plausible visibility, behavioral proxies, and coaching interpretations remain distinct.

## Actual game frames

Replay parsing works without launching SC2. Actual **Player POV / Observer Truth** frames require StarCraft II to be installed locally and launched at least once.

The renderer uses the replay's exact BaseBuild/DataVersion, launches the matching local SC2 binary, validates the Windows `Support64` runtime, advances to the critical timestamp, and requests RGB frame data from StarCraft II.

- **Player POV** — engine-rendered replay with fog enabled for the selected player.
- **Observer Truth** — same timestamp/camera with fog disabled.
- **Tactical Map** — Master Coach analytical reconstruction, not literal terrain.

If the local SC2 runtime is incomplete, use Battle.net **Scan and Repair** rather than third-party DLL downloads.

## Replay case workspace

Each real replay is persisted locally:

```text
Documents\SC2 Master Coach\Replays\<case-id>\
├── replay.SC2Replay
├── analysis.json
├── manifest.json
└── frames\
    ├── <moment>-player-pov.png
    ├── <moment>-observer-truth.png
    ├── <moment>-player-minimap.png
    ├── <moment>-truth-minimap.png
    └── <moment>.json
```

## Free release pipeline

The Windows GitHub Actions pipeline:

1. installs dependencies;
2. verifies SC2 protocol compatibility;
3. runs tests;
4. builds the desktop bundle with PyInstaller;
5. builds the NSIS installer;
6. packages the portable ZIP;
7. uploads and publishes the semantic version release.

Paid signing and paid Store distribution remain intentionally excluded.

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

## Product thesis

**Better information and better decisions beat raw numbers.**

The marketing image expresses that thesis through one Terran Ghost using positioning and a nuclear strike to outthink an overwhelming Zerg swarm.
