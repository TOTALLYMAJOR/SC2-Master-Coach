# Proof Register

Verdicts apply only to the named claim and evidence boundary. Lifecycle state remains in [CAPABILITIES.md](CAPABILITIES.md).

| Claim | Required Evidence | Current Evidence | Verdict |
| --- | --- | --- | --- |
| Master Intel is served at `/` and Combat HUD at `/hud` | Route implementation plus passing route test | `app.py`; `test_master_intel_is_default_and_legacy_hud_remains_explicit` | PROVEN |
| Replay cases preserve patch, matchup, and content identity | Persistence implementation plus passing real-fixture test | `case_workspace.py`; replay persistence test | PROVEN |
| Player-pack import is bounded and identity-aware | Validation/storage implementation plus integrity and path-escape tests | `master_intel.py`; Master Intel tests | PROVEN |
| Missing normalized evidence does not become master comparison | Guard implementation plus passing withheld-calculation test | Compare/practice routes and test | PROVEN |
| Live coaching uses reported evidence rather than hidden game state | Kernel/HUD implementation plus branch and boundary tests; real-session observation for operational proof | Source and local tests only | PARTIALLY_PROVEN |
| Strategy guidance is correct and improves player outcomes | Current-patch expert review, real player trials, methodology, and measured outcomes | Derived benchmarks and explicit expert-review warning | UNVERIFIED |
| Python advice cannot mutate Strategic OS authority | Contract, runtime, and passing non-mutation tests | ADR-002, architecture tests, runtime test | PROVEN |
| Offline voice works on the target machine | Packaged model, real microphone, recognition transcript, and fallback evidence | Mocked/local contract tests and packaging definition | PARTIALLY_PROVEN |
| Real SC2 frames can be captured reliably | Supported replay, exact installed build, successful image artifacts, and fallback record | Capture implementation and boundary tests | UNVERIFIED |
| Runtime is offline and loopback-only | Configuration/tests plus packaged runtime network observation | CSP, bind configuration, update behavior, local tests | PARTIALLY_PROVEN |
| A Windows package can be built and installed from the current branch | Current exact-SHA CI receipt, artifact checksum, clean install and launch | Workflow definition and static packaging tests | UNVERIFIED |
| v1.13.0 is deployed and available to users | Provider release receipt and downloadable artifact evidence | Local tag and workflow configuration only | UNVERIFIED |
| Evidence graph and dependency register are canonical project-state controls | Human graph/register docs, machine ledger sections, checker validation, and passing graph test | `EVIDENCE_GRAPH.md`; `DEPENDENCIES.md`; `.project/state.json`; graph validation test | PROVEN |
| Real players use, retain, or improve with the product | Consented usage cohorts and measured outcome evidence | None inspected | UNVERIFIED |
| The product has commercial demand or revenue | Offer, price, prospect, payment, and retention evidence | Buyer hypothesis only | UNVERIFIED |

## Local Proof Record

- Date: 2026-08-25
- Scope: active local checkout only
- Command: `.venv/bin/python -m pytest -q`
- Result: `164 passed, 101 warnings` in the final local reconciliation run. The warnings are dependency deprecations and do not establish target-runtime failure.
- Non-claims: no Windows package, real microphone, real SC2 process, provider, customer, or payment was exercised by that command.

## Control-Plane Proof Record

- Date: 2026-08-27
- Scope: evidence graph and dependency register controls only
- Commands:
  - `python3 scripts/check_project_state.py`
  - `.venv/bin/python -m pytest tests/test_project_state_control.py -q`
- Result: canonical state check passed with 17 capabilities, 5 blockers, and 1 NEXT proof event; focused project-state tests passed 7/7.
- Non-claims: this validates graph/reference controls only. It does not prove clean Windows operation, replay capture, microphone behavior, player improvement, release availability, usage, or revenue.

## Evidence Required for External Truth

- Deployment: provider workflow/release receipt tied to exact commit and artifact checksum.
- Windows operation: clean-machine install, launch, replay, capture/voice result, and logs.
- Usage: consented product events or a named acceptance record.
- Outcome: defined baseline, post-use measurement, sample, and method.
- Revenue: provider transaction/settlement evidence; internal intent is insufficient.
