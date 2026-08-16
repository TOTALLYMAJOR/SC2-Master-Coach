# SC2 Master Coach — Replay Intelligence Engine

**Created by MBMapps**

This build turns the Tactical Doctrine Battle Station into a two-part coaching loop:

1. **Battle Station** — manual second-screen decision support during practice.
2. **Replay Intelligence Lab** — post-game `.SC2Replay` reconstruction and doctrine review.

## What the replay engine reconstructs

For supported replay versions, the parser extracts:

- replay metadata, map, duration, players, races, result
- player stats checkpoints (normally around 10-second intervals in modern replays)
- workers, current minerals/gas, collection rates, supply
- approximate army supply (`food_used - active workers`)
- active-force resource value
- resources lost and killed
- building / expansion starts
- upgrade completion timings
- unit deaths and approximate combat locations
- clustered engagement windows
- economy inflection points
- inferred decision windows
- doctrine-review flags

## Evidence boundary

The engine **does not claim to reconstruct exactly what the player knew through fog of war**. A replay contains global truth plus player commands/camera data, but this v1 does not rebuild visibility polygons frame-by-frame. Therefore:

- resource, unit, timing, death, and tracker-state facts are replay-derived
- doctrine flags are coaching heuristics
- hidden-information / greed-under-pressure findings are explicitly marked **review signatures**, not proven mistakes

## Run on Windows

Double-click:

```text
run_windows.bat
```

It creates `.venv`, installs dependencies, launches the server, and opens:

```text
http://127.0.0.1:8765
```

## Run in WSL / Linux

```bash
chmod +x run_wsl.sh
./run_wsl.sh
```

## Docker

```bash
docker build -t sc2-master-coach-replay .
docker run --rm -p 8765:8765 -e SC2_NO_BROWSER=1 sc2-master-coach-replay
```

Then open `http://127.0.0.1:8765`.

## Parser dependencies

The project uses the upstream `ggtracker/sc2reader` repository for high-level replay extraction. `sc2reader` relies on the SC2 replay protocol ecosystem and MPQ parsing. If a brand-new SC2 patch produces a parse failure, reinstall/update the upstream parser and retry.

## API

### Health

```http
GET /api/health
```

### Synthetic demonstration

```http
GET /api/demo
```

### Analyze replay

```http
POST /api/replay/analyze
Content-Type: multipart/form-data
field: replay=<file.SC2Replay>
```

The response contains:

```text
replay
players
build_events
upgrades
engagements
analysis_by_player
  doctrine
  score
  stats
  economy_inflections
  decision_windows
  violations
  summary
```

## Doctrine-review heuristics in v1

- sustained resource-bank conversion failure
- sustained supply lock
- early/midgame worker-growth stall (review flag only)
- unfavorable combat-resource exchange
- engagement while materially down active-force value
- post-hoc greed-under-pressure signature (review flag only)
- worker shock / army-value collapse / bank spike inflection events

These are designed to generate **review anchors**, not pretend a deterministic metric can replace strategic context.

## Recommended next technical layer

The strongest v2 is **fog-of-war / observation reconstruction**:

```text
Camera + selections + visible unit positions + map vision model
→ what the player could plausibly know
→ observation latency
→ inference timing
→ decision timing
```

That would let the coach distinguish a scouting failure from a reasoning failure with much higher confidence.

## Marketing key art

The primary campaign image should communicate the product thesis visually: **better information and better decisions beat raw numbers**. The hero composition is a lone Terran Ghost using precision positioning and a nuclear strike to outsmart an overwhelming Zerg swarm. The Ghost should feel calm, surgical, and intelligent; the swarm should feel massive and inevitable until the tactical decision changes the battlefield. Keep the image cinematic and strategic rather than graphic.
