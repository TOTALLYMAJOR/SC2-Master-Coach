# Capability Register

Authority: [`.project/state.json`](../../.project/state.json). `TESTED` below means the cited local repository tests passed no earlier than 2026-08-25. It does not imply real Windows, device, user, deployment, or commercial proof.

| Capability | Intended Outcome | State | Evidence | Missing Proof | Blocker |
| --- | --- | --- | --- | --- | --- |
| CAP-001 Master Intel shell | Make replay intelligence the executable default while preserving `/hud` | TESTED | `app.py:index`; `test_master_intel_is_default_and_legacy_hud_remains_explicit` | Clean packaged launch and human acceptance | BLK-001, BLK-004, BLK-005 |
| CAP-002 Replay ingestion and case workspace | Persist bounded, content-addressed local replay evidence | TESTED | `case_workspace.py:create_or_update_case`; replay persistence test | Real supported replay on clean Windows | BLK-001, BLK-004 |
| CAP-003 Player-pack management | Import local references without inventing identity | TESTED | `master_intel.py:validate_player_pack`; integrity/removal test | Real trusted pack operations and user value | BLK-004 |
| CAP-004 Normalized replay hard data and compatibility gate | Normalize replay facts once; calculate bounded local metrics; refuse unsupported causality or comparison | TESTED | `replay_intelligence.py:build_player_hard_data`; normalized hard-data and withholding tests | Real-replay producer cycles and provenance-backed comparison calculation | BLK-002, BLK-004 |
| CAP-005 Combat HUD | Surface one evidence-bounded live decision | TESTED | `static/v110-hud.js`; HUD command-shell test | Real-match comprehension and outcome | BLK-003, BLK-004, BLK-005 |
| CAP-006 Adaptive checkpoints and progression | Turn a selected plan and self-reports into bounded practice history | TESTED | `buildCheckpoints`; checkpoint persistence test | Expert benchmark and player outcome validation | BLK-003, BLK-004 |
| CAP-007 Strategic OS | Own live Mission, Policy, Intel, Permission, Obligation, and Decision state | TESTED | `snapshot`; six-object kernel test | Real-match acceptance | BLK-003, BLK-004 |
| CAP-008 Strategy Compiler | Compile matchup policies with assumptions, scouts, and fallbacks | TESTED | compiler engine; nine-matchup test | Expert and outcome validation | BLK-003, BLK-004 |
| CAP-009 2v2 Team Composer | Select bounded role-based team operations | TESTED | Team Composer; ten-archetype test | Expert and real-team validation | BLK-003, BLK-004 |
| CAP-010 Python shadow Digital Twin | Return proof-carrying PvT advice without mutating canonical state | TESTED | `ScienceRuntime`; non-mutation test | Wider matchup scope, calibration, and human validation | BLK-003, BLK-004 |
| CAP-011 Offline tactical voice | Recognize constrained phrases locally with manual fallback | TESTED | `listen_once`; endpoint contract test | Real packaged model and microphone acceptance | BLK-001, BLK-004 |
| CAP-012 Replay frame-capture boundary | Resolve exact builds and fail explicitly when capture is unavailable | TESTED | `capture_replay_views`; filename safety test | Successful clean-Windows real-replay capture | BLK-001, BLK-004 |
| CAP-013 Windows release definition | Build, package, upload, and publish Windows artifacts | TESTED | release workflow; packaging-trigger test | Current-branch hosted build and artifact receipt | BLK-001, BLK-004 |
| CAP-014 Offline runtime boundary | Keep browser/service traffic self-only and updates manual | TESTED | CSP and loopback configuration; offline-boundary test | Packaged runtime network observation | BLK-001 |
| CAP-015 Replay decision-context reconstruction | Reconstruct bounded information state before commitments without hindsight or intent claims | TESTED | `replay_intelligence.py:attach_decision_context`; decision-context and enrichment tests | Exact fog of war, matchup policy, cross-replay cohort, and human validation | BLK-003, BLK-004 |
| CAP-016 Longitudinal replay learning fingerprints | Compare only compatible local games, detect recurring opening signatures, and return one provisional correction | TESTED | `replay_intelligence.py:build_case_learning_summary`; strict-cohort test | Clean-Windows multi-replay acceptance and expert/player outcome validation | BLK-001, BLK-003, BLK-004 |
| CAP-017 Evidence graph and dependency control plane | Tie proof, capability, blocker, and dependency claims to registered graph edges | TESTED | `docs/project/EVIDENCE_GRAPH.md`; `docs/project/DEPENDENCIES.md`; graph validation test | Target-environment and user-outcome proof remain outside this governance capability | none |

## Registered but not operational Strategy Science work

The fifteen-entry Strategy Science registry is a design and dependency registry, not fifteen implemented user capabilities. `ScienceRuntime.health()` reports the Digital Twin as ready when enabled, proof/invariant foundations as `foundation_ready`, strategy discovery as `experimental_not_implemented`, and the remaining entries as `design_only`. These entries are not promoted into separate `IMPLEMENTED` capabilities here.

## Promotion Rules

- Source present supports at most `IMPLEMENTED`.
- A current passing relevant test supports at most `TESTED`.
- Observed target-environment behavior is required for `VERIFIED`.
- A provider or release receipt is required for `DEPLOYED`.
- Consented real usage is required for `USED`.
- Transaction and outcome evidence is required for `COMMERCIALLY_PROVEN`.
