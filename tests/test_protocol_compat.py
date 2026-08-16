from pathlib import Path

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


def test_hotfix_version_is_consistent():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    assert 'CURRENT_VERSION = "1.3.1"' in app
    assert '!define VERSION "1.3.1"' in installer
    assert 'VIProductVersion "1.3.1.0"' in installer
