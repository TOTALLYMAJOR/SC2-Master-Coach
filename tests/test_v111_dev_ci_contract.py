from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "windows-release.yml"


def test_v112_dev_ci_builds_without_publishing_and_marks_only_after_artifacts():
    text = WORKFLOW.read_text(encoding="utf-8")
    assert "- v1.12-dev" in text
    assert "v1.12-ci-green" in text
    assert "git push origin \"HEAD:refs/heads/v1.12-ci-green\" --force" in text

    artifact = text.index("- name: Upload Windows artifacts")
    marker = text.index("- name: Mark validated v1.12 development commit")
    tagged_release = text.index("- name: Publish tagged GitHub Release")
    main_release = text.index("- name: Publish or refresh current version from main")
    assert artifact < marker < tagged_release < main_release

    marker_block = text[marker:tagged_release]
    assert "github.ref == 'refs/heads/v1.12-dev'" in marker_block

    tag_block = text[tagged_release:main_release]
    assert "startsWith(github.ref, 'refs/tags/v')" in tag_block

    main_block = text[main_release:]
    assert "github.ref == 'refs/heads/main'" in main_block


def test_v112_release_versions_are_consistent():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    assert 'CURRENT_VERSION = "1.12.1"' in app
    assert '!define VERSION "1.12.1"' in installer
    assert 'VIProductVersion "1.12.1.0"' in installer
