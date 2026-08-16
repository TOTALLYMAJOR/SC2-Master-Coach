from __future__ import annotations

from pathlib import Path
from typing import Any, Callable


class ReplayBuildUnavailable(ValueError):
    """Raised when the replay's exact SC2 Base build is not installed."""


def installed_base_builds(data_dir: str | Path) -> list[int]:
    versions_dir = Path(data_dir) / "Versions"
    builds: list[int] = []
    if not versions_dir.is_dir():
        return builds
    for entry in versions_dir.iterdir():
        if not entry.is_dir() or not entry.name.startswith("Base"):
            continue
        suffix = entry.name[4:]
        if suffix.isdigit():
            builds.append(int(suffix))
    return sorted(set(builds))


def apply_replay_version(run_config: Any, replay_version: Any) -> Any:
    """Bind a local run config to replay metadata without PySC2's stale catalog.

    PySC2's Windows run config normally recognizes only versions listed in its
    bundled static table. Current retail builds can therefore appear only as
    ``latest`` even though the exact ``Versions/Base#####`` binary is present.
    Replay metadata already contains both BaseBuild and DataVersion, so use
    those values when the matching local binary directory exists.
    """

    build = getattr(replay_version, "build_version", None)
    game_version = getattr(replay_version, "game_version", None) or "unknown"
    if not isinstance(build, int) or build <= 0:
        raise ReplayBuildUnavailable(
            f"Replay {game_version} does not expose a usable BaseBuild value."
        )

    available = installed_base_builds(getattr(run_config, "data_dir", ""))
    expected = Path(run_config.data_dir) / "Versions" / f"Base{build:05d}"
    if not expected.is_dir():
        listed = ", ".join(str(value) for value in available) or "none detected"
        raise ReplayBuildUnavailable(
            f"Replay requires SC2 base build {build} ({game_version}), but that "
            f"binary is not installed. Installed base builds: {listed}. Launch "
            "StarCraft II through Battle.net, then retry. Older replays require "
            "their matching Base build to remain installed."
        )

    run_config.version = replay_version
    run_config.sc2_master_coach_version_resolution = {
        "strategy": "replay-metadata-exact-base-build",
        "game_version": game_version,
        "build_version": build,
        "data_version": getattr(replay_version, "data_version", None),
        "binary_directory": str(expected),
    }
    return run_config


def install_pysc2_version_compatibility() -> bool:
    """Patch PySC2 version lookup to support newer installed retail builds.

    The patch is deliberately narrow: it activates only when PySC2 raises its
    ``Unknown game version`` error. It never substitutes an arbitrary newer
    binary. The replay's exact BaseBuild directory must exist locally.
    """

    try:
        from pysc2 import run_configs
    except Exception:
        return False

    current_get: Callable[..., Any] = run_configs.get
    if getattr(current_get, "_sc2_master_coach_compatible", False):
        return True

    original_get = current_get

    def compatible_get(version=None):
        try:
            return original_get(version=version)
        except ValueError as exc:
            if version is None or "Unknown game version" not in str(exc):
                raise
            latest_config = original_get(version=None)
            return apply_replay_version(latest_config, version)

    compatible_get._sc2_master_coach_compatible = True  # type: ignore[attr-defined]
    compatible_get._sc2_master_coach_original = original_get  # type: ignore[attr-defined]
    run_configs.get = compatible_get
    return True
