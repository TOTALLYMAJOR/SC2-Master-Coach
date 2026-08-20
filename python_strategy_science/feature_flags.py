from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum


class ScienceMode(str, Enum):
    OFF = "off"
    SHADOW = "shadow"
    ADVISORY = "advisory"
    ACTIVE = "active"


@dataclass(frozen=True)
class ScienceSettings:
    mode: ScienceMode
    discovery_enabled: bool
    database_path: str | None

    @property
    def enabled(self) -> bool:
        return self.mode is not ScienceMode.OFF

    @property
    def may_influence_live_surface(self) -> bool:
        # Active mode remains explicit. Shadow/advisory output never mutates
        # canonical Strategic OS state.
        return self.mode is ScienceMode.ACTIVE


def _truthy(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def load_settings() -> ScienceSettings:
    raw_mode = os.getenv("SC2_STRATEGY_SCIENCE_MODE", "shadow").strip().lower()
    try:
        mode = ScienceMode(raw_mode)
    except ValueError:
        mode = ScienceMode.SHADOW
    return ScienceSettings(
        mode=mode,
        discovery_enabled=_truthy("SC2_STRATEGY_DISCOVERY", False),
        database_path=os.getenv("SC2_STRATEGY_SCIENCE_DB") or None,
    )
