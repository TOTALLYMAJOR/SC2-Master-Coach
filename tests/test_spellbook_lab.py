from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_spellbook_lab_assets_exist():
    for name in (
        "spellbook-lab.css",
        "spellbook-core.js",
        "spellbook-performance.js",
        "spellbook-evolution.js",
        "spellbook-signals.js",
        "spellbook-sources.js",
        "spellbook-curriculum.js",
    ):
        assert (STATIC / name).is_file(), name


def test_app_loads_all_five_spellbook_systems():
    app = (ROOT / "app.py").read_text(encoding="utf-8")
    for asset in (
        "/spellbook-lab.css",
        "/spellbook-core.js",
        "/spellbook-performance.js",
        "/spellbook-evolution.js",
        "/spellbook-signals.js",
        "/spellbook-sources.js",
        "/spellbook-curriculum.js",
    ):
        assert asset in app


def test_spellbook_live_evidence_boundary_is_explicit():
    core = (STATIC / "spellbook-core.js").read_text(encoding="utf-8")
    assert "Unavailable live" in core
    assert "exact minerals" in core
    assert "enemy production" in core
    assert "Unknown" in core


def test_spell_effectiveness_does_not_claim_global_win_rate():
    performance = (STATIC / "spellbook-performance.js").read_text(encoding="utf-8")
    assert "Only replays you explicitly link count" in performance
    assert "No invented global win rate" in performance
    assert "EARLY SAMPLE" in performance
    assert "STRONGER SAMPLE" in performance


def test_replay_evolution_preserves_canonical_spells():
    evolution = (STATIC / "spellbook-evolution.js").read_text(encoding="utf-8")
    assert "Canonical spells are never silently rewritten" in evolution
    assert "Create personal variant" in evolution
    assert "Engagement gate" in evolution
    assert "Greed abort trigger" in evolution


def test_quick_signal_controller_is_manual_and_brief():
    signals = (STATIC / "spellbook-signals.js").read_text(encoding="utf-8")
    assert "One tap supplies information" in signals
    assert "Fast third" in signals
    assert "Extra production" in signals
    assert "Move-out" in signals
    assert "Normal callouts stay to one short sentence" in signals
    assert "Compact live mode" in signals


def test_sources_are_patch_aware_and_separate_from_effectiveness():
    sources = (STATIC / "spellbook-sources.js").read_text(encoding="utf-8")
    assert "5.0.16b" in sources
    assert "CURRENT PATCH" in sources
    assert "REVIEW / STALE" in sources
    assert "Source presence is not evidence of effectiveness" in sources


def test_curriculum_uses_bounded_five_game_experiment():
    curriculum = (STATIC / "spellbook-curriculum.js").read_text(encoding="utf-8")
    assert "five-game experiment" in curriculum
    assert "Scout on Schedule" in curriculum
    assert "Production Conversion" in curriculum
    assert "Engagement Gate" in curriculum
    assert "Greed Abort" in curriculum
