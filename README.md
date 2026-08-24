# SC2 Master Coach — Combat HUD + Strategic OS
<img width="320" height="480" alt="image" src="https://github.com/user-attachments/assets/49cb24af-f08e-4b3b-a831-8d723696be69" />

**Created by MBMapps**

SC2 Master Coach is a local-first StarCraft II strategic decision aid designed around one rule:

> **The player reports the battlefield. Master Coach maintains the operation and surfaces only the decision that matters now.**

The live strategy baseline targets **StarCraft II 5.0.16b**, including the eight-worker economy introduced in 5.0.16 and the later 5.0.16b balance hotfix. Timing windows are coaching benchmarks; reported battlefield evidence outranks a memorized script.

Official patch reference: <https://news.blizzard.com/en-us/article/24291949/starcraft-ii-5-0-16b-hotfix-patch-notes>

## v1.13.0 — Adaptive Live Coach Windows release

The Combat HUD now derives timed practice checkpoints from the concrete matchup plan selected for the operation. A checkpoint can combine a worker range with planned infrastructure, for example `3 Gateways · 29–35 Probes`, and asks the player to report `On track`, `Behind`, or `Plan changed`.

- The concrete nine-matchup strategy library is the primary 1v1 deployment source; generic compiler candidates remain an explicit fallback.
- Bronze through Grandmaster profiles change timing tolerance, target density, and cue lead time without changing battlefield truth.
- Player-confirmed worker and production counts produce a bounded recovery instruction.
- Reported scouting evidence can pause or replace a macro reminder. Reaper, Factory, Starport, move-out, no-natural, production, hidden-tech, fast-third, and turtle reports all have explicit coaching actions.
- Checkpoint confirmations remain local. The system does not inspect the SC2 process or claim that a scheduled benchmark proves the live game state.
- The v1.12 once-per-game-second clock synchronization guard is retained so reminder updates do not reintroduce a browser-main-thread loop.

### Adaptive practice and evidence quality

- Coaching intensity can be set to quiet, standard, or intensive, while Bronze through Grandmaster programs change plan pool, reminder cadence, target density, teaching language, and recovery focus.
- Optional scout detail records count, location, observation time, and confidence. Low-confidence evidence asks for verification instead of freezing the build, and newer expansion evidence resolves contradictory natural/third reports.
- Versioned local progression events preserve exact target context for new reports, migrate older reports as low-confidence history, detect recurring worker/production/execution weaknesses, and recommend the next no-replay drill.
- Every generated benchmark is explicitly marked as derived practice guidance with expert review still required. The app does not claim professional validation that has not occurred.
- The live HUD adds focus preservation, dialog focus trapping/restoration, keyboard semantics, live-region announcements, reduced-motion behavior, and narrow/zoom reflow safeguards. These improve the implementation but do not replace human keyboard, screen-reader, zoom, and motion acceptance testing.

## v1.12.1 - Countdown and Click Reliability

v1.12.1 fixes two browser-main-thread loops that could stall the 3-2-1 transition or leave the rendered page unable to accept clicks.

### Changes

- Throttled Strategic OS clock synchronization to once per elapsed game second instead of every animation frame.
- Made Native Voice button rendering idempotent so its page-wide DOM observer reaches quiescence.
- Added observer regression coverage and a real-browser flow through onboarding, Deploy, 3-2-1, Pause/Resume, and the Command palette.

## v1.12.0 - Interaction Reliability

v1.12 restores reliable input across the Combat HUD by eliminating a Python Shadow status-observer feedback loop that could keep the browser main thread busy after startup.

### Major changes

- Fixed the startup condition that made the app render while buttons remained unresponsive.
- Made Python Shadow status-chip rendering idempotent so its DOM observer reaches quiescence.
- Added executable observer regression coverage and real-browser pointer verification for onboarding and operation deployment.
- Advanced the Windows release workflow and validation marker to the v1.12 line.

## v1.11.1 - Startup interaction hotfix

- Fixed a self-triggering Python Shadow DOM observer that could prevent `DOMContentLoaded` and make every control unresponsive.
- Fixed the equivalent native-voice observer loop when the live HUD mounted.
- Scoped both observers to the Combat HUD and made their text updates idempotent.
- Added regression coverage and browser-tested the full onboarding, deploy, countdown, native-mic, and Pause interaction path.

## v1.11.0 - Strategy Science Shadow Mode

v1.11 adds a bounded Python advisory runtime behind the Combat HUD while preserving the Strategic OS as canonical state authority.

### Major changes

- Added Python Shadow Mode with a local SQLite runtime and immutable run/proof records.
- Added the first bounded PvT three-base Digital Twin advisory.
- Added proof and uncertainty output, opportunity-cost reasoning, and a qualitative 30/60/90-second attack-hazard horizon.
- Added native Windows microphone diagnostics.
- Added constrained offline Vosk tactical recognition with voice provenance and confidence.
- Packaged the offline speech model, Strategy Science schema, Vosk, and sounddevice into the Windows build.
- Added regression coverage for runtime authority, microphone boundaries, offline voice, opportunity cost, hazard output, and release packaging.

Shadow output remains advisory. It cannot mutate the deterministic Strategic OS plan, and microphone diagnostics do not claim access to unreported battlefield truth.

## v1.10.0 — Combat HUD

v1.10 replaces the page-oriented default workflow with a game-instrument workflow inspired by a first-person-shooter HUD:

```text
DEPLOY
Who is on the battlefield?
        ↓
RANDOM OPERATION
One curated current-patch plan
        ↓
MISSION BRIEF
Story + first-unit purpose + expected response + pivot + failure + unspoken rule
        ↓
3–2–1 SYNC
Align the coaching timer with the StarCraft countdown
        ↓
LIVE HUD
One question + one action + one reason + one permission + three future windows
        ↓
REPORT WHAT YOU SEE
Scenario hotkeys 1–6
        ↓
MASTER COACH CHOOSES THE BRANCH
        ↓
SPELLBOOK / REVIEW
Deep context and optional replay analysis outside the live fight
```

### Major changes

- Added **Deploy → Live HUD → Spellbook → Review** as the default navigation.
- The player no longer browses ten builds before a match.
- The app remembers the player's race.
- 1v1 setup asks only for the opponent race.
- 2v2 setup asks for ally and enemy composition.
- Added **curated random operation assignment**:
  - 1v1 draws from the existing current-patch nine-matchup Strategy Compiler;
  - 2v2 draws from the ranked role-based Team Composer strategies;
  - recently assigned plans are de-prioritized so the experience rotates.
- Added **Reroll Operation** without opening a strategy catalog.
- Added a mission briefing that explains:
  - the strategic mission;
  - what the first units are really buying;
  - the response the plan is trying to induce;
  - the pivot condition;
  - the failure condition;
  - the unspoken strategic principle;
  - build windows with the reason behind each step.
- Added an FPS-style full-width live HUD with:
  - **ONE QUESTION**;
  - **DO NOW**;
  - **WHY**;
  - **PRIMARY PERMISSION**;
  - no more than three future windows.
- Scenario buttons now report observations instead of choosing strategy branches.
- Added 1–6 scenario hotkeys for common matchup evidence.
- Added **Ctrl/Cmd + K** command palette.
- Added commands for random deployment, reroll, timer sync, plan status, reporting intel, Spellbook, Live HUD, Strategy Compiler, Team Composer, and Advanced Command Center.
- Added explicit **3–2–1 match timer synchronization**.
- Added ±1 / ±5 / ±10 second correction controls; corrected clocks are visibly marked **APPROXIMATE** until resynchronized.
- Added keyboard shortcuts:
  - `Ctrl/Cmd + K` command palette;
  - `S` 3–2–1 sync;
  - `R` reroll operation;
  - `V` read mission briefing;
  - `P` plan status;
  - `B` Spellbook;
  - `H` Live HUD;
  - `1–6` scenario reports;
  - `Space` pause/resume while the Live HUD is focused.
- Increased live typography for second-monitor readability.
- Added larger scenario buttons and more balanced spacing.
- Coach speech now prefers installed Microsoft natural/neural English voices where available and uses short live phrases plus five-second preparation cues.
- Replay analysis remains secondary and is reachable from **Review → Open Replay / Advanced**.
- Strategy Compiler, Strategic OS, Team Composer, PRO MIND, Spellbook Lab, replay rendering, and telemetry remain preserved as secondary/advanced surfaces.

## Why random does not mean arbitrary

For 1v1, Master Coach selects a goal and risk route from the current Strategy Compiler and avoids recently assigned plans. The selection is biased toward robust macro, economic, pressure, army-shape, and map-control plans; fragile surprise routes have lower selection weight.

For 2v2, Master Coach selects from the highest-fit Team Composer operations for the current allied/enemy races and avoids repeating the most recent operations.

Random assignment is therefore a **curated mission rotation**, not an unvalidated random build generator.

## Live evidence boundary

SC2 Master Coach does not read the live StarCraft process.

It knows live:

- selected races;
- the assigned operation;
- the manually synchronized timer;
- strategy rules and current-patch knowledge;
- facts the player reports through the HUD.

It does not know live:

- exact resources;
- exact army positions;
- exact production counts unless reported;
- camera position;
- fog-of-war truth;
- whether a prompted action was completed.

The player reports reality; the strategy engine chooses `CONTINUE`, `MODIFY`, `HOLD`, or `ABORT`.

## Install on Windows

Download the latest release assets:

- **`SC2-Master-Coach-Setup.exe`** — recommended
- **`SC2-Master-Coach-Portable.zip`** — no-install alternative

The installer is per-user, creates Start Menu and desktop shortcuts, installs WebView2 when required, supports uninstall, and associates `.SC2Replay` files with SC2 Master Coach.

The Windows desktop application opens directly into the Live Coach. Master Intel and the deeper research surfaces remain available from inside the app.

The application remains unsigned under the zero-cost release constraint, so Windows SmartScreen may initially display **Unknown Publisher**.

## Secondary systems retained

### Strategy Compiler

Goal-first 1v1 strategy compilation across all nine matchups.

### Strategic OS

Mission, Policy, Intel, Permission, Obligation, Decision, and `NOW / SOON / NOT YET` reasoning.

### 2v2 Team Composer

Ten role-based team operations, ally responsibilities, battle stories, and synchronized timing windows.

### Advanced Command Center

PRO MIND, Spellbook / Coach Lab, Expansion Permission, tactical doctrines, replay analysis, Player POV / Observer Truth, observation reconstruction, critical moments, and telemetry.

### Replay review

Replay is an optional after-action audit rather than the live product center.

## Python Strategy Science

The repository also contains the Python Strategy Science architecture foundation:

- contracts;
- capability registry;
- JSON schemas;
- SQLite schema design;
- acceptance manifest;
- architecture and backlog documents;
- architecture tests.

v1.11 operationalizes the bounded PvT Digital Twin and offline tactical voice path. Other registered Strategy Science capabilities remain foundation or design work. Python remains advisory; the Strategic OS remains canonical state authority.

## Developer run

### Desktop

```text
run_desktop_windows.bat
```

This launches the desktop shell from source. To create a portable Windows application that does not require Python on the destination PC, run:

```text
build_windows_portable.bat
```

The output executable is `dist\SC2 Master Coach\SC2 Master Coach.exe`. The optional `build_windows_onefile.bat` creates a slower-starting single-file executable.

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
3. syntax-checks every JavaScript file under `static/`;
4. runs the full pytest suite;
5. builds the desktop app with PyInstaller;
6. builds the NSIS installer;
7. creates the portable ZIP;
8. uploads the validated Windows artifacts;
9. publishes or refreshes the semantic-version release.

## Product thesis

> **Plan the operation. Report the battlefield. Execute the decision that matters.**
