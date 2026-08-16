# SC2 Master Coach — Command HUD + Replay Intelligence

<img width="1536" height="1024" alt="SC2 Master Coach marketing artwork" src="https://github.com/user-attachments/assets/606eed8f-538c-40b8-b3b3-cac639a2ecf6" />

**Created by MBMapps**

SC2 Master Coach is a local-first StarCraft II coaching application built around one learning loop:

> **Play → Observe → Infer → Decide → Execute → Replay → Diagnose → Train again**

It combines a race-reactive Command HUD, matchup doctrine, timed build execution, replay reconstruction, cognitive observation analysis, and downloadable critical-moment tactical stills.

## Install on Windows

Download the latest installer from the GitHub Releases page:

- **`SC2-Master-Coach-Setup.exe`** — recommended
- **`SC2-Master-Coach-Portable.zip`** — no-install alternative

The installer:

- installs per-user under `%LOCALAPPDATA%\Programs\SC2 Master Coach`
- creates Start Menu and desktop shortcuts
- installs WebView2 silently when it is missing
- registers an uninstall entry
- associates `.SC2Replay` files with SC2 Master Coach
- lets a player double-click a replay and open directly into Replay Intelligence

The executable is currently unsigned under the zero-cost release constraint, so Windows SmartScreen can initially show an **Unknown Publisher** warning.

## First run

The first-run screen asks for only:

- player name
- preferred race
- current skill level

Then it offers:

- **TRAIN NOW** — start the Command HUD and build timer
- **ANALYZE REPLAY** — locate the newest replay automatically or select one manually
- **TRY DEMO MATCH** — see the analysis flow without finding a replay

Profiles and coaching history stay on the local machine.

## Command HUD

The Command HUD provides:

- Zerg, Terran and Protoss visual identities
- nine matchup doctrines
- current action and next transition
- scouting-evidence controls
- threat classification
- tactical priority queue
- race-specific command card and hotkeys
- build/decision queue
- optional spoken coaching

## Five-second build preparation cues — v1.2

The coach now gives a visual cue before each timed build action and, when Voice is enabled, speaks a preparation instruction such as:

> **In five seconds, pull one Probe to warp in a Gateway.**

The cue generator distinguishes race workers and structure behavior:

- Zerg — send a Drone to morph the structure
- Terran — pull an SCV to build the structure
- Protoss — pull a Probe to warp in the structure

It also issues a **Now** cue when the build timer crosses the scheduled action.

## Build Log — v1.2

The full chronological build log is visible again. It shows:

- scheduled timestamp
- build action
- phase and coaching rationale
- next action
- cue-issued timestamp
- timing delta from the plan

The log can be copied for review after practice. It is explicitly a **cue history**, not proof that the player completed the action in-game.

## Replay Intelligence

For supported `.SC2Replay` versions, the parser extracts and derives:

- map, duration, players, races and result
- worker, economy, supply and army-value checkpoints
- building and expansion timings
- upgrade completions
- unit deaths and approximate combat locations
- engagement windows and trade efficiency
- economy inflection points
- inferred decision windows
- doctrine-review flags

## Observation Reconstruction

The replay model analyzes:

```text
Camera + selections + unit-position evidence + conservative vision model
→ what the player could plausibly know
→ observation latency
→ inference proxy timing
→ decision timing
```

For relevant enemy structures and expansions, it can report:

- first plausible visibility
- camera-attention time
- observation latency
- selection/command inference proxy
- inference-proxy latency
- decision proxy and decision latency
- confidence level

### Evidence boundary

This is not presented as exact fog-of-war reconstruction. Tracker positions are sparse, so the application distinguishes:

- **replay-derived fact** — event, camera, selection, command or tracker state
- **plausible observation** — conservative visibility approximation
- **inference proxy** — behavior after attention, not private thought
- **decision proxy** — first qualifying command after the observation

## Critical Moment Snapshots — v1.2

Replay Intelligence now turns the highest-signal moments into downloadable PNG stills:

- late or unconfirmed observations
- costly engagements
- doctrine violations and review anchors

Each card combines timestamp, severity, tactical position when available, replay evidence and latency/trade information.

These are **reconstructed tactical snapshots**, not screenshots rendered by the StarCraft II game client. A `.SC2Replay` stores simulation and event data rather than video frames, so the application visualizes the evidence honestly instead of fabricating a literal in-game screenshot.

## Doctrine review

Current review signals include:

- sustained bank-conversion failure
- supply lock
- worker-growth stall review points
- unfavorable combat exchange
- engagement while materially down active-force value
- greed-under-pressure signatures
- worker shock, army collapse and bank spikes

These are review anchors, not claims that strategy can be reduced to one metric.

## Free release pipeline

`.github/workflows/windows-release.yml` runs on Windows and:

1. installs dependencies
2. runs tests
3. builds the native desktop application with PyInstaller
4. builds the free NSIS installer
5. packages the portable ZIP
6. uploads artifacts
7. publishes the current semantic version as a GitHub Release

The release architecture uses zero-cost/open tooling for this public project. Paid code signing and paid Store distribution are intentionally excluded.

## Developer run

### Desktop development

```text
run_desktop_windows.bat
```

### Local service/browser mode

```text
run_windows.bat
```

### WSL / Linux

```bash
chmod +x run_wsl.sh
./run_wsl.sh
```

### Docker

```bash
docker build -t sc2-master-coach .
docker run --rm -p 8765:8765 -e SC2_NO_BROWSER=1 sc2-master-coach
```

## API

- `GET /api/health`
- `GET /api/demo`
- `POST /api/replay/analyze`
- `POST /api/replay/analyze-latest`
- `GET /api/launch-context`
- `GET /api/update/check`

## Product thesis

**Better information and better decisions beat raw numbers.**

The marketing image expresses that thesis through one Terran Ghost using positioning and a nuclear strike to outthink an overwhelming Zerg swarm.
