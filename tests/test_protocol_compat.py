from pathlib import Path
from types import SimpleNamespace
import os
import re

ROOT = Path(__file__).resolve().parents[1]


def test_sc2_protocol_runtime_imports_with_supported_protobuf():
    import google.protobuf
    from s2clientprotocol import sc2api_pb2

    assert google.protobuf.__version__ == "3.20.3"
    assert sc2api_pb2.InterfaceOptions is not None


def test_protobuf_pin_is_present_in_runtime_requirements():
    desktop = (ROOT / "requirements-desktop.txt").read_text(encoding="utf-8")
    service = (ROOT / "requirements.txt").read_text(encoding="utf-8")
    assert "protobuf==3.20.3" in desktop
    assert "protobuf==3.20.3" in service


def test_new_sc2_replay_versions_bind_to_their_exact_base_build():
    from pysc2.run_configs import lib as run_configs_lib
    from sc2_frame_capture import _runtime_replay_version

    replay_version = run_configs_lib.Version(
        game_version="5.0.16",
        build_version=97563,
        data_version="ABCDEF0123456789",
        binary=None,
    )
    runtime_version = _runtime_replay_version(replay_version)
    assert runtime_version.game_version == "5.0.16"
    assert runtime_version.build_version == 97563
    assert runtime_version.data_version == "ABCDEF0123456789"
    assert runtime_version.binary == "local-install"


def test_windows_runtime_finds_support64_icu_and_sets_child_context(tmp_path, monkeypatch):
    import sc2_frame_capture as capture

    support64 = tmp_path / "Support64"
    support64.mkdir()
    for name in capture._SC2_RUNTIME_DLLS:
        (support64 / name).write_bytes(b"test")

    config = SimpleNamespace(data_dir=str(tmp_path), cwd="wrong", env={"PATH": "existing"})
    monkeypatch.setattr(capture.os, "name", "nt", raising=False)
    result = capture._configure_windows_runtime(config)

    assert result["configured"] is True
    assert result["missing"] == []
    assert Path(config.cwd) == support64
    assert config.env["PATH"].split(os.pathsep)[0] == str(support64)


def test_release_version_is_consistent_without_hardcoding_a_patch_number():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")

    app_match = re.search(r'^CURRENT_VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"$', app, re.MULTILINE)
    installer_match = re.search(r'^!define VERSION "([0-9]+\.[0-9]+\.[0-9]+)"$', installer, re.MULTILINE)
    product_match = re.search(r'^VIProductVersion "([0-9]+\.[0-9]+\.[0-9]+)\.0"$', installer, re.MULTILINE)

    assert app_match, "CURRENT_VERSION was not found in app.py"
    assert installer_match, "NSIS VERSION was not found"
    assert product_match, "NSIS VIProductVersion was not found"

    app_version = app_match.group(1)
    assert app_version == installer_match.group(1)
    assert app_version == product_match.group(1)
