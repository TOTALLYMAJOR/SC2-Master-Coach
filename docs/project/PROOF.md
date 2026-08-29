# Proof Register

Verdicts apply only to the named claim and evidence boundary. Lifecycle state remains in [CAPABILITIES.md](CAPABILITIES.md).

| Claim | Required Evidence | Current Evidence | Verdict |
| --- | --- | --- | --- |
| Master Intel is served at `/`, launched by the Windows shell, and Guided Execution remains compatible at `/hud` | Browser and desktop route implementation plus passing tests | `app.py`; `desktop_app.py`; Master Intel and Windows desktop route tests | PROVEN LOCALLY |
| Personal replay coaching requires explicit replay-player identity and shows the action before expert evidence detail | Player-scoped learning contract, API/UI guard, focused tests, and isolated browser observation | `replay_intelligence.py`; replay route; selected-player tests; screenshots 26–27 | PROVEN LOCALLY |
| Observed-replay corrections require calculated anchors before activation; synthetic and unsafe persisted cases cannot enter Guided Execution as replay-derived coaching | Correction contract, provenance-gated versioned storage, Replay/Practice/HUD source, focused tests, and isolated browser denial checks | `replay_intelligence.py`; Replay/Practice/HUD routes; screenshots 42–44; injected legacy-state browser check | PROVEN LOCALLY |
| Future checkpoint reports are blocked while recent missed checkpoints remain recoverable as late | Runtime timing guard, UI preview contract, harness coverage, and isolated browser observation | `static/live-checkpoints.js`; live-checkpoint harness; screenshot 28 and browser checkpoint snapshot | PROVEN LOCALLY |
| Mobile deployment, required focus reporting, and diagnostic overlays keep orientation and primary actions reachable | Responsive/focus source, narrow-viewport screenshots, and isolated browser observation | Guided Execution source and accessibility tests; screenshots 37, 39–41 | PROVEN LOCALLY |
| An interrupted Guided Execution session can recover the same plan and reports without inventing elapsed time or player results | Versioned snapshot, paused recovery, persistence-safe receipt finalization, focused tests, and isolated browser observation | `static/v110-hud.js`; session-continuity test; screenshots 16–18 | PROVEN LOCALLY |
| A chronologically later replay evaluates the active criterion only under matching identity, context, complete five-minute coverage, and signal-specific observability; a bounded local receipt survives navigation | Strict fingerprint, chronology, observation-window, and receipt contracts plus focused tests and isolated synthetic UI review | `replay_intelligence.py`; replay/app/practice routes; replay-intelligence and Master Intel tests; screenshot 53 | PROVEN LOCALLY |
| First-five-minute recurrence ignores outcome-dependent total match length, ranks one provisional correction by a disclosed conservative recurrence bound, and advances distinct-session reports only to review readiness with no mastery claim | Opening-compatibility, Wilson-ranking, distinct-session-confidence, graduation, horizon, and negative-state tests plus isolated synthetic UI review | `replay_intelligence.py`; `coach-progression.js`; Practice and Guided Execution; current isolated browser evidence | PROVEN LOCALLY |
| Partial Master Intel resource failures remain distinct from empty libraries and offer bounded recovery | Independent resource states, stale-data preservation, retry behavior, static tests, and isolated injected-failure observation | Master Intel shell/routes; recovery tests; screenshot 21 | PROVEN LOCALLY |
| A local support report is actionable without exposing paths or replay/player identity | Endpoint contract, privacy assertions, download behavior, and isolated browser observation | `master_intel.py:support_report`; support-report test; screenshots 19–20 | PROVEN LOCALLY |
| Replay case storage atomically commits one replay-bound metadata generation, rejects replay or cross-file identity drift, preserves supplied patch and matchup for synthetic contract inputs, and repairs stored-byte tampering only from the authorized source | Persistence and validated-read implementation plus tamper, interruption, restart, and corrupt-copy tests | `case_workspace.py`; case workspace tests | PROVEN LOCALLY |
| Corrupt or pre-1.1 replay metadata cannot supply facts or coaching but remains visible as a privacy-safe re-import placeholder when its stored replay exists | Fail-closed production reads, recovery-only listing, and focused tests | `case_workspace.py:load_case_records`; `master_intel.py:list_recent_cases`; legacy/corrupt-case tests | PROVEN LOCALLY |
| The genuine-replay smoke contract uses production enrichment, requires supported dense 1v1 evidence, validates the persisted generation, withholds proof class for mocked calls, and binds a passing receipt to an exact artifact or the same clean source | Smoke implementation plus adversarial parser-shape, source-drift, artifact-tamper, receipt-privacy, and mocked-call tests | `scripts/real_replay_smoke.py`; `tests/test_real_replay_smoke.py` | PROVEN LOCALLY |
| A genuine `.SC2Replay` preserves parser-derived patch, matchup, and content identity through the case workspace | A consented genuine replay parsed and persisted end to end | No genuine replay fixture or target-player receipt inspected | UNVERIFIED |
| Player-pack import is bounded and identity-aware | Validation/storage implementation plus integrity and path-escape tests | `master_intel.py`; Master Intel tests | PROVEN |
| Missing normalized evidence does not become master comparison | Guard implementation plus passing withheld-calculation test | Compare/practice routes and test | PROVEN |
| Live coaching uses reported evidence rather than hidden game state | Kernel/HUD implementation plus branch and boundary tests; real-session observation for operational proof | Source and local tests only | PARTIALLY_PROVEN |
| Strategy guidance is correct and improves player outcomes | Current-patch expert review, real player trials, methodology, and measured outcomes | Derived benchmarks and explicit expert-review warning | UNVERIFIED |
| Python advice cannot mutate Strategic OS authority | Contract, runtime, and passing non-mutation tests | ADR-002, architecture tests, runtime test | PROVEN |
| Offline voice works on the target machine | Packaged model, real microphone, recognition transcript, and fallback evidence | Mocked/local contract tests and packaging definition | PARTIALLY_PROVEN |
| Real SC2 frames can be captured reliably | Supported replay, exact installed build, successful image artifacts, and fallback record | Capture implementation and boundary tests | UNVERIFIED |
| Runtime rejects non-loopback Host values and cross-origin browser mutation | Configuration, application guard, local request tests, and packaged runtime network observation | CSP, bind configuration, Host/Origin guard, `403` local probe, and local tests | PARTIALLY_PROVEN |
| A Windows package can be built and installed from the current branch | Current exact-SHA CI receipt, artifact checksum, clean install and launch | Exact-SHA draft workflow, dependency pins, proof kit, and static packaging tests only | UNVERIFIED |
| The personal installer cannot select a broad existing directory, refuses unsafe uninstall paths, stops on WebView2 bootstrap failure, and does not replace the default `.SC2Replay` association | Installer source plus focused static contract tests | `installer/sc2-master-coach.nsi`; Windows desktop tests | PROVEN LOCALLY |
| Patched protobuf imports the legacy SC2 protocol descriptors through explicit pure-Python compatibility mode | Isolated patched-runtime import plus repository and workflow compatibility tests | `protobuf==5.29.6`; `sc2_frame_capture.py`; protocol tests | PROVEN LOCALLY |
| The `1.14.0` candidate is built, verified, or available to users | Version-matched tag, provider receipt, draft assets, clean-Windows acceptance, and unchanged publication receipt | Worktree version identity and workflow configuration only | UNVERIFIED |
| Evidence graph and dependency register are canonical project-state controls | Human graph/register docs, machine ledger sections, checker validation, and passing graph test | `EVIDENCE_GRAPH.md`; `DEPENDENCIES.md`; `.project/state.json`; graph validation test | PROVEN |
| Real players use, retain, or improve with the product | Consented usage cohorts and measured outcome evidence | None inspected | UNVERIFIED |
| The product has commercial demand or revenue | Offer, price, prospect, payment, and retention evidence | Buyer hypothesis only | UNVERIFIED |

## Current Local Proof Record

- Date: 2026-08-28
- Scope: active local checkout only
- Command: `.venv/bin/python -m pytest -q --disable-warnings`
- Result: `249 passed, 1 skipped, 100 warnings` in the current local reconciliation run. The skipped test requires an explicitly supplied genuine replay; the warnings are dependency deprecations and do not establish target-runtime failure.
- Non-claims: no Windows package, real microphone, real SC2 process, provider, customer, or payment was exercised by that command.

## Control-Plane Proof Record

- Date: 2026-08-28
- Scope: evidence graph and dependency register controls only
- Commands:
  - `python3 scripts/check_project_state.py`
  - `.venv/bin/python -m pytest tests/test_project_state_control.py -q`
- Result: canonical state check passed with 20 capabilities, 4 blockers, and 1 NEXT proof event; the final full suite passed 249 tests with one intentionally skipped genuine-replay test.
- Non-claims: this validates graph/reference controls only. It does not prove clean Windows operation, replay capture, microphone behavior, player improvement, release availability, usage, or revenue.

## Evidence Required for External Truth

- Deployment: provider workflow/release receipt tied to exact commit and artifact checksum.
- Windows operation: clean-machine install, launch, replay, capture/voice result, and logs.
- Usage: consented product events or a named acceptance record.
- Outcome: defined baseline, post-use measurement, sample, and method.
- Revenue: provider transaction/settlement evidence; internal intent is insufficient.
