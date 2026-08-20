from __future__ import annotations

import ctypes
import os
import platform
from ctypes import wintypes
from typing import Any


MAXPNAMELEN = 32
MMSYSERR_NOERROR = 0
WAVE_MAPPER = ctypes.c_size_t(-1).value


class WAVEINCAPSW(ctypes.Structure):
    _fields_ = [
        ("wMid", wintypes.WORD),
        ("wPid", wintypes.WORD),
        ("vDriverVersion", wintypes.DWORD),
        ("szPname", wintypes.WCHAR * MAXPNAMELEN),
        ("dwFormats", wintypes.DWORD),
        ("wChannels", wintypes.WORD),
        ("wReserved1", wintypes.WORD),
    ]


def _winmm():
    if os.name != "nt":
        return None
    library = ctypes.WinDLL("winmm")
    library.waveInGetNumDevs.restype = wintypes.UINT
    library.waveInGetDevCapsW.argtypes = [
        ctypes.c_size_t,
        ctypes.POINTER(WAVEINCAPSW),
        wintypes.UINT,
    ]
    library.waveInGetDevCapsW.restype = wintypes.UINT
    return library


def _read_caps(library, device_id: int) -> dict[str, Any] | None:
    caps = WAVEINCAPSW()
    result = int(
        library.waveInGetDevCapsW(
            ctypes.c_size_t(device_id),
            ctypes.byref(caps),
            ctypes.sizeof(WAVEINCAPSW),
        )
    )
    if result != MMSYSERR_NOERROR:
        return None
    return {
        "device_id": int(device_id),
        "name": str(caps.szPname).rstrip("\x00"),
        "channels": int(caps.wChannels),
        "formats_mask": int(caps.dwFormats),
        "manufacturer_id": int(caps.wMid),
        "product_id": int(caps.wPid),
    }


def enumerate_input_devices() -> list[dict[str, Any]]:
    """Enumerate Windows wave-input devices without third-party packages.

    This is a diagnostics boundary, not yet the offline recognizer. It answers
    the first practical question: does Windows expose at least one microphone
    endpoint to a native desktop process?
    """
    library = _winmm()
    if library is None:
        return []
    count = int(library.waveInGetNumDevs())
    devices: list[dict[str, Any]] = []
    for device_id in range(count):
        row = _read_caps(library, device_id)
        if row:
            devices.append(row)
    return devices


def audio_diagnostics() -> dict[str, Any]:
    if os.name != "nt":
        return {
            "ok": False,
            "platform": platform.system(),
            "backend": "unsupported",
            "native_input_supported": False,
            "device_count": 0,
            "devices": [],
            "message": "Native microphone diagnostics currently target Windows desktop builds.",
        }

    try:
        library = _winmm()
        assert library is not None
        devices = enumerate_input_devices()
        mapper = _read_caps(library, WAVE_MAPPER)
        return {
            "ok": bool(devices),
            "platform": platform.system(),
            "backend": "winmm",
            "native_input_supported": True,
            "device_count": len(devices),
            "devices": devices,
            "wave_mapper": mapper,
            "message": (
                "Windows exposes one or more native microphone input devices."
                if devices
                else "Windows did not expose a wave-input microphone device to the desktop process."
            ),
        }
    except Exception as exc:
        return {
            "ok": False,
            "platform": platform.system(),
            "backend": "winmm",
            "native_input_supported": True,
            "device_count": 0,
            "devices": [],
            "error": f"{type(exc).__name__}: {exc}",
            "message": "Native microphone enumeration failed.",
        }
