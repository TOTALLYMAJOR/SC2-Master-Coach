from pathlib import Path
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
