# SC2 Master Coach — Command HUD + Replay Intelligence

<img width="1536" height="1024" alt="SC2 Master Coach marketing artwork" src="https://github.com/user-attachments/assets/606eed8f-538c-40b8-b3b3-cac639a2ecf6" />

**Created by MBMapps**

SC2 Master Coach is a local-first StarCraft II coaching application built around one learning loop:

> **Choose a plan → understand why → scout → adapt → execute → replay → diagnose → refine → train again**

It combines a race-reactive Command HUD, matchup strategy library, spoken build timing, **PRO MIND // Unwritten Game**, Coach Lab // Spellbook, player-specific replay analysis, strategy narratives, and actual SC2 engine-rendered replay frames.

The current strategy/build baseline targets **StarCraft II 5.0.16b**. This includes the 5.0.16 eight-worker starting economy and the later 5.0.16b balance hotfix. Build timings are benchmark windows: **scouting evidence outranks a memorized script**.

## Release Notes

### v1.6.1 — Persistent Branches + Battle Stories + Hover Help

- Fixed the Pro Mind branch-details bug where a branch could open and then immediately close because the live game clock caused the entire panel to be rebuilt.
- Open strategic branches and investment-responsibility cards now keep their state across normal clock updates and structural re-renders.
- Pro Mind no longer performs a full structural rebuild every second when only the information-age number changed; it updates the dynamic age label in place until the actual strategic state changes.
- Added contextual **hover help** to strategic branches, Pro Mind questions, scouting windows, Expansion Permission, manual protection gates, investment responsibilities, and branch concepts such as **What you buy**, **Hidden cost**, and **What breaks it**.
- Added **Battle Story** explanations for all nine matchups. These narrate how the strategy creates time, attention, distance, defensive movement, production tax, or positional advantage.
- PvT includes **The False Front**: show credible pressure on one side, make Terran rotate attention and army, establish the third on the safer opposite side, then bring the mobile force home before the distraction becomes a donation.
- Each PvT branch also gets a branch-specific narrative for Blink, Stargate, or Colossus so the same strategic story is expressed differently by each capability.
- The Battle Story explicitly teaches that pressure can be successful without damage when it buys attention, army displacement, information, or time for a new expansion.

### v1.6.0 — PRO MIND // Unwritten Game

Added the professional-reasoning layer behind the build order.

- Added deep **Pro Mind decision models for all nine 1v1 matchups**: PvT, PvZ, PvP, TvZ, TvP, TvT, ZvT, ZvP, and ZvZ.
- Added **What Would a Pro Ask Right Now?** The active question changes with the game clock and matchup rather than presenting one static doctrine.
- Added purposeful **scouting windows** that explain the question the scout is meant to answer, why the information matters, and which decisions change afterward.
- Added **open strategic branches** framed as capabilities rather than technology names. Every branch explains what it buys, when to choose it, its hidden cost, how to protect the investment, and what invalidates it.
- PvT explicitly teaches the trade between **Blink mobility**, **Stargate information/reach**, and **Robo/Colossus ground stability** rather than declaring one universally correct tech path.
- Added **Expansion Permission**. Third/fourth bases are evaluated as investments that need fresh opponent information plus manually confirmed vision, army coverage, and reinforcement geometry.
- Added **information age**. Quick scouting signals are time-stamped so a previously correct read can become visibly fresh, aging, or stale.
- Added **You Bought This — Now Protect the Investment** for major economy and tech commitments. A Nexus, Command Center, Hatchery, Blink, Colossus, Tank line, Spire, etc. each creates new responsibilities.
- Quick Signals publish live evidence events to Pro Mind and retain their game-time timestamp.
- If opponent race is still **Unknown**, Pro Mind does not fabricate a matchup model. It explicitly keeps options open until the player reports the race.
- The evidence boundary remains strict: without live SC2 integration, Master Coach cannot know exact army positions, production counts, camera state, vision, or whether a prompted action was actually executed unless the player reports it or replay analysis later establishes it.

### v1.5.0 — Coach Lab // Spellbook

Added five systems around the Spellbook concept:

1. **Personal Spell Effectiveness** — explicitly link your replays to a selected strategy and track your own W/L record, coach score, review flags, and sample maturity. The app does not invent a global strategy win rate.
2. **Replay-Driven Spell Evolution** — replay evidence proposes refinements such as earlier supply, production-conversion checkpoints, engagement gates, greed abort triggers, scouting checkpoints, and decision deadlines. Canonical strategies are never silently rewritten; accepted changes become local personal variants.
3. **Second-Screen Quick Signals** — one-tap live reporting for opponent race, fast third, extra production, move-out, air/tech, turtle, hidden tech, and no natural. A compact live mode removes nonessential replay/UI surfaces while playing.
4. **Knowledge Sources & Staleness** — separates official balance sources, curated strategy knowledge, and user-added web references. Every source is patch-tagged or marked as a stable principle / review-needed source.
5. **Post-Game Spell Prescription** — converts replay diagnosis into a bounded five-game experiment with measurable training spells such as Scout on Schedule, Production Conversion, Engagement Gate, Greed Abort, or Worker Rhythm.

### v1.4.0 — Coach Narrative + Strategy Library + Replay Identity

- Replaced the confusing center diagram with a plain-language **Coach Narrative** by default.
- Added a deterministic five-chapter replay strategy story and **Read briefing**.
- Added a **Build & Strategy Library** for all nine 1v1 matchups with Standard and Opponent Fast Third / 3 Bases scenarios.
- Added **Read plan** and **Load into coach**.
- Added explicit **Viewing replay as…** player selection and remembered local replay identity.
- Hid the conceptual decision map by default; it remains optional and clearly labeled as non-literal.

### Earlier releases

- **v1.3.2** — exact current-patch replay BaseBuild selection, Windows SC2 runtime fixes, Build / Decision Queue moved high.
- **v1.3.1** — SC2 protocol/Protobuf compatibility hotfix.
- **v1.3.0** — actual local SC2 Player POV / Observer Truth frames and Moment Intelligence Theater.
- **v1.2.0** — five-second build cues, Build Log, in-app critical moment snapshots.
- **v1.1.0** — observation reconstruction, onboarding, replay discovery, Windows installer.

## Install on Windows

Download the latest release assets:

- **`SC2-Master-Coach-Setup.exe`** — recommended
- **`SC2-Master-Coach-Portable.zip`** — no-install alternative

The installer is per-user, creates shortcuts, installs WebView2 when necessary, registers uninstall support, and associates `.SC2Replay` files with SC2 Master Coach.

The executable remains unsigned under the zero-cost release constraint, so Windows SmartScreen can initially show an **Unknown Publisher** warning.

## The live workflow

The intended live interaction is deliberately small:

```text
MY RACE
  ↓
OPPONENT UNKNOWN
  ↓
Identify opponent race
  ↓
Matchup Pro Mind activates
  ↓
Choose strategy / spell
  ↓
Understand the capability and hidden cost
  ↓
Load into coach
  ↓
Build timing + five-second voice cues
  ↓
Report only high-value scouting signals
  ↓
Pro Mind updates questions, branches, and expansion permission
```

The **Quick Signals** panel exists because Master Coach does not read the live SC2 process. It only knows live information supplied by the player plus the selected plan and timer.

Normal live callouts are intentionally short. Deep explanation belongs in Pro Mind expansion cards and replay review.

## PRO MIND // Unwritten Game

PRO MIND teaches the reasoning that strong players often leave unstated.

### What Would a Pro Ask Right Now?

The central question changes as the game develops. Examples include:

- Is the opponent actually expanding?
- Where is the first gas / production investment going?
- What capability am I missing before the next power spike?
- Can I buy another base without dying before it pays back?
- What has the opponent built to answer my current army?
- Has the last scouting read become stale?

Each question includes an **Unspoken Rule** explaining the deeper strategic principle.

### Strategic branches are capabilities

The UI does not reduce decisions to “pick Air” or “pick Colossus.” A branch explains:

- **What you buy** — mobility, information, stable splash, siege control, reinforcement speed, etc.
- **Choose when** — evidence that makes the capability valuable.
- **Hidden cost** — what resources, tempo, flexibility, or attention are surrendered.
- **How to protect it** — responsibilities created by the investment.
- **What breaks it** — evidence that invalidates the branch.

For PvT, for example:

- **Blink / mobility** buys map presence, preservation, drop response, and flexibility.
- **Stargate / air information** buys repeatable vision, harassment, and map reach.
- **Robo / Colossus stability** buys a protected ground-army anchor and ranged splash geometry.

Strategic branches remain open while the clock advances. Hovering the branch, question, scouting, or investment help markers explains what each concept means without forcing another panel open.

### Battle Stories

The strategy layer also tells a short battlefield story so the player can picture *how* the advantage is created.

Example PvT — **The False Front**:

```text
Blink Stalkers show pressure on the right.
Terran rotates Bio to respect the threat.
A Probe places the third Nexus on the safer opposite side.
The Stalkers disengage before the rotation becomes a real fight.
The army returns to screen the Nexus while it begins paying back.
```

The important lesson is not “attack right.” It is:

> **A credible threat can protect economy by buying attention, army displacement, and time even when it deals no damage.**

Other matchup stories teach the same causal style through different mechanics: forcing defensive larva in PvZ, creating local-superiority uncertainty in PvP, taxing Zerg with Terran mobility, splitting Protoss attention in TvP, controlling siege roads in TvT, using creep as warning time in ZvT, reserving larva around Protoss power spikes in ZvP, and threatening Drones to buy your own Drone cycle in ZvZ.

### Scouting has a purpose

A scout is not displayed merely as a timestamp. It carries:

```text
SCOUT WINDOW
What question am I answering?
Why does it matter?
Which decisions change after the answer?
```

Quick Signals are timestamped. As time passes, Pro Mind labels the latest reported information as **fresh**, **aging**, or **stale**.

### Expansion Permission

Expansions are treated as investments in future power rather than automatic build-order steps.

The coach evaluates:

- whether a fresh threat / production read exists;
- whether current evidence indicates pressure or an all-in;
- manually confirmed warning / vision;
- manually confirmed army coverage;
- manually confirmed reinforcement / rally geometry.

The result is:

- **OPEN** — current evidence and manual protection gates support the expansion;
- **CAUTION** — one or more important conditions remain unresolved;
- **HOLD** — reported evidence indicates an immediate punish window.

Manual gates are intentional. Without live integration the application must not pretend it can see your army or Pylon/creep/siege geometry.

### You Bought This — Now Protect the Investment

Major purchases create responsibilities. Examples:

- A **third Nexus** creates a larger defensive footprint and requires warning, warp access, army coverage, and a plan for when not to defend it.
- **Colossi** require body units, vision, retreat space, and awareness of the Viking transition.
- **Blink** should create scouting, preservation, drop defense, edge pressure, or rotation value; otherwise its mobility is unrealized.
- A **Tank line** requires vision, flank protection, and safe repositioning.
- A **Drone cycle** is future income purchased by temporarily giving up immediate army larva.

## Build & Strategy Library

The library filters by:

- your race;
- opponent race;
- scenario;
- strategy/build.

Opponent race can remain **Unknown** until you identify it. Once known, matchup-specific strategies populate.

All nine 1v1 matchups include at least:

- **Standard** — flexible matchup framework with benchmark timing windows.
- **Opponent Fast Third / 3 Bases** — response to early economic expansion.

**Read plan** speaks the concept and timing milestones. **Load into coach** replaces the active Build / Decision Queue while preserving five-second preparation cues.

## Coach Lab // Spellbook

Coach Lab makes the application's epistemic boundary visible and lets the player tune the coaching system.

### Personal Spell Effectiveness

A strategy's effectiveness is based only on replays explicitly linked to it. The UI reports wins/losses, linked games, average replay score, review flags, and sample maturity. Popularity is not presented as win-rate evidence.

### Replay-Driven Spell Evolution

Replay patterns can propose local personal variants:

- sustained supply block → move supply earlier;
- bank conversion lag → add production checkpoint;
- bad exchange → add engagement gate;
- greed-under-pressure → add greed abort condition;
- slow observation → add scouting/camera checkpoint;
- slow response → add decision deadline.

The canonical spell remains unchanged until the player deliberately creates a personal variant.

### Quick Signals / second-screen mode

Available signals include Fast third, Extra production, Move-out, Air / tech, Turtle, Hidden tech, and No natural. Compact live mode suppresses nonessential review UI while playing.

### Knowledge Sources & Staleness

The source panel separates official Blizzard balance information, MBMapps curated strategy synthesis, and user-added web/build/replay references. Sources are patch-tagged or classified as stable principle / verify patch / review stale.

### Post-Game Spell Prescription

Replay diagnosis can be converted into a five-game experiment: baseline, focus, repeat, stress, verify. The point is to improve one important behavior rather than continually changing builds.

## How the app knows which replay player is you

A `.SC2Replay` contains all players. Master Coach analyzes each player independently.

When a replay opens, it shows:

> **Viewing replay as: [player name · race · result]**

Identity resolution is explicit selection → remembered replay identity → local profile-name match → unique preferred-race match → visibly unconfirmed temporary fallback.

The selected player ID drives strategy narrative, observation timing, engagement review, and Player POV rendering.

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

Replay-derived facts, plausible visibility, behavioral proxies, and coaching interpretations remain distinct.

## Actual game frames

Replay parsing works without launching SC2. Actual **Player POV / Observer Truth** frames require StarCraft II to be installed locally and launched at least once.

The renderer uses the replay's exact BaseBuild/DataVersion, launches the matching local SC2 binary, validates the Windows `Support64` runtime, advances to the critical timestamp, and requests RGB frame data from StarCraft II.

- **Player POV** — engine-rendered replay with fog enabled for the selected player.
- **Observer Truth** — same timestamp/camera with fog disabled.
- **Tactical Map** — Master Coach analytical reconstruction, not literal terrain.

## Replay case workspace

Each real replay is persisted locally:

```text
Documents\SC2 Master Coach\Replays\<case-id>\
├── replay.SC2Replay
├── analysis.json
├── manifest.json
└── frames\
```

## Free release pipeline

The Windows GitHub Actions pipeline installs dependencies, verifies SC2 protocol compatibility, syntax-checks all HUD JavaScript, runs tests, builds the desktop bundle with PyInstaller, creates the NSIS installer and portable ZIP, and publishes the semantic-version release.

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

The Spellbook teaches the spell. **PRO MIND teaches why the player should cast it, what it costs, how it creates time, and when it stops being correct.**
