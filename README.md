# SC2 Master Coach — Command HUD + Replay Intelligence

<img width="1536" height="1024" alt="SC2 Master Coach marketing artwork" src="https://github.com/user-attachments/assets/606eed8f-538c-40b8-b3b3-cac639a2ecf6" />

**Created by MBMapps**

SC2 Master Coach is a local-first StarCraft II coaching application built around one learning loop:

> **Play → Observe → Infer → Decide → Execute → Replay → Diagnose → Train again**

It combines a race-reactive Command HUD, matchup doctrine, timed build execution, replay reconstruction, cognitive observation analysis, actual SC2 engine-rendered replay frames, and a tactical intelligence theater.

The current strategy/build baseline targets **StarCraft II 5.0.16b**, including the eight-worker starting economy and the hotfix changes to Protoss Gateway/Warpgate timings, Terran Command Center cost, and Ghost supply. Build timings remain benchmark windows: scouting evidence outranks a memorized script.

## Release Notes

### v1.3.2 — Exact Replay Build Selection + Build-First HUD

- Fixed **“Unknown game version: 5.0.16. Known versions: ['latest']”** during SC2 frame capture.
- Uses the replay's authoritative `BaseBuild` and `DataVersion` to launch the exact locally installed `Versions/BaseXXXXX` binary, even when PySC2's static version catalog has not yet added the current patch name.
- Reports the locally installed SC2 Base builds when a replay-compatible binary is genuinely missing.
- Allows SC2 to try its local map cache before declaring map data unavailable.
- Moved **Build / Decision Queue** directly below **Execute Now**.
- Keeps the build queue visually prioritized and sticky while scrolling.
- Keeps the Build Log above doctrine, tactical-map, and Moment Intelligence Theater content.

### v1.3.1 — SC2 Frame Renderer Protocol Hotfix

- Fixed the **“Descriptors cannot be created directly”** failure in the actual SC2 frame renderer.
- Pinned the bundled Protobuf runtime to `3.20.3`, compatible with PySC2 and `s2clientprotocol`.
- Added a Windows CI smoke test that imports `s2clientprotocol.sc2api_pb2` before packaging.
- Preserved Tactical Map fallback when actual frame capture is unavailable.
- Updated the strategy baseline label to **5.0.16b**.

### v1.3.0 — Actual SC2 Frames + Moment Intelligence Theater

- Added real replay-frame capture through the local StarCraft II RGB rendering API.
- Added **Player POV** captures with fog enabled.
- Added **Observer Truth** captures at the same timestamp and camera with fog disabled.
- Added click-to-cycle display: **Player POV → Observer Truth → Tactical Map**.
- Added a large **Moment Intelligence Theater** with an Observation → Camera → Inference → Decision evidence chain.
- Added a critical-moment filmstrip, SC2 minimap inset, persistent replay case folders, and **Open case folder**.

### v1.2.0 — Build Execution + In-App Snapshot View

- Added five-second visual build-preparation cues.
- Added optional race-aware spoken instructions such as: **“In five seconds, pull one Probe to warp in a Gateway.”**
- Restored the chronological Build Log with planned time, cue time, and timing delta.
- Added reconstructed tactical snapshot cards and optional PNG export.

### v1.1.0 — Observation Reconstruction + Easier Installation

- Added camera, selection, command, and sparse unit-position analysis.
- Added plausible-observation, inference-proxy, and decision-latency measurements.
- Added first-run onboarding, automatic latest-replay discovery, `.SC2Replay` association, update checking, and the Windows installer.

The GitHub Releases page is the source of truth for downloadable versions and release assets.

## Install on Windows

Download the latest release assets:

- **`SC2-Master-Coach-Setup.exe`** — recommended
- **`SC2-Master-Coach-Portable.zip`** — no-install alternative

The installer:

- installs per-user under `%LOCALAPPDATA%\Programs\SC2 Master Coach`
- creates Start Menu and desktop shortcuts
- installs WebView2 silently when missing
- registers an uninstall entry
- associates `.SC2Replay` files with SC2 Master Coach
- lets a player double-click a replay and open directly into Replay Intelligence

The executable is unsigned under the zero-cost release constraint, so Windows SmartScreen can initially show an **Unknown Publisher** warning.

## Requirements for actual game frames

Replay parsing works without launching StarCraft II. **Player POV / Observer Truth frames require StarCraft II to be installed locally and launched at least once.**

The renderer looks in the normal Windows installation location and also honors the `SC2PATH` environment variable. It reads the replay's exact `BaseBuild`, selects the corresponding local SC2 binary, advances to the critical timestamp, moves to the recorded camera position when available, and retrieves RGB frame data from the StarCraft II engine.

This is not a Playwright screenshot. Playwright can capture the web application itself; SC2 Master Coach uses the **StarCraft II replay rendering API** to obtain actual game-engine frames.

### Frame evidence boundary

- **Player POV** — engine-rendered replay frame with fog enabled for the analyzed player.
- **Observer Truth** — same timestamp/camera with fog disabled.
- **Tactical Map** — SC2 Master Coach's explanatory map for geometry, attention, and decision context.
- Rendering resolution is selected by SC2 Master Coach and may not exactly match the original monitor resolution, UI scale, or graphics settings.
- If a matching replay binary or map cannot be loaded, Tactical Map remains available and the application reports the exact missing prerequisite.

## Replay case workspace

Each real replay is persisted locally as a case:

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

The app can open this folder directly from the Moment Intelligence Theater.

## First run

The first-run screen asks for:

- player name
- preferred race
- current skill level

Then it offers:

- **TRAIN NOW** — start the Command HUD and build timer
- **ANALYZE REPLAY** — locate the newest replay automatically or select one manually
- **TRY DEMO MATCH** — see the analysis flow without locating a replay

Profiles and coaching history stay on the local machine.

## Command HUD

The Command HUD provides:

- Zerg, Terran, and Protoss visual identities
- nine matchup doctrines
- current action and next transition
- scouting-evidence controls
- threat classification
- tactical priority queue
- race-specific command card and hotkeys
- optional spoken coaching
- an elevated, sticky **Build / Decision Queue** immediately below the current command
- the complete Build Log directly beneath that queue

## Five-second build preparation cues

Before each timed build action, the coach provides a visual cue and, when Voice is enabled, a race-aware spoken instruction such as:

> **In five seconds, pull one Probe to warp in a Gateway.**

It also issues a **Now** cue as the timer crosses the scheduled action.

The chronological Build Log shows scheduled timestamp, build action, coaching rationale, cue time, and timing delta. It is a cue history—not proof that the in-game action was completed.

## Replay Intelligence

For supported `.SC2Replay` versions, the parser extracts and derives:

- map, duration, players, races, and result
- worker, economy, supply, and army-value checkpoints
- building, expansion, and upgrade timings
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

This is not presented as exact fog-of-war reconstruction. The application distinguishes replay-derived facts from plausible observation and behavioral proxies.

## Free release pipeline

`.github/workflows/windows-release.yml` runs on Windows and:

1. installs dependencies
2. verifies SC2 protocol compatibility
3. runs tests
4. builds the native desktop application with PyInstaller
5. bundles PySC2 and SC2 protocol libraries
6. builds the free NSIS installer
7. packages the portable ZIP
8. uploads artifacts and publishes the current semantic version

The release architecture uses zero-cost/open tooling. Paid code signing and paid Store distribution are intentionally excluded.

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

Replay parsing works in Docker. Actual RGB frame capture additionally needs an SC2 installation/rendering environment accessible to the container.

```bash
docker build -t sc2-master-coach .
docker run --rm -p 8765:8765 -e SC2_NO_BROWSER=1 sc2-master-coach
```

## API

- `GET /api/health`
- `GET /api/demo`
- `POST /api/replay/analyze`
- `POST /api/replay/analyze-latest`
- `GET /api/replay/capture/status`
- `POST /api/replay/capture`
- `GET /api/cases/<case-id>/frames/<filename>`
- `POST /api/cases/<case-id>/open`
- `GET /api/launch-context`
- `GET /api/update/check`

## Product thesis

**Better information and better decisions beat raw numbers.**

The marketing image expresses that thesis through one Terran Ghost using positioning and a nuclear strike to outthink an overwhelming Zerg swarm.
