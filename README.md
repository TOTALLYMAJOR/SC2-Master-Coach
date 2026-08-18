# SC2 Master Coach — Team Composer + Command HUD + Replay Intelligence

<img width="1536" height="1024" alt="SC2 Master Coach marketing artwork" src="https://github.com/user-attachments/assets/606eed8f-538c-40b8-b3b3-cac639a2ecf6" />

**Created by MBMapps**

SC2 Master Coach is a local-first StarCraft II coaching application built around one learning loop:

> **State the match → choose a plan → understand the story → execute → scout → adapt → replay → diagnose → refine**

The default experience is now a **2v2 Team Composer**. The original dense Command HUD remains available as **Advanced Command Center** for deeper Pro Mind, Spellbook, replay, and tactical analysis.

The current strategy/build baseline targets **StarCraft II 5.0.16b**, including the 5.0.16 eight-worker starting economy and the later 5.0.16b balance hotfix. Build timings are benchmark windows: **scouting evidence outranks a memorized script**.

## Release Notes

### v1.7.0 — Team Composer Default Experience

- Replaced the dense Command HUD as the default first screen with a calmer **Team Composer** workflow.
- The first decision is now the actual match: **my race + ally race + opponent 1 + opponent 2**. Opponents can remain **Unknown** until scouting identifies them.
- Added the current 5.0.16 2v2 map pool as optional context rather than a required setup burden.
- Added optional skill and coordination inputs so highly synchronized or mechanically demanding plans can be ranked appropriately.
- Added **exactly 10 ranked team-plan archetypes** rather than presenting every system at once:
  1. Shield & Scale
  2. The False Front
  3. Hammer & Anvil
  4. Lantern & Blade
  5. Fortress & Flank
  6. The Hidden Hand
  7. Hold the Door
  8. Siege & Harvest
  9. Two Doors
  10. The Wild Card
- Strategy ranking uses race-role fit, mechanical load, opponent information, and coordination requirement. It does **not** present popularity as global win-rate evidence.
- Every plan includes a **Battle Story**, **your role**, **ally role**, **your build windows**, **ally build windows**, **critical scout**, **abort condition**, and team rhythm.
- Team roles include **Screen, Anchor, Scout, Harasser, Expander, and Closer**. The same strategy can assign those roles differently depending on the two allied races.
- Added a dedicated **Battle Plan** view so the plan can be understood without opening Pro Mind, Spellbook, threat matrices, or replay tools.
- Added a stripped-down **Live Coach** with only the current personal action, ally objective, strategic reason, next timing windows, high-value scouting signals, opponent-race updates, timer controls, and optional speech.
- Live build cues use tolerant timing windows and five-second preparation speech. They remain coaching prompts, not proof that the action happened in-game.
- Added **Advanced Command Center** as an explicit escape hatch back to the original full application. No existing Pro Mind, Spellbook, replay, renderer, or tactical-analysis capability was removed.

### v1.6.1 — Persistent Branches + Battle Stories + Hover Help

- Fixed the Pro Mind branch-details bug where a branch could open and immediately close because the live clock rebuilt the panel.
- Open strategic branches and investment-responsibility cards keep state across normal clock updates.
- Added contextual hover help to branch concepts, scouting, Expansion Permission, manual protection gates, and investment responsibilities.
- Added Battle Story explanations for all nine 1v1 matchups.
- PvT includes **The False Front**: show credible pressure, make Terran rotate, establish the third on the safer side, then bring the mobile force home before the distraction becomes a donation.
- Battle Stories teach that pressure can succeed without damage when it buys attention, army displacement, information, or time.

### v1.6.0 — PRO MIND // Unwritten Game

- Added deep Pro Mind decision models for all nine 1v1 matchups.
- Added **What Would a Pro Ask Right Now?**
- Added purposeful scouting windows that explain what question the scout is meant to answer.
- Added strategic branches framed as capabilities rather than technology labels.
- Added Expansion Permission, information age, and investment-protection reasoning.
- Maintained the strict live evidence boundary: without game integration, Master Coach cannot know exact army positions, production counts, camera state, vision, or whether a prompted action was actually executed unless the player reports it or replay analysis later establishes it.

### v1.5.0 — Coach Lab // Spellbook

- Personal Spell Effectiveness based only on explicitly linked replays.
- Replay-Driven Spell Evolution with local personal variants.
- Second-Screen Quick Signals and Compact Live mode.
- Knowledge Sources & Staleness.
- Post-Game Spell Prescription with bounded five-game experiments.

### v1.4.0 — Coach Narrative + Strategy Library + Replay Identity

- Replaced the confusing center diagram with a plain-language Coach Narrative by default.
- Added deterministic replay strategy stories and **Read briefing**.
- Added a 1v1 Build & Strategy Library for all nine matchups.
- Added **Read plan**, **Load into coach**, and explicit replay-player identity selection.

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

## Default workflow — Team Composer

```text
ME + ALLY + OPPONENT 1 + OPPONENT 2
                ↓
        OPTIONAL MAP / SKILL
                ↓
       SHOW 10 TEAM STRATEGIES
                ↓
          CHOOSE ONE PLAN
                ↓
             STORY
          YOUR ROLE
          ALLY ROLE
        TIMING WINDOWS
       SCOUT / ABORT RULE
                ↓
          START LIVE COACH
                ↓
       REPORT ONLY BIG SIGNALS
                ↓
            REPLAY REVIEW
```

Opponent races can remain **Unknown**. Unknown information lowers recommendation confidence rather than causing the app to invent a matchup.

## The 10 team-plan families

### Shield & Scale

Safe macro. Both allies preserve a defensive spine, scout for exceptions, and compound economy only when the opponents fail to demonstrate a punish window.

### The False Front

One ally shows a credible threat and forces movement; the partner spends that attention window on economy and reinforcement access. Damage is optional. Time and army displacement are the real resource.

### Hammer & Anvil

One player fixes the opposing army in place while the second arrives through a different lane or timing. The strategy fails when the two attacks become independent rather than synchronized.

### Lantern & Blade

One player owns information and keeps tech/movement visible; the partner concentrates resources into the composition that exploits those reads.

### Fortress & Flank

One army creates the stable front. The other refuses to stack behind it and instead pressures edges, reinforcements, drops, run-bys, or exposed expansions.

### The Hidden Hand

One ally presents a conventional shell while the other hides or accelerates a tech payoff. The surprise must arrive before the opponents can cheaply adapt.

### Hold the Door

Anti-rush posture. The team shares early warning and compact reinforcement until both opponent economies are confirmed, then converts an overcommitted rush into a counterattack or economic lead.

### Siege & Harvest

One player contains roads, ramps, air lanes, creep edges, or reinforcement paths while the partner expands behind restricted enemy movement.

### Two Doors

Both allies threaten different places close enough in time that the opponents must divide a concentrated response.

### The Wild Card

High-risk, high-learning asymmetric play: transport, proxy, hidden tech, Nydus-style access, or another unusual route. Designed to create rare game states rather than pretend to be universally safe.

## Team roles

Each strategy assigns a role to each ally:

- **Screen** — creates a credible threat or denies movement.
- **Anchor** — builds the stable army that can hold territory.
- **Scout** — maintains information and detects transitions.
- **Harasser** — creates attention, economic tax, or positional pressure.
- **Expander** — converts the partner's pressure window into future power.
- **Closer** — builds the composition intended to finish favorable fights.

Role assignment is race-aware. Protoss, Terran, and Zerg express the same strategic role through different units, reinforcement systems, and information tools.

## Minimal Live Coach

Live mode intentionally suppresses most analysis surfaces. It prioritizes:

- your current action;
- ally objective;
- why the team maneuver matters;
- the next three timing windows;
- opponent-race updates;
- high-value scouting signals;
- timer controls;
- optional five-second spoken build preparation cues.

High-value live signals include:

- No natural
- Fast third
- Extra production
- Move-out
- Air / tech
- Turtle
- Hidden tech

The coach does not read the live SC2 process. Those signals are player-reported evidence.

## Advanced Command Center

The original full HUD remains available through **Advanced Command Center**. It contains:

- Build & Strategy Library
- PRO MIND // Unwritten Game
- Coach Lab // Spellbook
- scouting evidence
- threat model
- tactical priority queue
- resource telemetry
- Build Log
- replay analysis
- Moment Intelligence Theater
- Player POV / Observer Truth rendering
- replay identity and narrative analysis

Nothing in v1.7 removes those systems; it changes **when** the player is asked to look at them.

## PRO MIND // Unwritten Game

PRO MIND teaches the reasoning that strong players often leave unstated.

It asks questions such as:

- Is the opponent actually expanding?
- Where is the first gas / production investment going?
- What capability am I missing before the next power spike?
- Can I buy another base without dying before it pays back?
- What has the opponent built to answer my current army?
- Has the last scouting read become stale?

Strategic branches explain:

- what capability you buy;
- when to choose it;
- hidden cost;
- how to protect the investment;
- what evidence breaks the branch.

### Battle Stories

A strategy also carries a memorable causal story. Example PvT — **The False Front**:

```text
Blink Stalkers show pressure.
Terran rotates Bio to respect the threat.
A Probe places the third Nexus on the safer opposite side.
The Stalkers disengage before the rotation becomes a real fight.
The army returns to screen the Nexus while it begins paying back.
```

The lesson is not “attack right.” It is:

> **A credible threat can protect economy by buying attention, army displacement, and time even when it deals no damage.**

## Coach Lab // Spellbook

Coach Lab makes the application's epistemic boundary visible and lets the player tune the coaching system.

It includes:

- Personal Spell Effectiveness
- Replay-Driven Spell Evolution
- Quick Signals / second-screen mode
- Knowledge Sources & Staleness
- Post-Game Spell Prescription

A strategy's effectiveness is based only on replays explicitly linked to it. Popularity is not presented as win-rate evidence.

## How the app knows which replay player is you

A `.SC2Replay` contains all players. Master Coach analyzes each player independently.

When a replay opens, it shows:

> **Viewing replay as: [player name · race · result]**

Identity resolution is explicit selection → remembered replay identity → local profile-name match → unique preferred-race match → visibly unconfirmed temporary fallback.

The selected player ID drives strategy narrative, observation timing, engagement review, and Player POV rendering.

## Replay Strategy Narrative

After a replay, the Coach Narrative tells the game as five chapters:

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

The Team Composer chooses the battle plan. The Spellbook teaches the spell. **PRO MIND teaches why to cast it, what it costs, how it creates time, and when it stops being correct.**
