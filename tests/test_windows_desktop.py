from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_windows_desktop_opens_live_coach_as_primary_surface():
    desktop = (ROOT / "desktop_app.py").read_text(encoding="utf-8")
    assert 'APP_TITLE = "SC2 Master Coach — Live Coach"' in desktop
    assert 'DEFAULT_ROUTE = "/hud"' in desktop
    assert 'return f"http://127.0.0.1:{self.port}{DEFAULT_ROUTE}"' in desktop


def test_local_windows_builders_package_complete_runtime():
    required = (
        "--add-data \"static:static\"",
        "--collect-data python_strategy_science",
        "--collect-all vosk",
        "--collect-all sounddevice",
        "--collect-all pysc2",
        "--collect-all s2clientprotocol",
        "--hidden-import pysc2.run_configs.platforms",
        "desktop_app.py",
    )
    for name in ("build_windows_portable.bat", "build_windows_onefile.bat"):
        script = (ROOT / name).read_text(encoding="utf-8")
        assert "set \"PYTHON_LAUNCHER=py -3.12\"" in script
        assert "%PYTHON_LAUNCHER% -m venv" in script
        assert "python -m pip uninstall -y enum34" in script
        for token in required:
            assert token in script, f"{name} is missing {token}"


def test_portable_builder_and_ci_require_live_coach_assets():
    portable = (ROOT / "build_windows_portable.bat").read_text(encoding="utf-8")
    workflow = (ROOT / ".github" / "workflows" / "windows-release.yml").read_text(encoding="utf-8")
    for asset in ("live-checkpoints.js", "coach-progression.js"):
        assert asset in portable
        assert asset in workflow
    assert "Packaged Live Coach asset missing" in workflow


def test_windows_packaging_runs_for_relevant_pull_requests_without_publishing():
    workflow = (ROOT / ".github" / "workflows" / "windows-release.yml").read_text(encoding="utf-8")
    assert "pull_request:" in workflow
    assert "- 'desktop_app.py'" in workflow
    assert "- 'static/**'" in workflow
    assert "if: startsWith(github.ref, 'refs/tags/v')" in workflow
    assert "if: github.ref == 'refs/heads/main'" in workflow
