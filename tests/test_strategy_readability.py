from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_readability_stylesheet_exists_and_loads_after_base_compiler_css():
    readability = STATIC / "strategy-compiler-readability.css"
    assert readability.is_file()

    app = (ROOT / "app.py").read_text(encoding="utf-8")
    assert '"/strategy-compiler-readability.css"' in app
    assert app.index('"/strategy-compiler.css"') < app.index('"/strategy-compiler-readability.css"')


def test_default_type_scale_avoids_tiny_live_and_setup_text():
    css = (STATIC / "strategy-compiler-readability.css").read_text(encoding="utf-8")

    assert ".strategy-brand span{font-size:.82rem" in css
    assert ".strategy-btn{" in css and "font-size:.76rem" in css
    assert ".strategy-goal-card b{font-size:.94rem" in css
    assert ".strategy-goal-card>span{font-size:.76rem" in css
    assert ".strategy-live-question strong{font-size:1.05rem" in css
    assert ".strategy-live-action p{font-size:.92rem" in css
    assert ".strategy-intel span{font-size:.84rem" in css
    assert "font-size:.76rem;\n  line-height:1.55" in css


def test_spacing_and_grid_density_are_balanced_for_desktop_and_small_screens():
    css = (STATIC / "strategy-compiler-readability.css").read_text(encoding="utf-8")

    assert ".strategy-section{padding:clamp(21px,2vw,29px)}" in css
    assert ".strategy-goal-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}" in css
    assert ".strategy-plan-grid{grid-template-columns:1.35fr .85fr;gap:18px}" in css
    assert ".strategy-live-focus>div{padding:26px}" in css
    assert "@media(max-width:900px)" in css
    assert ".strategy-goal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}" in css
    assert "@media(max-width:600px)" in css
    assert ".strategy-workflow,.strategy-goal-grid,.strategy-next-grid{grid-template-columns:1fr}" in css


def test_controls_meet_comfortable_pointer_target_size():
    css = (STATIC / "strategy-compiler-readability.css").read_text(encoding="utf-8")

    assert "min-height:44px" in css
    assert ".strategy-btn.strategy-mega{min-width:310px;min-height:58px" in css
    assert ".strategy-help{width:32px;height:32px" in css
