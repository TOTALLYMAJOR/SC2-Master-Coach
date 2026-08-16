from types import SimpleNamespace

import pytest

from sc2_version_compat import (
    ReplayBuildUnavailable,
    apply_replay_version,
    installed_base_builds,
)


def test_replay_metadata_selects_exact_installed_base_build(tmp_path):
    versions = tmp_path / "Versions"
    (versions / "Base97563").mkdir(parents=True)
    (versions / "Base87702").mkdir()
    config = SimpleNamespace(data_dir=str(tmp_path), version=None)
    replay = SimpleNamespace(
        game_version="5.0.16",
        build_version=97563,
        data_version="ABC123",
        binary=None,
    )

    resolved = apply_replay_version(config, replay)

    assert resolved is config
    assert resolved.version is replay
    assert installed_base_builds(tmp_path) == [87702, 97563]
    assert resolved.sc2_master_coach_version_resolution["build_version"] == 97563


def test_replay_build_resolution_never_substitutes_an_arbitrary_binary(tmp_path):
    (tmp_path / "Versions" / "Base97563").mkdir(parents=True)
    config = SimpleNamespace(data_dir=str(tmp_path), version=None)
    replay = SimpleNamespace(
        game_version="5.0.15",
        build_version=95299,
        data_version="OLD",
        binary=None,
    )

    with pytest.raises(ReplayBuildUnavailable) as exc:
        apply_replay_version(config, replay)

    message = str(exc.value)
    assert "95299" in message
    assert "97563" in message
    assert "matching Base build" in message
