from __future__ import annotations

from pathlib import Path

import python_strategy_science.api as science_api_module
from app import app
from python_strategy_science.voice import GRAMMAR, MODEL_NAME, resolve_model_path, voice_status


ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"


def test_offline_voice_grammar_contains_decision_changing_starcraft_phrases():
    required = {
        "reaper",
        "natural",
        "no natural",
        "fast third",
        "extra production",
        "two barracks",
        "three barracks",
        "factory",
        "starport",
        "move out",
        "hidden tech",
        "can i still do my plan",
        "what next",
        "why",
    }
    assert required.issubset(set(GRAMMAR))
    assert "[unk]" in GRAMMAR


def test_voice_model_can_be_resolved_from_explicit_local_path(monkeypatch, tmp_path: Path):
    model = tmp_path / MODEL_NAME
    (model / "am").mkdir(parents=True)
    (model / "conf").mkdir(parents=True)
    (model / "am" / "final.mdl").write_bytes(b"test")
    monkeypatch.setenv("SC2_VOSK_MODEL", str(model))
    assert resolve_model_path() == model.resolve()


def test_voice_status_never_claims_raw_audio_retention():
    row = voice_status()
    assert row["backend"] == "vosk"
    assert row["offline"] is True
    assert row["raw_audio_retained"] is False
    assert row["grammar_size"] == len(GRAMMAR)
    assert "model_ready" in row
    assert "sounddevice_ready" in row
    assert "vosk_ready" in row


def test_voice_status_endpoint_is_safe_even_when_local_model_or_device_is_unavailable():
    client = app.test_client()
    response = client.get("/api/science/voice/status")
    assert response.status_code == 200
    body = response.get_json()
    assert body["backend"] == "vosk"
    assert body["offline"] is True
    assert body["raw_audio_retained"] is False


def test_voice_listen_endpoint_returns_transcript_without_requiring_real_ci_microphone(monkeypatch):
    monkeypatch.setattr(
        science_api_module,
        "listen_once",
        lambda **_kwargs: {
            "ok": True,
            "transcript": "move out",
            "confidence": 0.97,
            "duration_ms": 450,
            "sample_rate": 16000,
            "device_id": None,
            "offline": True,
            "raw_audio_retained": False,
            "model_name": MODEL_NAME,
        },
    )
    client = app.test_client()
    response = client.post("/api/science/voice/listen", json={"timeout_seconds": 4})
    assert response.status_code == 200
    body = response.get_json()
    assert body["transcript"] == "move out"
    assert body["confidence"] == 0.97
    assert body["raw_audio_retained"] is False


def test_native_voice_frontend_loads_after_shadow_helpers_and_preserves_voice_provenance():
    app_source = (ROOT / "app.py").read_text(encoding="utf-8")
    assert '"/v111-native-voice.js"' in app_source
    assert (
        app_source.index('"/v110-hud.js"')
        < app_source.index('"/v111-python-shadow.js"')
        < app_source.index('"/v111-opportunity-cost.js"')
        < app_source.index('"/v111-native-voice.js"')
    )

    ui = (STATIC / "v111-native-voice.js").read_text(encoding="utf-8")
    for phrase in (
        'fetch("/api/science/voice/status"',
        'fetch("/api/science/voice/listen"',
        'E.reportEvidence(intent.evidenceType,intent.payload||{},"player_voice"',
        "parsed.confirmationRequired",
        "Apply report",
        "Raw audio is not retained",
        "Quick Intel remains fully functional",
    ):
        assert phrase in ui

    # Spoken intel must not masquerade as a mouse click to update canonical state.
    assert "button.click();continue" not in ui


def test_native_voice_observer_is_hud_scoped_and_idempotent():
    ui = (STATIC / "v111-native-voice.js").read_text(encoding="utf-8")
    assert "setTextIfChanged(button,label)" in ui
    assert "if(node.textContent!==text)node.textContent=text" in ui
    assert 'observer.observe(hud,{subtree:true,childList:true})' in ui
    assert "observer.observe(document.documentElement" not in ui


def test_release_workflow_packages_vosk_model_and_native_voice_dependencies():
    workflow = (ROOT / ".github" / "workflows" / "windows-release.yml").read_text(encoding="utf-8")
    requirements = (ROOT / "requirements-desktop.txt").read_text(encoding="utf-8")
    assert "vosk==0.3.45" in requirements
    assert "sounddevice==0.5.5" in requirements
    assert "vosk-model-small-en-us-0.15" in workflow
    assert "https://alphacephei.com/vosk/models/$modelName.zip" in workflow
    assert '"--collect-all", "vosk"' in workflow
    assert '"--collect-all", "sounddevice"' in workflow
    assert "Packaged offline Vosk model was not found" in workflow
    assert "if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/v1.11-dev' || startsWith(github.ref, 'refs/tags/v1.11')" in workflow
