from __future__ import annotations

from hashlib import sha256
import json
import os
from pathlib import Path

import pytest

from scripts import real_replay_smoke


def _dense_stats() -> list[dict]:
    return [
        {
            "second": second,
            "workers": 12 + second // 15,
            "minerals": second,
            "gas": second // 2,
            "food_used": 12 + second / 20,
            "food_made": 15 + second / 20,
        }
        for second in range(0, 301, 15)
    ]


def _synthetic_parser_contract() -> dict:
    """A schema contract only; this is not genuine replay or parser proof."""

    stats = _dense_stats()
    return {
        "schema_version": "1.0",
        "source": {
            "filename": "private-match.SC2Replay",
            "parser": "sc2reader",
            "parser_version": "1.9.0",
            "evidence_class": "observed_replay",
        },
        "replay": {
            "map": "Private Map LE",
            "duration_seconds": 360,
            "duration": "6:00",
            "release": "5.0.16",
            "category": "Ladder",
            "type": "1v1",
        },
        "players": [
            {"pid": 1, "name": "Private Player", "race": "Protoss", "team": 1},
            {"pid": 2, "name": "Private Opponent", "race": "Terran", "team": 2},
        ],
        "analysis_by_player": {
            "1": {"stats": stats},
            "2": {"stats": stats},
        },
    }


def _fake_enrich(_replay: Path, analysis: dict) -> dict:
    analysis["schema_version"] = "1.2"
    for value in analysis["analysis_by_player"].values():
        value["observation_model"] = {"coverage": {"camera_events": 1}}
        value["strategy_narrative"] = {"headline": "Contract only"}
        value["hard_data"] = {
            "fact_envelope": {"resource_samples": value.get("stats") or []}
        }
    return analysis


def _pinned_parser_identity() -> dict:
    return {
        "version": "1.9.0",
        "commit": real_replay_smoke.PINNED_SC2READER_COMMIT,
        "commit_authority": "installed_direct_url",
        "module_sha256": "a" * 64,
        "module_authority": "imported_module_file",
    }


def _clean_application_identity() -> dict:
    return {
        "version": "1.14.0",
        "git_commit": "b" * 40,
        "git_dirty": False,
        "probe_code_version": real_replay_smoke.PROBE_CODE_VERSION,
        "probe_sha256": "c" * 64,
    }


def _configure_contract(monkeypatch, analysis: dict | None = None) -> list[str]:
    enrichment_calls: list[str] = []
    monkeypatch.setattr(
        real_replay_smoke,
        "analyze_replay",
        lambda _path: analysis or _synthetic_parser_contract(),
    )

    def enrich(path, raw):
        enrichment_calls.append(Path(path).suffix)
        return _fake_enrich(path, raw)

    monkeypatch.setattr(real_replay_smoke, "enrich_replay_analysis", enrich)
    monkeypatch.setattr(
        real_replay_smoke, "installed_sc2reader_identity", _pinned_parser_identity
    )
    monkeypatch.setattr(
        real_replay_smoke, "application_identity", _clean_application_identity
    )
    return enrichment_calls


def _contract_replay(tmp_path: Path) -> tuple[Path, bytes]:
    replay = tmp_path / "private-match.SC2Replay"
    replay_bytes = b"synthetic-orchestration-contract-only"
    replay.write_bytes(replay_bytes)
    return replay, replay_bytes


def test_smoke_requires_explicit_replay_opt_in(monkeypatch, capsys):
    monkeypatch.delenv(real_replay_smoke.REPLAY_ENV, raising=False)

    exit_code = real_replay_smoke.main([])

    receipt = json.loads(capsys.readouterr().out)
    assert exit_code == 2
    assert receipt == {
        "evidence_class": "no_replay_proof",
        "execution_mode": "genuine_opt_in",
        "failure": {"class": "replay_opt_in_required", "phase": "input"},
        "privacy": {
            "allowlist_applied": True,
            "filesystem_paths_included": False,
            "player_names_included": False,
            "source_filename_included": False,
        },
        "schema_version": "2.0",
        "status": "withheld",
    }


def test_mocked_contract_uses_production_path_without_claiming_replay_proof(
    tmp_path, monkeypatch
):
    replay, replay_bytes = _contract_replay(tmp_path)
    original_workspace = tmp_path / "original-workspace"
    monkeypatch.setenv("SC2_MASTER_COACH_WORKSPACE", str(original_workspace))
    parser_workspaces = []
    enrichment_calls = _configure_contract(monkeypatch)

    def fake_analyze_replay(_path):
        parser_workspaces.append(os.environ["SC2_MASTER_COACH_WORKSPACE"])
        return _synthetic_parser_contract()

    monkeypatch.setattr(real_replay_smoke, "analyze_replay", fake_analyze_replay)

    receipt = real_replay_smoke.run_smoke(replay)

    assert receipt["status"] == "passed"
    assert receipt["evidence_class"] == "test_contract_only"
    assert receipt["execution_mode"] == "unit_contract"
    assert receipt["replay_digest_sha256"] == sha256(replay_bytes).hexdigest()
    assert receipt["checks"]["production_enrichment_completed"] is True
    assert receipt["checks"]["supported_one_v_one"] is True
    assert receipt["checks"]["non_observer_participants"] is True
    assert receipt["checks"]["dense_required_stats_through_five_minutes"] is True
    assert receipt["stats_coverage"]["players_with_dense_coverage"] == 2
    assert receipt["application"]["identity_basis"] == "clean_git_source"
    assert receipt["parser"]["module_sha256"] == "a" * 64
    assert all(receipt["persistence"].values())
    assert receipt["checks"]["case_metadata_integrity_validated"] is True
    assert enrichment_calls == [".SC2Replay"]
    serialized = json.dumps(receipt)
    assert "Private Player" not in serialized
    assert "Private Opponent" not in serialized
    assert "private-match.SC2Replay" not in serialized
    assert str(tmp_path) not in serialized
    assert parser_workspaces[0] != str(original_workspace)
    assert not Path(parser_workspaces[0]).exists()
    assert os.environ["SC2_MASTER_COACH_WORKSPACE"] == str(original_workspace)


def test_mocked_callables_cannot_emit_observed_smoke_class_even_in_genuine_mode(
    tmp_path, monkeypatch
):
    replay, _ = _contract_replay(tmp_path)
    _configure_contract(monkeypatch)

    unit_receipt = real_replay_smoke.run_smoke(replay)
    genuine_receipt = real_replay_smoke.run_smoke(replay, genuine=True)

    assert unit_receipt["evidence_class"] == "test_contract_only"
    assert genuine_receipt["status"] == "failed"
    assert genuine_receipt["evidence_class"] == "no_replay_proof"
    assert genuine_receipt["execution_mode"] == "genuine_opt_in"
    assert "production_callables_attested_for_genuine_mode" in genuine_receipt[
        "failed_checks"
    ]


def test_unmodified_production_callables_are_attested():
    assert real_replay_smoke._production_callables_attested() is True


@pytest.mark.parametrize(
    ("mutate", "failed_check"),
    [
        (
            lambda analysis: analysis["replay"].update({"type": "2v2", "category": "2v2"}),
            "supported_one_v_one",
        ),
        (
            lambda analysis: analysis["players"][1].update({"team": 1}),
            "supported_one_v_one",
        ),
        (
            lambda analysis: analysis["players"][1].update({"is_observer": True}),
            "non_observer_participants",
        ),
        (
            lambda analysis: analysis["analysis_by_player"]["2"].update(
                {"stats": _dense_stats()[::3]}
            ),
            "dense_required_stats_through_five_minutes",
        ),
        (
            lambda analysis: analysis["analysis_by_player"]["2"].update(
                {"stats": list(reversed(_dense_stats()))}
            ),
            "dense_required_stats_through_five_minutes",
        ),
        (
            lambda analysis: [
                row.pop("food_made")
                for row in analysis["analysis_by_player"]["2"]["stats"]
            ],
            "dense_required_stats_through_five_minutes",
        ),
    ],
)
def test_adversarial_replay_shapes_cannot_pass(
    tmp_path, monkeypatch, mutate, failed_check
):
    replay, _ = _contract_replay(tmp_path)
    analysis = _synthetic_parser_contract()
    mutate(analysis)
    _configure_contract(monkeypatch, analysis)

    receipt = real_replay_smoke.run_smoke(replay, genuine=True)

    assert receipt["status"] == "failed"
    assert receipt["evidence_class"] == "no_replay_proof"
    assert failed_check in receipt["failed_checks"]


def test_dirty_source_cannot_bind_genuine_receipt(tmp_path, monkeypatch):
    replay, _ = _contract_replay(tmp_path)
    _configure_contract(monkeypatch)
    dirty = _clean_application_identity()
    dirty["git_dirty"] = True
    monkeypatch.setattr(real_replay_smoke, "application_identity", lambda: dirty)

    receipt = real_replay_smoke.run_smoke(replay, genuine=True)

    assert receipt["status"] == "failed"
    assert receipt["evidence_class"] == "no_replay_proof"
    assert receipt["application"]["identity_basis"] == "unbound"
    assert "application_identity_bound" in receipt["failed_checks"]


def test_exact_manifest_artifact_binds_receipt_only_to_matching_clean_source(
    tmp_path, monkeypatch
):
    replay, _ = _contract_replay(tmp_path)
    artifact = tmp_path / "SC2-Master-Coach-Portable.zip"
    artifact.write_bytes(b"exact-release-artifact")
    manifest = tmp_path / "SC2-Master-Coach-Build-Manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "commit_sha": "d" * 40,
                "repository": "owner/SC2-Master-Coach",
                "ref": "refs/tags/v1.14.0",
                "workflow_run_id": "123",
                "workflow_run_attempt": "1",
                "artifacts": [
                    {
                        "file": artifact.name,
                        "sha256": sha256(artifact.read_bytes()).hexdigest(),
                        "bytes": artifact.stat().st_size,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    _configure_contract(monkeypatch)
    matching = _clean_application_identity()
    matching["git_commit"] = "d" * 40
    monkeypatch.setattr(real_replay_smoke, "application_identity", lambda: matching)

    receipt = real_replay_smoke.run_smoke(
        replay,
        build_manifest_path=manifest,
        artifact_path=artifact,
    )

    assert receipt["status"] == "passed"
    assert receipt["application"]["identity_basis"] == "exact_build_artifact"
    assert receipt["build"]["artifact_match"] is True
    assert receipt["build"]["commit_sha"] == "d" * 40
    assert str(tmp_path) not in json.dumps(receipt)


@pytest.mark.parametrize(
    "app_identity",
    [
        {**_clean_application_identity(), "git_commit": "d" * 40, "git_dirty": True},
        {**_clean_application_identity(), "git_commit": "f" * 40, "git_dirty": False},
    ],
)
def test_artifact_cannot_bind_dirty_or_different_probe_source(
    tmp_path, monkeypatch, app_identity
):
    replay, _ = _contract_replay(tmp_path)
    artifact = tmp_path / "SC2-Master-Coach-Portable.zip"
    artifact.write_bytes(b"exact-release-artifact")
    manifest = tmp_path / "SC2-Master-Coach-Build-Manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "commit_sha": "d" * 40,
                "artifacts": [
                    {
                        "file": artifact.name,
                        "sha256": sha256(artifact.read_bytes()).hexdigest(),
                        "bytes": artifact.stat().st_size,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    _configure_contract(monkeypatch)
    monkeypatch.setattr(
        real_replay_smoke, "application_identity", lambda: app_identity
    )

    receipt = real_replay_smoke.run_smoke(
        replay,
        build_manifest_path=manifest,
        artifact_path=artifact,
    )

    assert receipt["status"] == "failed"
    assert receipt["application"]["identity_basis"] == "unbound"
    assert "application_identity_bound" in receipt["failed_checks"]


def test_manifest_artifact_tampering_prevents_proof_class_receipt(tmp_path, monkeypatch):
    replay, _ = _contract_replay(tmp_path)
    artifact = tmp_path / "SC2-Master-Coach-Portable.zip"
    artifact.write_bytes(b"tampered")
    manifest = tmp_path / "manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "commit_sha": "d" * 40,
                "artifacts": [
                    {
                        "file": artifact.name,
                        "sha256": "e" * 64,
                        "bytes": artifact.stat().st_size,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    _configure_contract(monkeypatch)
    dirty = _clean_application_identity()
    dirty["git_dirty"] = True
    monkeypatch.setattr(real_replay_smoke, "application_identity", lambda: dirty)

    receipt = real_replay_smoke.run_smoke(
        replay,
        build_manifest_path=manifest,
        artifact_path=artifact,
    )

    assert receipt["status"] == "failed"
    assert receipt["evidence_class"] == "test_contract_only"
    assert receipt["build"]["status"] == "mismatch"
    assert "application_identity_bound" in receipt["failed_checks"]


def test_failure_receipt_exposes_only_allowlisted_phase_and_class(
    tmp_path, monkeypatch, capsys
):
    replay, _ = _contract_replay(tmp_path)
    private_manifest = tmp_path / "private-user-manifest.json"
    private_manifest.write_text("{}", encoding="utf-8")

    exit_code = real_replay_smoke.main(
        ["--replay", str(replay), "--build-manifest", str(private_manifest)]
    )

    receipt = json.loads(capsys.readouterr().out)
    serialized = json.dumps(receipt)
    assert exit_code == 2
    assert receipt["failure"] == {
        "phase": "application_identity",
        "class": "build_artifact_required",
    }
    assert str(tmp_path) not in serialized
    assert replay.name not in serialized
    assert private_manifest.name not in serialized


def test_enrichment_failure_reports_bounded_phase_without_exception_details(
    tmp_path, monkeypatch, capsys
):
    replay, _ = _contract_replay(tmp_path)
    _configure_contract(monkeypatch)

    def private_failure(_path, _analysis):
        raise RuntimeError(f"private failure at {tmp_path}")

    monkeypatch.setattr(real_replay_smoke, "enrich_replay_analysis", private_failure)

    exit_code = real_replay_smoke.main(["--replay", str(replay)])

    receipt = json.loads(capsys.readouterr().out)
    serialized = json.dumps(receipt)
    assert exit_code == 2
    assert receipt["failure"] == {
        "phase": "enrichment",
        "class": "replay_probe_error",
    }
    assert str(tmp_path) not in serialized


def test_smoke_withholds_pass_status_when_installed_parser_commit_is_not_attested(
    tmp_path, monkeypatch
):
    replay, _ = _contract_replay(tmp_path)
    _configure_contract(monkeypatch)
    monkeypatch.setattr(
        real_replay_smoke,
        "installed_sc2reader_identity",
        lambda: {
            "version": "1.9.0",
            "commit": None,
            "commit_authority": "unavailable",
            "module_sha256": None,
            "module_authority": "unavailable",
        },
    )

    receipt = real_replay_smoke.run_smoke(replay, genuine=True)

    assert receipt["status"] == "failed"
    assert receipt["evidence_class"] == "no_replay_proof"
    assert receipt["failed_checks"] == [
        "production_callables_attested_for_genuine_mode",
        "installed_parser_commit_matches_pin",
        "imported_parser_module_attested",
    ]


@pytest.mark.skipif(
    not os.environ.get(real_replay_smoke.REPLAY_ENV),
    reason=f"Set {real_replay_smoke.REPLAY_ENV} to exercise a genuine replay.",
)
def test_opt_in_genuine_replay_exercises_actual_parser_and_workspace():
    receipt = real_replay_smoke.run_smoke(
        os.environ[real_replay_smoke.REPLAY_ENV],
        genuine=True,
        build_manifest_path=os.environ.get(real_replay_smoke.BUILD_MANIFEST_ENV),
        artifact_path=os.environ.get(real_replay_smoke.BUILD_ARTIFACT_ENV),
    )

    assert receipt["status"] == "passed", receipt
    assert receipt["evidence_class"] == "observed_replay_smoke"
    assert receipt["checks"]["actual_sc2reader_parser"] is True
    assert receipt["checks"]["production_enrichment_completed"] is True
    assert receipt["checks"]["dense_required_stats_through_five_minutes"] is True
    assert receipt["persistence"]["stored_replay_digest_matches_source"] is True
    assert receipt["persistence"]["manifest_digest_matches_source"] is True
    assert receipt["persistence"]["case_metadata_integrity_validated"] is True
