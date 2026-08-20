from __future__ import annotations

import importlib.util
import json
import os
import queue
import sys
import threading
import time
from pathlib import Path
from typing import Any


MODEL_NAME = "vosk-model-small-en-us-0.15"
GRAMMAR = (
    "reaper",
    "natural",
    "normal natural",
    "no natural",
    "fast third",
    "extra production",
    "two barracks",
    "three barracks",
    "four barracks",
    "factory",
    "starport",
    "move out",
    "turtle",
    "hidden tech",
    "air tech",
    "can i still do my plan",
    "can i still expand",
    "what next",
    "why",
    "safer plan",
    "greedier plan",
    "pause coach",
    "resume coach",
    "[unk]",
)

_MODEL = None
_MODEL_PATH: Path | None = None
_MODEL_LOCK = threading.Lock()
_LISTEN_LOCK = threading.Lock()


class OfflineVoiceError(RuntimeError):
    pass


def model_candidates() -> tuple[Path, ...]:
    candidates: list[Path] = []
    explicit = os.getenv("SC2_VOSK_MODEL")
    if explicit:
        candidates.append(Path(explicit).expanduser())

    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        candidates.append(Path(meipass) / "voice_models" / MODEL_NAME)

    root = Path(__file__).resolve().parents[2]
    candidates.append(root / "voice_models" / MODEL_NAME)

    if os.name == "nt":
        local = Path(os.environ.get("LOCALAPPDATA", Path.home()))
        candidates.append(local / "SC2 Master Coach" / "voice_models" / MODEL_NAME)
    else:
        candidates.append(Path.home() / ".cache" / "sc2-master-coach" / "voice_models" / MODEL_NAME)

    unique: list[Path] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate)
        if key not in seen:
            seen.add(key)
            unique.append(candidate)
    return tuple(unique)


def _looks_like_model(path: Path) -> bool:
    return path.is_dir() and (path / "am" / "final.mdl").is_file() and (path / "conf").is_dir()


def resolve_model_path() -> Path | None:
    for candidate in model_candidates():
        try:
            path = candidate.resolve()
        except OSError:
            path = candidate
        if _looks_like_model(path):
            return path
    return None


def _dependency_status(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def _sounddevice_status() -> dict[str, Any]:
    if not _dependency_status("sounddevice"):
        return {"ok": False, "devices": [], "default_input": None, "error": "sounddevice is not installed"}
    try:
        import sounddevice as sd

        rows = sd.query_devices()
        devices = []
        for index, row in enumerate(rows):
            channels = int(row.get("max_input_channels", 0) or 0)
            if channels <= 0:
                continue
            devices.append(
                {
                    "device_id": index,
                    "name": str(row.get("name") or f"Input {index}"),
                    "channels": channels,
                    "default_samplerate": int(float(row.get("default_samplerate", 0) or 0)),
                }
            )
        try:
            default_pair = sd.default.device
            default_input = int(default_pair[0]) if isinstance(default_pair, (list, tuple)) else int(default_pair)
        except Exception:
            default_input = None
        return {"ok": bool(devices), "devices": devices, "default_input": default_input}
    except Exception as exc:
        return {"ok": False, "devices": [], "default_input": None, "error": f"{type(exc).__name__}: {exc}"}


def voice_status() -> dict[str, Any]:
    model_path = resolve_model_path()
    audio = _sounddevice_status()
    vosk_ready = _dependency_status("vosk")
    sounddevice_ready = _dependency_status("sounddevice")
    ready = bool(vosk_ready and sounddevice_ready and model_path and audio.get("ok"))
    return {
        "ok": ready,
        "backend": "vosk",
        "offline": True,
        "model_name": MODEL_NAME,
        "model_path": str(model_path) if model_path else None,
        "model_ready": bool(model_path),
        "vosk_ready": vosk_ready,
        "sounddevice_ready": sounddevice_ready,
        "audio": audio,
        "grammar_size": len(GRAMMAR),
        "raw_audio_retained": False,
        "message": (
            "Offline tactical recognition is ready."
            if ready
            else "Offline tactical recognition is not ready; use Quick Intel while diagnostics are repaired."
        ),
    }


def _load_model():
    global _MODEL, _MODEL_PATH
    path = resolve_model_path()
    if path is None:
        raise OfflineVoiceError(
            f"Vosk model {MODEL_NAME} is missing. Set SC2_VOSK_MODEL or install the packaged voice model."
        )
    with _MODEL_LOCK:
        if _MODEL is not None and _MODEL_PATH == path:
            return _MODEL
        if not _dependency_status("vosk"):
            raise OfflineVoiceError("vosk is not installed")
        from vosk import Model, SetLogLevel

        SetLogLevel(-1)
        _MODEL = Model(str(path))
        _MODEL_PATH = path
        return _MODEL


def _confidence(result: dict[str, Any]) -> float:
    words = result.get("result") or []
    scores = []
    for row in words:
        try:
            scores.append(float(row.get("conf")))
        except (TypeError, ValueError):
            pass
    if scores:
        return max(0.0, min(1.0, sum(scores) / len(scores)))
    return 0.72 if str(result.get("text") or "").strip() else 0.0


def listen_once(*, timeout_seconds: float = 4.0, device_id: int | None = None) -> dict[str, Any]:
    """Capture one short tactical phrase and recognize it fully offline.

    Raw audio is held only in an in-memory queue for the duration of the call
    and is never written to disk by this function.
    """
    timeout_seconds = max(1.0, min(float(timeout_seconds), 6.0))
    if not _LISTEN_LOCK.acquire(blocking=False):
        raise OfflineVoiceError("A tactical voice capture is already running")

    started = time.perf_counter()
    try:
        if not _dependency_status("sounddevice"):
            raise OfflineVoiceError("sounddevice is not installed")
        if not _dependency_status("vosk"):
            raise OfflineVoiceError("vosk is not installed")

        import sounddevice as sd
        from vosk import KaldiRecognizer

        model = _load_model()
        requested_device = device_id
        try:
            device_info = sd.query_devices(requested_device, "input")
        except Exception as exc:
            raise OfflineVoiceError(f"No usable microphone input is available: {exc}") from exc

        sample_rate = int(float(device_info.get("default_samplerate", 16000) or 16000))
        audio_queue: queue.Queue[bytes] = queue.Queue(maxsize=32)

        def callback(indata, _frames, _time_info, status):
            if status:
                # PortAudio status is advisory; continue unless capture fails.
                pass
            try:
                audio_queue.put_nowait(bytes(indata))
            except queue.Full:
                try:
                    audio_queue.get_nowait()
                except queue.Empty:
                    pass
                try:
                    audio_queue.put_nowait(bytes(indata))
                except queue.Full:
                    pass

        recognizer = KaldiRecognizer(model, sample_rate, json.dumps(list(GRAMMAR)))
        recognizer.SetWords(True)
        transcript = ""
        result_payload: dict[str, Any] = {}
        deadline = time.monotonic() + timeout_seconds

        try:
            with sd.RawInputStream(
                samplerate=sample_rate,
                blocksize=4000,
                device=requested_device,
                dtype="int16",
                channels=1,
                callback=callback,
            ):
                while time.monotonic() < deadline:
                    remaining = max(0.05, min(0.35, deadline - time.monotonic()))
                    try:
                        data = audio_queue.get(timeout=remaining)
                    except queue.Empty:
                        continue
                    if recognizer.AcceptWaveform(data):
                        result_payload = json.loads(recognizer.Result())
                        transcript = str(result_payload.get("text") or "").strip()
                        if transcript:
                            break
        except Exception as exc:
            raise OfflineVoiceError(f"Microphone capture failed: {exc}") from exc

        if not transcript:
            result_payload = json.loads(recognizer.FinalResult())
            transcript = str(result_payload.get("text") or "").strip()

        duration_ms = max(0, round((time.perf_counter() - started) * 1000))
        return {
            "ok": bool(transcript),
            "transcript": transcript,
            "confidence": round(_confidence(result_payload), 3),
            "duration_ms": duration_ms,
            "sample_rate": sample_rate,
            "device_id": requested_device,
            "offline": True,
            "raw_audio_retained": False,
            "model_name": MODEL_NAME,
        }
    finally:
        _LISTEN_LOCK.release()
