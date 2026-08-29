from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_windows_desktop_opens_master_intel_as_primary_surface():
    desktop = (ROOT / "desktop_app.py").read_text(encoding="utf-8")
    assert 'APP_TITLE = "SC2 Master Coach"' in desktop
    assert 'DEFAULT_ROUTE = "/"' in desktop
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
    assert "Publish or refresh current version from main" not in workflow
    assert "gh release upload" not in workflow
    assert "--clobber" not in workflow


def test_windows_artifacts_carry_exact_sha_provenance_and_checksums():
    workflow = (ROOT / ".github" / "workflows" / "windows-release.yml").read_text(encoding="utf-8")
    for token in (
        "Record exact-SHA artifact provenance",
        "commit_sha = $env:GITHUB_SHA",
        "ref = $env:GITHUB_REF",
        "workflow_run_id = $env:GITHUB_RUN_ID",
        "Get-FileHash -Path $_ -Algorithm SHA256",
        "SC2-Master-Coach-Build-Manifest.json",
        "SC2-Master-Coach-SHA256SUMS.txt",
        "SC2-Master-Coach-Python-Dependencies.txt",
        "if-no-files-found: error",
        "--verify-tag",
        "--draft",
        '$expectedTag = "v$($match.Matches[0].Groups[1].Value)"',
        "does not match application version $expectedTag",
    ):
        assert token in workflow
    upload = workflow.split("- name: Upload Windows artifacts", 1)[1].split(
        "- name: Mark validated", 1
    )[0]
    release = workflow.split("- name: Publish tagged GitHub Release", 1)[1]
    assert "SC2-Master-Coach-Build-Manifest.json" in upload
    assert "SC2-Master-Coach-SHA256SUMS.txt" in upload
    assert "SC2-Master-Coach-Build-Manifest.json" in release
    assert "SC2-Master-Coach-SHA256SUMS.txt" in release
    assert "SC2-Master-Coach-Python-Dependencies.txt" in upload
    assert "SC2-Master-Coach-Python-Dependencies.txt" in release


def test_windows_release_checks_primary_master_intel_modules():
    workflow = (ROOT / ".github" / "workflows" / "windows-release.yml").read_text(encoding="utf-8")
    assert "Verify Master Intel ES-module syntax" in workflow
    assert "Get-ChildItem static\\master-intel -Filter *.js -Recurse" in workflow
    assert "node --check --input-type=module" in workflow


def test_nsis_installer_uses_a_fixed_personal_app_directory_and_guarded_uninstall():
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    assert 'InstallDir "$LOCALAPPDATA\\Programs\\${APPNAME}"' in installer
    assert "!insertmacro MUI_PAGE_DIRECTORY" not in installer
    assert "Function un.onInit" in installer
    assert '${If} $INSTDIR != "$LOCALAPPDATA\\Programs\\${APPNAME}"' in installer
    assert "Uninstall stopped because the installation path is not the fixed" in installer
    assert 'RMDir /r "$INSTDIR"' in installer
    assert "ExecWait" in installer and " /silent /install' $1" in installer
    assert "SC2 Master Coach was not installed" in installer
    assert 'WriteRegStr HKCU "Software\\Classes\\.SC2Replay"' not in installer
    assert "SystemFileAssociations\\.SC2Replay\\shell\\SC2MasterCoach" in installer
    assert 'DeleteRegKey HKCU "Software\\Classes\\.SC2Replay"' not in installer


def test_desktop_direct_dependencies_are_version_pinned_for_candidate_builds():
    requirements = (ROOT / "requirements-desktop.txt").read_text(encoding="utf-8")
    for requirement in (
        "Flask==3.1.3",
        "waitress==3.0.2",
        "pywebview==6.2.1",
        "pyinstaller==6.22.2",
        "Pillow==12.3.0",
        "protobuf==3.20.3",
        "vosk==0.3.45",
        "sounddevice==0.5.5",
    ):
        assert requirement in requirements
