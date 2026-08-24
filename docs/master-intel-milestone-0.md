# Master Intel — Milestone 0 Implementation Record

Status: implementation branch

Branch: `master-intel-m0`

Base: `v1.11-dev`

Release state: **not released**

## Objective

Establish an offline-first product shell for replay intelligence, local master-player references, evidence-scoped comparison, and practice planning without removing the existing Combat HUD.

The default product journey becomes:

```text
First-run onboarding
        ↓
Import local replay or player pack
        ↓
Master Intel Home
        ↓
Replay analysis / Player dossier
        ↓
Compatibility-gated comparison
        ↓
Evidence-bounded practice
```

The existing Combat HUD remains available at `/hud` as an explicit secondary destination.

## Implemented surfaces

### Home

- Local replay count
- Installed player-pack count
- Offline readiness status
- Recent analyzed games
- Improvement-priority placeholders that disclose missing evidence
- Direct replay, pack, and synthetic-demo actions

### Players

- Search and filter by player, pack, race, and identity confidence
- Explicit verified, unverified, and synthetic labels
- Patch and replay-coverage summaries
- Local dossier navigation

### Player dossier

- Identity and alias boundary
- Patch, matchup, map, and replay coverage
- Opening preferences
- Build families
- Timing distributions
- Economy, production, aggression, and map-adaptation tendencies
- Small-sample and synthetic-data warnings

### Replay analysis

- Durable local replay case
- Map, duration, patch, matchup, and player metadata
- Parser-exposed timeline evidence
- Explicit separation between observed values and future interpretation models
- No fabricated master comparison when compatible evidence is unavailable

### Compare

- Local replay selection
- Local player-reference selection
- Race, matchup, and patch compatibility contract
- Calculation withheld until normalized replay fingerprints exist

### Practice

- One-behavior-at-a-time workflow
- Provisional targets clearly labeled
- No claim that Milestone 0 placeholders are calculated diagnoses

### Settings

- Offline guarantee and self-only browser connection policy
- Manual update workflow
- Local data paths and freshness
- Player-pack removal
- Onboarding reset and UI-preference reset
- Explicit roadmap boundary for backup, restore, replay deletion, and index rebuild

## Local API

The `master_intel` Flask blueprint exposes:

```text
GET    /api/intel/status
GET    /api/intel/recent
GET    /api/intel/cases/<case_id>
GET    /api/intel/player-packs
GET    /api/intel/players
POST   /api/intel/player-packs/import
POST   /api/intel/demo/install
DELETE /api/intel/player-packs/<pack_id>
GET    /api/intel/offline-policy
```

Player packs are UTF-8 JSON, capped at 5 MB, validated before storage, and constrained to a local application-data directory. Pack and player identifiers cannot escape that directory.

## Offline boundary

The default runtime does not perform background release checks or require a cloud service.

The Flask application applies:

```text
connect-src 'self'
object-src 'none'
frame-ancestors 'none'
referrer-policy: no-referrer
```

Compatibility update endpoints remain present for older UI code, but return a manual-only response and do not contact GitHub.

Build-time dependency retrieval is distinct from runtime behavior. The packaged application is expected to contain its static assets, demo pack, parser dependencies, and Strategy Science schema.

## Trust boundaries

### Identity

A replay name does not verify a professional player.

Every player record exposes:

- verified or unverified status;
- confidence;
- source pack;
- synthetic status;
- declared patch and replay coverage.

### Evidence

The product distinguishes:

- replay-observed metadata;
- pack-declared tendencies;
- unavailable future calculations;
- provisional workflow suggestions.

Missing evidence never becomes a positive conclusion.

### Compatibility

Master comparison requires matching race, matchup, and compatible patch coverage. Milestone 0 establishes the gate but intentionally does not fabricate timing deltas before the normalized fingerprint pipeline exists.

## Persistence

Replay cases are content-addressed by SHA-256 and stored under the local replay workspace. Manifest schema `1.1` adds:

- patch/game version;
- matchup;
- stable `created_at`;
- refreshed `updated_at`;
- digest and durable case identifier.

Player packs are stored separately under the application-data `PlayerPacks` directory with a normalized payload hash and import timestamp.

## Accessibility and responsive baseline

- Skip link
- Semantic primary navigation
- Focus-visible styling
- Dialog focus restoration
- Route-heading focus after navigation
- `aria-live` status and toast regions
- 18-pixel desktop body type
- Responsive layouts at 1180, 850, and 620 pixels
- Reduced-motion handling
- No horizontal page overflow
- Lazy-loaded route modules

## Verification

Run locally:

```bash
python -m pip install -r requirements-desktop.txt
python -m pip install pytest
python -m pytest -q
```

Check Master Intel ES modules:

```powershell
Get-ChildItem static\master-intel -Filter *.js -Recurse | ForEach-Object {
  Get-Content -Raw $_.FullName | node --check --input-type=module
}
```

The branch-specific GitHub Actions workflow additionally builds a Windows PyInstaller smoke artifact and verifies that the package contains:

- Master Intel application JavaScript;
- Master Intel design system;
- bundled synthetic demonstration pack;
- Python Strategy Science SQLite schema.

## Acceptance matrix

| Requirement | Evidence |
|---|---|
| Master Intel is the default | `/` serves the Master Intel shell |
| Combat HUD preserved | `/hud` serves the legacy HUD and return action |
| Core workflow is offline | CSP self-only connection policy and disabled online update check |
| Replay analysis persists | SHA-addressed case, manifest, analysis, replay, and frame directory |
| Player packs are bounded | schema validation, size cap, normalized IDs, local-only storage |
| Identity claims are explicit | verified/unverified/synthetic labels and provenance |
| Comparison does not overclaim | compatibility gate and withheld future calculation |
| UI is accessible/responsive | skip link, focus behavior, large type, reduced-motion rules |
| Packaged build is guarded | branch CI, pytest, JS parse, PyInstaller asset assertions |

## Deliberately deferred

- Normalized build fingerprint schema
- Replay-to-master calculation engine
- Three-moment debrief model
- Replay-level evidence links inside player dossiers
- Practice-progress measurement
- Backup/restore and per-replay deletion
- Automatic strategy recommendation from the Master Intel evidence store
- Any public release, tag, or update of `main`

## Rollback

No stable branch was modified. Delete `master-intel-m0` or close its pull request to abandon this slice. `v1.11-dev` and `main` remain the rollback authorities until review and merge.
