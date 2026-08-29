#!/usr/bin/env python3
"""Opt-in, privacy-bounded smoke probe for a genuine SC2 replay.

This script does not ship a fixture and does not treat mocked tests as replay
proof. Supply a locally authorized replay with ``--replay`` or the environment
variable below to exercise the installed parser and case-workspace path.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from hashlib import sha256
import importlib
from importlib import metadata
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
import tempfile
from typing import Any, Sequence


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from case_workspace import (  # noqa: E402
    create_or_update_case,
    load_case_records,
    replay_digest,
)
from observation_service import enrich_replay_analysis  # noqa: E402
from replay_engine import analyze_replay  # noqa: E402
from replay_intelligence import one_v_one_eligibility  # noqa: E402


REPLAY_ENV = "SC2_MASTER_COACH_REAL_REPLAY"
BUILD_MANIFEST_ENV = "SC2_MASTER_COACH_BUILD_MANIFEST"
BUILD_ARTIFACT_ENV = "SC2_MASTER_COACH_BUILD_ARTIFACT"
PINNED_SC2READER_COMMIT = "e10fc9344417d0aa9649e4ed8d6423e38f6af4c9"
RECEIPT_SCHEMA_VERSION = "2.0"
PROBE_CODE_VERSION = "2.0"
REQUIRED_FIRST_FIVE_FIELDS = ("workers", "minerals", "gas", "food_used", "food_made")
MAX_FIRST_FIVE_GAP_SECONDS = 30
MIN_FIRST_FIVE_SAMPLES = 11
_SAFE_TOKEN = re.compile(r"[^A-Za-z0-9._+ -]")
_HEX_40 = re.compile(r"[a-fA-F0-9]{40}")
_HEX_64 = re.compile(r"[a-fA-F0-9]{64}")

_FAILURE_PHASES = {
    "input",
    "parser_identity",
    "application_identity",
    "analysis",
    "enrichment",
    "eligibility",
    "persistence",
    "receipt",
}
_FAILURE_CLASSES = {
    "replay_opt_in_required",
    "replay_file_not_found",
    "replay_extension_required",
    "replay_file_empty",
    "sc2reader_not_installed",
    "build_manifest_invalid",
    "build_artifact_required",
    "build_artifact_not_found",
    "replay_probe_error",
}


class SmokeProbeError(RuntimeError):
    """A bounded error safe to represent without disclosing local file data."""

    def __init__(self, phase: str, error_class: str):
        self.phase = phase if phase in _FAILURE_PHASES else "receipt"
        self.error_class = (
            error_class if error_class in _FAILURE_CLASSES else "replay_probe_error"
        )
        super().__init__(self.error_class)


def _safe_token(value: Any, default: str = "unknown", max_length: int = 80) -> str:
    cleaned = _SAFE_TOKEN.sub("", str(value or "")).strip()
    return (cleaned or default)[:max_length]


def _sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def installed_sc2reader_identity() -> dict[str, Any]:
    """Return package and imported-module provenance without exposing paths."""

    try:
        distribution = metadata.distribution("sc2reader")
    except metadata.PackageNotFoundError as exc:
        raise SmokeProbeError("parser_identity", "sc2reader_not_installed") from exc

    commit = None
    direct_url = distribution.read_text("direct_url.json")
    if direct_url:
        try:
            direct_url_data = json.loads(direct_url)
        except json.JSONDecodeError:
            direct_url_data = {}
        vcs_info = direct_url_data.get("vcs_info") if isinstance(direct_url_data, dict) else None
        if isinstance(vcs_info, dict):
            candidate = vcs_info.get("commit_id")
            if isinstance(candidate, str) and _HEX_40.fullmatch(candidate):
                commit = candidate.lower()

    module = importlib.import_module("sc2reader")
    module_file = Path(str(getattr(module, "__file__", "")))
    module_digest = _sha256(module_file) if module_file.is_file() else None

    return {
        "version": _safe_token(distribution.version),
        "commit": commit,
        "commit_authority": "installed_direct_url" if commit else "unavailable",
        "module_sha256": module_digest,
        "module_authority": "imported_module_file" if module_digest else "unavailable",
    }


def resolve_replay_path(cli_path: str | None = None) -> Path:
    value = cli_path or os.environ.get(REPLAY_ENV)
    if not value:
        raise SmokeProbeError("input", "replay_opt_in_required")
    path = Path(value).expanduser().resolve()
    if not path.is_file():
        raise SmokeProbeError("input", "replay_file_not_found")
    if path.suffix.lower() != ".sc2replay":
        raise SmokeProbeError("input", "replay_extension_required")
    if path.stat().st_size <= 0:
        raise SmokeProbeError("input", "replay_file_empty")
    return path


def application_identity() -> dict[str, Any]:
    """Return source identity where Git is available; never include checkout paths."""

    app_version = "unknown"
    app_source = ROOT / "app.py"
    if app_source.is_file():
        match = re.search(
            r'^CURRENT_VERSION\s*=\s*["\']([^"\']+)["\']',
            app_source.read_text(encoding="utf-8"),
            re.MULTILINE,
        )
        if match:
            app_version = _safe_token(match.group(1))

    commit = None
    dirty = None
    try:
        commit_value = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
            timeout=5,
        ).stdout.strip()
        if _HEX_40.fullmatch(commit_value):
            commit = commit_value.lower()
        dirty = bool(
            subprocess.run(
                ["git", "status", "--porcelain", "--untracked-files=normal"],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
                timeout=5,
            ).stdout.strip()
        )
    except (OSError, subprocess.SubprocessError):
        pass
    return {
        "version": app_version,
        "git_commit": commit,
        "git_dirty": dirty,
        "probe_code_version": PROBE_CODE_VERSION,
        "probe_sha256": _sha256(Path(__file__)),
    }


def build_identity(
    manifest_path: str | Path | None, artifact_path: str | Path | None
) -> dict[str, Any]:
    """Validate an optional exact-build manifest against the supplied artifact bytes."""

    if not manifest_path and not artifact_path:
        return {"status": "not_supplied", "artifact_match": False}
    if not manifest_path:
        raise SmokeProbeError("application_identity", "build_manifest_invalid")
    if not artifact_path:
        raise SmokeProbeError("application_identity", "build_artifact_required")
    manifest_file = Path(manifest_path).expanduser().resolve()
    artifact_file = Path(artifact_path).expanduser().resolve()
    if not manifest_file.is_file():
        raise SmokeProbeError("application_identity", "build_manifest_invalid")
    if not artifact_file.is_file():
        raise SmokeProbeError("application_identity", "build_artifact_not_found")
    try:
        manifest = json.loads(manifest_file.read_text(encoding="utf-8-sig"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise SmokeProbeError("application_identity", "build_manifest_invalid") from exc
    if not isinstance(manifest, dict):
        raise SmokeProbeError("application_identity", "build_manifest_invalid")

    commit = str(manifest.get("commit_sha") or "").lower()
    artifacts = manifest.get("artifacts")
    if not _HEX_40.fullmatch(commit) or not isinstance(artifacts, list):
        raise SmokeProbeError("application_identity", "build_manifest_invalid")
    expected = next(
        (
            row
            for row in artifacts
            if isinstance(row, dict) and row.get("file") == artifact_file.name
        ),
        None,
    )
    if not expected:
        raise SmokeProbeError("application_identity", "build_manifest_invalid")
    expected_digest = str(expected.get("sha256") or "").lower()
    try:
        expected_bytes = int(expected.get("bytes"))
    except (TypeError, ValueError) as exc:
        raise SmokeProbeError("application_identity", "build_manifest_invalid") from exc
    if not _HEX_64.fullmatch(expected_digest) or expected_bytes < 1:
        raise SmokeProbeError("application_identity", "build_manifest_invalid")
    actual_digest = _sha256(artifact_file)
    actual_bytes = artifact_file.stat().st_size
    return {
        "status": "verified" if actual_digest == expected_digest and actual_bytes == expected_bytes else "mismatch",
        "repository": _safe_token(manifest.get("repository"), max_length=120),
        "commit_sha": commit,
        "ref": _safe_token(manifest.get("ref"), max_length=120),
        "workflow_run_id": _safe_token(manifest.get("workflow_run_id"), max_length=40),
        "workflow_run_attempt": _safe_token(manifest.get("workflow_run_attempt"), max_length=20),
        "artifact_name": _safe_token(artifact_file.name, max_length=120),
        "artifact_sha256": actual_digest,
        "artifact_bytes": actual_bytes,
        "artifact_match": actual_digest == expected_digest and actual_bytes == expected_bytes,
    }


def _stats_coverage(analysis: dict[str, Any]) -> dict[str, Any]:
    """Measure dense required-field coverage from the enriched fact envelope."""

    players = analysis.get("players") or []
    analyses = analysis.get("analysis_by_player") or {}
    rows = []
    for player in players:
        pid = player.get("pid")
        player_analysis = analyses.get(str(pid)) or {}
        hard_data = player_analysis.get("hard_data") or {}
        stats = (hard_data.get("fact_envelope") or {}).get("resource_samples") or []
        eligible_rows = [
            row
            for row in stats
            if isinstance(row, dict)
            and isinstance(row.get("second"), (int, float))
            and 0 <= int(row["second"]) <= 300
            and all(isinstance(row.get(field), (int, float)) for field in REQUIRED_FIRST_FIVE_FIELDS)
        ]
        observed_seconds = [int(row["second"]) for row in eligible_rows]
        unique_seconds = sorted(set(observed_seconds))
        gaps = [later - earlier for earlier, later in zip(unique_seconds, unique_seconds[1:])]
        monotonic = observed_seconds == unique_seconds
        dense = bool(
            monotonic
            and len(unique_seconds) >= MIN_FIRST_FIVE_SAMPLES
            and unique_seconds[0] <= 15
            and unique_seconds[-1] >= 285
            and gaps
            and max(gaps) <= MAX_FIRST_FIVE_GAP_SECONDS
        )
        rows.append(
            {
                "race": _safe_token(player.get("race")),
                "required_field_sample_count": len(unique_seconds),
                "first_observed_second": unique_seconds[0] if unique_seconds else None,
                "last_observed_second": unique_seconds[-1] if unique_seconds else None,
                "maximum_gap_seconds": max(gaps) if gaps else None,
                "strictly_monotonic_unique_seconds": monotonic,
                "dense_through_five_minutes": dense,
            }
        )
    return {
        "required_fields": list(REQUIRED_FIRST_FIVE_FIELDS),
        "maximum_allowed_gap_seconds": MAX_FIRST_FIVE_GAP_SECONDS,
        "minimum_required_samples": MIN_FIRST_FIVE_SAMPLES,
        "players_with_dense_coverage": sum(
            1 for row in rows if row["dense_through_five_minutes"]
        ),
        "by_player": rows,
    }


def _participants_are_non_observers(analysis: dict[str, Any]) -> bool:
    """Validate the production participant roster without inferring named identity."""

    players = analysis.get("players") or []
    analyses = analysis.get("analysis_by_player") or {}
    pids = [row.get("pid") for row in players if isinstance(row, dict)]
    return bool(
        len(players) == 2
        and len(set(pids)) == 2
        and all(
            row.get("pid") is not None
            and row.get("team") is not None
            and str(row.get("race") or "").lower() not in {"", "unknown", "observer"}
            and row.get("is_observer") is not True
            and row.get("observer") is not True
            and str(row.get("role") or "").lower() != "observer"
            and str(row.get("pid")) in analyses
            for row in players
        )
    )


def _identity_binding(
    app_identity: dict[str, Any], build: dict[str, Any]
) -> tuple[str, bool]:
    clean_source = bool(
        app_identity.get("git_commit") and app_identity.get("git_dirty") is False
    )
    if (
        build.get("artifact_match")
        and clean_source
        and app_identity.get("git_commit") == build.get("commit_sha")
    ):
        return "exact_build_artifact", True
    if build.get("status") == "not_supplied" and clean_source:
        return "clean_git_source", True
    return "unbound", False


def _runtime_identity() -> dict[str, Any]:
    return {
        "observed_at_utc": datetime.now(timezone.utc).isoformat(),
        "platform_system": _safe_token(platform.system()),
        "platform_release": _safe_token(platform.release()),
        "python_implementation": _safe_token(platform.python_implementation()),
        "python_version": _safe_token(platform.python_version()),
    }


def _production_callables_attested() -> bool:
    """Prevent monkeypatched/unit execution from producing a proof-class receipt."""

    return (
        getattr(analyze_replay, "__module__", None) == "replay_engine"
        and getattr(analyze_replay, "__name__", None) == "analyze_replay"
        and getattr(enrich_replay_analysis, "__module__", None)
        == "observation_service"
        and getattr(enrich_replay_analysis, "__name__", None)
        == "enrich_replay_analysis"
        and getattr(create_or_update_case, "__module__", None) == "case_workspace"
        and getattr(create_or_update_case, "__name__", None) == "create_or_update_case"
        and getattr(load_case_records, "__module__", None) == "case_workspace"
        and getattr(load_case_records, "__name__", None) == "load_case_records"
    )


_ALLOWED_RECEIPT_KEYS = {
    "schema_version",
    "status",
    "evidence_class",
    "execution_mode",
    "replay_digest_sha256",
    "application",
    "build",
    "runtime",
    "parser",
    "replay",
    "eligibility",
    "stats_coverage",
    "persistence",
    "checks",
    "failed_checks",
    "failure",
    "privacy",
}


def _finalize_receipt(receipt: dict[str, Any], forbidden_values: Sequence[str] = ()) -> dict[str, Any]:
    """Apply the top-level receipt allowlist and reject accidental private strings."""

    filtered = {key: value for key, value in receipt.items() if key in _ALLOWED_RECEIPT_KEYS}
    serialized = json.dumps(filtered, sort_keys=True)
    if any(value and value in serialized for value in forbidden_values):
        raise SmokeProbeError("receipt", "replay_probe_error")
    filtered["privacy"] = {
        "allowlist_applied": True,
        "player_names_included": False,
        "filesystem_paths_included": False,
        "source_filename_included": False,
    }
    return filtered


def run_smoke(
    replay_path: str | Path,
    *,
    genuine: bool = False,
    build_manifest_path: str | Path | None = None,
    artifact_path: str | Path | None = None,
) -> dict[str, Any]:
    """Run production analysis/enrichment/persistence in a disposable workspace.

    Direct Python calls default to a non-proof unit-contract mode. Only the CLI
    or an explicit ``genuine=True`` call can emit a genuine proof-class receipt.
    """

    source = resolve_replay_path(str(replay_path))
    source_digest = _sha256(source)
    parser_identity = installed_sc2reader_identity()
    app_identity = application_identity()
    build = build_identity(build_manifest_path, artifact_path)
    identity_basis, application_bound = _identity_binding(app_identity, build)

    previous_workspace = os.environ.get("SC2_MASTER_COACH_WORKSPACE")
    try:
        with tempfile.TemporaryDirectory(prefix="sc2mc-real-replay-smoke-") as temp_root:
            os.environ["SC2_MASTER_COACH_WORKSPACE"] = str(Path(temp_root) / "workspace")
            try:
                raw_analysis = analyze_replay(source)
            except Exception as exc:
                raise SmokeProbeError("analysis", "replay_probe_error") from exc
            try:
                analysis = enrich_replay_analysis(source, raw_analysis)
            except Exception as exc:
                raise SmokeProbeError("enrichment", "replay_probe_error") from exc
            try:
                case = create_or_update_case(source, analysis)
                case_root = Path(case["workspace"])
                stored_digest = replay_digest(case_root / "replay.SC2Replay")
                manifest, persisted_analysis, persisted_learning = load_case_records(
                    case["id"]
                )
            except Exception as exc:
                raise SmokeProbeError("persistence", "replay_probe_error") from exc
    finally:
        if previous_workspace is None:
            os.environ.pop("SC2_MASTER_COACH_WORKSPACE", None)
        else:
            os.environ["SC2_MASTER_COACH_WORKSPACE"] = previous_workspace

    source_meta = analysis.get("source") or {}
    replay_meta = analysis.get("replay") or {}
    players = analysis.get("players") or []
    parser_commit = parser_identity.get("commit")
    patch = (
        replay_meta.get("patch")
        or replay_meta.get("game_version")
        or replay_meta.get("gameVersion")
        or replay_meta.get("version")
        or replay_meta.get("release")
    )
    replay_type = replay_meta.get("type") or replay_meta.get("category")
    coverage = _stats_coverage(analysis)
    eligibility = one_v_one_eligibility(analysis)
    enriched_players = analysis.get("analysis_by_player") or {}
    production_enrichment_complete = bool(
        analysis.get("schema_version") == "1.2"
        and players
        and all(
            (enriched_players.get(str(player.get("pid"))) or {}).get("observation_model")
            is not None
            and (enriched_players.get(str(player.get("pid"))) or {}).get(
                "strategy_narrative"
            )
            is not None
            for player in players
        )
    )

    checks = {
        "production_callables_attested_for_genuine_mode": (
            not genuine or _production_callables_attested()
        ),
        "actual_sc2reader_parser": (
            source_meta.get("parser") == "sc2reader"
            and source_meta.get("evidence_class") == "observed_replay"
        ),
        "installed_parser_commit_matches_pin": parser_commit == PINNED_SC2READER_COMMIT,
        "reported_parser_version_matches_installed": _safe_token(
            source_meta.get("parser_version")
        )
        == parser_identity["version"],
        "imported_parser_module_attested": bool(parser_identity.get("module_sha256")),
        "production_enrichment_completed": production_enrichment_complete,
        "supported_one_v_one": eligibility.get("eligible") is True,
        "non_observer_participants": _participants_are_non_observers(analysis),
        "patch_observed": bool(patch and str(patch).lower() != "unknown"),
        "dense_required_stats_through_five_minutes": len(players) == 2
        and coverage["players_with_dense_coverage"] == 2,
        "stored_replay_digest_matches_source": stored_digest == source_digest,
        "manifest_digest_matches_source": manifest.get("digest_sha256") == source_digest,
        "manifest_patch_matches_parser": manifest.get("patch") == patch,
        "case_metadata_integrity_validated": bool(
            persisted_analysis.get("_case_integrity")
            and persisted_learning.get("_case_integrity")
            and persisted_analysis.get("_case_integrity")
            == persisted_learning.get("_case_integrity")
        ),
        "application_identity_bound": application_bound,
    }
    failed_checks = [name for name, passed in checks.items() if not passed]
    status = "passed" if not failed_checks else "failed"
    evidence_class = (
        "observed_replay_smoke"
        if genuine and status == "passed"
        else "test_contract_only" if not genuine else "no_replay_proof"
    )
    receipt = {
        "schema_version": RECEIPT_SCHEMA_VERSION,
        "status": status,
        "evidence_class": evidence_class,
        "execution_mode": "genuine_opt_in" if genuine else "unit_contract",
        "replay_digest_sha256": source_digest,
        "application": {**app_identity, "identity_basis": identity_basis},
        "build": build,
        "runtime": _runtime_identity(),
        "parser": {
            "name": "sc2reader",
            "reported_version": _safe_token(source_meta.get("parser_version")),
            "installed_version": parser_identity["version"],
            "installed_commit": parser_commit,
            "commit_authority": parser_identity["commit_authority"],
            "expected_commit": PINNED_SC2READER_COMMIT,
            "module_sha256": parser_identity.get("module_sha256"),
            "module_authority": parser_identity.get("module_authority"),
        },
        "replay": {
            "patch": _safe_token(patch),
            "type": _safe_token(replay_type),
            "player_count": len(players),
            "races": [_safe_token(player.get("race")) for player in players],
        },
        "eligibility": {
            "status": _safe_token(eligibility.get("status")),
            "declared_mode": _safe_token(eligibility.get("declared_mode")),
            "player_count": eligibility.get("player_count"),
            "team_count": eligibility.get("team_count"),
            "reason_codes": [
                _safe_token(reason) for reason in (eligibility.get("reasons") or [])
            ],
            "non_observer_participants": checks["non_observer_participants"],
        },
        "stats_coverage": coverage,
        "persistence": {
            "stored_replay_digest_matches_source": checks[
                "stored_replay_digest_matches_source"
            ],
            "manifest_digest_matches_source": checks["manifest_digest_matches_source"],
            "manifest_patch_matches_parser": checks["manifest_patch_matches_parser"],
            "case_metadata_integrity_validated": checks[
                "case_metadata_integrity_validated"
            ],
        },
        "checks": checks,
        "failed_checks": failed_checks,
    }
    player_names = [str(player.get("name") or "") for player in players]
    return _finalize_receipt(
        receipt,
        forbidden_values=[str(source), source.name, *player_names],
    )


def _error_receipt(phase: str, error_class: str) -> dict[str, Any]:
    return _finalize_receipt({
        "schema_version": RECEIPT_SCHEMA_VERSION,
        "status": "withheld",
        "evidence_class": "no_replay_proof",
        "execution_mode": "genuine_opt_in",
        "failure": {
            "phase": phase if phase in _FAILURE_PHASES else "receipt",
            "class": error_class if error_class in _FAILURE_CLASSES else "replay_probe_error",
        },
    })


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--replay",
        help=f"Authorized local .SC2Replay (or set {REPLAY_ENV}).",
    )
    parser.add_argument(
        "--build-manifest",
        default=os.environ.get(BUILD_MANIFEST_ENV),
        help=f"Exact build manifest (or set {BUILD_MANIFEST_ENV}).",
    )
    parser.add_argument(
        "--artifact",
        default=os.environ.get(BUILD_ARTIFACT_ENV),
        help=f"Installer/portable artifact named by the manifest (or set {BUILD_ARTIFACT_ENV}).",
    )
    args = parser.parse_args(argv)
    try:
        replay_path = resolve_replay_path(args.replay)
        receipt = run_smoke(
            replay_path,
            genuine=True,
            build_manifest_path=args.build_manifest,
            artifact_path=args.artifact,
        )
    except SmokeProbeError as exc:
        receipt = _error_receipt(exc.phase, exc.error_class)
    except Exception:
        receipt = _error_receipt("analysis", "replay_probe_error")
    print(json.dumps(receipt, indent=2, sort_keys=True))
    if receipt["status"] == "passed":
        return 0
    return 2 if receipt["status"] == "withheld" else 1


if __name__ == "__main__":
    raise SystemExit(main())
