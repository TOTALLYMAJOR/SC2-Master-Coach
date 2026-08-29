from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "windows-release.yml"


def test_v113_dev_ci_builds_without_publishing_and_marks_only_after_artifacts():
    text = WORKFLOW.read_text(encoding="utf-8")
    assert "- v1.13-dev" in text
    assert "v1.13-ci-green" in text
    assert "git push origin \"HEAD:refs/heads/v1.13-ci-green\" --force" in text

    artifact = text.index("- name: Upload Windows artifacts")
    marker = text.index("- name: Mark validated v1.13 development commit")
    tagged_release = text.index("- name: Publish tagged GitHub Release")
    assert artifact < marker < tagged_release

    marker_block = text[marker:tagged_release]
    assert "github.ref == 'refs/heads/v1.13-dev'" in marker_block

    tag_block = text[tagged_release:]
    assert "startsWith(github.ref, 'refs/tags/v')" in tag_block
    assert "--verify-tag" in tag_block
    assert "--draft" in tag_block
    assert "Publish or refresh current version from main" not in text
    assert "gh release upload" not in text
    assert "--clobber" not in text


def test_next_release_versions_are_consistent():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    installer = (ROOT / "installer" / "sc2-master-coach.nsi").read_text(encoding="utf-8")
    assert 'CURRENT_VERSION = "1.14.0"' in app
    assert '!define VERSION "1.14.0"' in installer
    assert 'VIProductVersion "1.14.0.0"' in installer
