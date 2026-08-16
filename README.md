# SC2 Master Coach — Command HUD + Replay Intelligence
<img width="1536" height="1024" alt="SC2 Master Coach marketing artwork" src="https://github.com/user-attachments/assets/606eed8f-538c-40b8-b3b3-cac639a2ecf6" />

**Created by MBMapps**

SC2 Master Coach is a local-first coaching application built around one loop:

**Play → Observe → Infer → Decide → Execute → Replay → Diagnose → Train again**

The product combines:

1. **Command HUD** — race-reactive StarCraft-style second-screen coaching.
2. **Tactical Doctrine** — nine matchup operating models across Zerg, Terran and Protoss.
3. **Replay Intelligence** — `.SC2Replay` state reconstruction, engagements, economy, doctrine review and training anchors.
4. **Observation Reconstruction** — camera, selection, command and sparse unit-position evidence used to estimate what the player could plausibly know and how quickly they reacted.

## Easiest Windows installation

Normal players should not need Python, a terminal, or a ZIP workflow.

The automated Windows build produces:

```text
SC2-Master-Coach-Setup.exe
```

The zero-cost NSIS installer:

- installs per-user under `%LOCALAPPDATA%\Programs\SC2 Master Coach`
- creates Start Menu and desktop shortcuts
- silently installs the Microsoft Edge WebView2 runtime when it is missing
- registers an uninstall entry
- associates `.SC2Replay` files with SC2 Master Coach
- lets a player double-click a replay and open directly into Replay Intelligence

Developers can also use the portable build artifact.

## First-run experience

On first launch, the player sees only three setup fields:

- name
- preferred race
- current skill level

Then three actions:

- **TRAIN NOW** — enter the Command HUD immediately
- **ANALYZE REPLAY** — automatically find the newest replay when possible, with manual file selection as fallback
- **TRY DEMO MATCH** — understand the product without locating a replay first

The profile is stored locally on the machine.

## Replay Intelligence

For supported replay versions, the parser extracts and derives:

- replay metadata, map, duration, players, races and result
- player stats checkpoints
- workers, minerals/gas, collection rates and supply
- approximate army supply
- active-force resource value
- resources lost and killed
- building and expansion starts
- upgrade completion timings
- unit deaths and approximate combat locations
- clustered engagement windows
- economy inflection points
- inferred decision windows
- doctrine-review flags

## Observation Reconstruction — v1.1

The replay model now adds the cognitive chain that was previously only planned:

```text
Camera + selections + unit-position evidence + conservative vision model
→ what the player could plausibly know
→ observation latency
→ inference proxy timing
→ decision timing
```

For each relevant enemy structure/expansion opportunity the model can report:

- first plausible visibility timestamp
- camera-attention timestamp
- observation latency
- first nearby selection/command as an inference proxy
- inference-proxy latency
- first subsequent command as a decision proxy
- decision latency
- selected units / command proxy
- confidence level

### Evidence boundary

This is intentionally **not presented as perfect fog-of-war reconstruction**.

SC2 tracker position events are sparse, so the model uses a conservative approximate sight radius plus camera/selection/command evidence. The application distinguishes:

- **replay-derived facts** — camera events, selection events, commands, tracker state, unit/building timings
- **plausible observation** — inferred from available unit-position evidence and camera attention
- **inference proxy** — behavior after observation, not a claim about private thought
- **decision proxy** — first qualifying subsequent command

That distinction prevents hindsight knowledge from being mislabeled as information the player definitely possessed at the time.

## Doctrine-review heuristics

The current engine reviews signals including:

- sustained resource-bank conversion failure
- sustained supply lock
- early/midgame worker-growth stall (review flag only)
- unfavorable combat-resource exchange
- engagement while materially down active-force value
- post-hoc greed-under-pressure signature (review flag only)
- worker shock / army-value collapse / bank spike inflection events

These create **review anchors**, not deterministic declarations that strategy can be reduced to one metric.

## Free release pipeline

The repository contains an automated Windows workflow at:

```text
.github/workflows/windows-release.yml
```

On `main`, it validates tests and builds the Windows application and installer. On a version tag such as `v1.1.0`, it also publishes the installer and portable ZIP to a GitHub Release.

The release path intentionally uses only zero-cost/open tooling for this project:

- GitHub Actions standard public-repository runners
- PyInstaller
- NSIS
- Microsoft WebView2 Evergreen bootstrapper
- GitHub Releases for update distribution

The desktop app checks GitHub Releases for newer versions and can send the player directly to the current installer. No paid update service is required.

### Intentionally excluded under the zero-cost constraint

Commercial code-signing certificates and paid Microsoft Store distribution are **not required by the build** and are not assumed. An unsigned installer can therefore still trigger Windows reputation/SmartScreen warnings on some systems. Signing can be added later without changing the core release architecture.

## Developer run

### Windows desktop development

```text
run_desktop_windows.bat
```

### Local web/service development

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

### Health

```http
GET /api/health
```

### Synthetic demo

```http
GET /api/demo
```

### Analyze uploaded replay

```http
POST /api/replay/analyze
Content-Type: multipart/form-data
field: replay=<file.SC2Replay>
```

### Analyze latest local replay

```http
POST /api/replay/analyze-latest
```

### Associated-file launch context

```http
GET /api/launch-context
```

### Update check

```http
GET /api/update/check
```

## Marketing thesis

The primary campaign image communicates the same idea as the product: **better information and better decisions beat raw numbers**.

The hero composition is a lone Terran Ghost using precision positioning and a nuclear strike to outsmart an overwhelming Zerg swarm. The Ghost should feel calm, surgical and intelligent; the swarm should feel massive and inevitable until one superior tactical decision changes the battlefield.
