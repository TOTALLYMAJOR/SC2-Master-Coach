from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any
import json
import os
import re

# Current s2clientprotocol wheels contain legacy generated descriptors. A patched
# protobuf runtime remains compatible through its documented pure-Python path.
os.environ.setdefault("PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION", "python")

_CAPTURE_LOCK = Lock()
_SC2_RUNTIME_DLLS = ("icuuc52.dll", "icuin52.dll", "icudt52.dll")


class CaptureUnavailable(RuntimeError):
    """Raised when a real SC2 engine frame cannot be produced locally."""


@dataclass(frozen=True)
class CaptureRequest:
    replay_path: Path
    output_dir: Path
    second: float
    player_id: int
    camera_x: float | None = None
    camera_y: float | None = None
    width: int = 1280
    height: int = 720
    moment_key: str = "moment"


def _safe_name(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9._-]+", "-", value or "moment").strip("-.")
    return (text or "moment")[:80]


def _installed_builds(data_dir: str | Path) -> list[int]:
    versions_dir = Path(data_dir) / "Versions"
    if not versions_dir.is_dir():
        return []
    builds: list[int] = []
    for path in versions_dir.iterdir():
        match = re.fullmatch(r"Base(\d+)", path.name)
        if match and path.is_dir():
            builds.append(int(match.group(1)))
    return sorted(set(builds))


def _find_windows_runtime_dirs(data_dir: str | Path) -> tuple[list[Path], list[str]]:
    """Locate SC2's bundled Windows ICU runtime without copying DLLs.

    Normal Battle.net installs place these libraries in Support64. Some custom
    installs can move supporting files, so search the install root only when
    the standard locations do not contain the full ICU trio.
    """
    root = Path(data_dir).expanduser().resolve()
    targets = {name.lower() for name in _SC2_RUNTIME_DLLS}
    found: dict[str, Path] = {}

    for directory in (root / "Support64", root / "Support", root):
        if not directory.is_dir():
            continue
        for name in _SC2_RUNTIME_DLLS:
            candidate = directory / name
            if candidate.is_file():
                found[name.lower()] = directory
        if targets.issubset(found):
            break

    if not targets.issubset(found) and root.is_dir():
        # A Battle.net installation is finite and shallow enough for this
        # fallback. Stop immediately once every required runtime is found.
        for directory, dirnames, filenames in os.walk(root):
            # Version directories contain huge game payloads but not the shared
            # Support64 ICU runtime; avoiding them keeps first capture fast.
            dirnames[:] = [d for d in dirnames if d.lower() not in {"versions", "maps", "mods"}]
            lower_files = {name.lower(): name for name in filenames}
            for target in targets - set(found):
                if target in lower_files:
                    found[target] = Path(directory)
            if targets.issubset(found):
                break

    runtime_dirs: list[Path] = []
    for name in _SC2_RUNTIME_DLLS:
        directory = found.get(name.lower())
        if directory and directory not in runtime_dirs:
            runtime_dirs.append(directory)
    missing = [name for name in _SC2_RUNTIME_DLLS if name.lower() not in found]
    return runtime_dirs, missing


def _configure_windows_runtime(run_config: Any, *, strict: bool = True) -> dict[str, Any]:
    """Give the child SC2 process the same shared-library context Battle.net uses."""
    if os.name != "nt":
        return {"configured": False, "platform": os.name, "runtime_dirs": [], "missing": []}

    runtime_dirs, missing = _find_windows_runtime_dirs(run_config.data_dir)
    if missing:
        detail = (
            "StarCraft II's Support64 runtime is incomplete. Missing: "
            + ", ".join(missing)
            + ". Open Battle.net → StarCraft II → Settings → Scan and Repair, launch the game once, then retry. "
            "Do not download replacement DLLs from third-party DLL sites."
        )
        if strict:
            raise CaptureUnavailable(detail)
        return {
            "configured": False,
            "runtime_dirs": [str(p) for p in runtime_dirs],
            "missing": missing,
            "reason": detail,
        }

    # The SC2 executable lives under Versions/BaseXXXXX, while its shared ICU
    # libraries live under Support64. PySC2 normally uses Support64 as cwd, but
    # an embedded desktop launch should not rely on inherited DLL search state.
    # Set both cwd and PATH explicitly for the child process.
    preferred = next((p for p in runtime_dirs if p.name.lower() == "support64"), runtime_dirs[0])
    run_config.cwd = str(preferred)
    env = dict(os.environ)
    if getattr(run_config, "env", None):
        env.update(run_config.env)
    existing_path = env.get("PATH", "")
    runtime_path = os.pathsep.join(str(p) for p in runtime_dirs)
    env["PATH"] = runtime_path + (os.pathsep + existing_path if existing_path else "")
    run_config.env = env
    return {
        "configured": True,
        "runtime_dirs": [str(p) for p in runtime_dirs],
        "cwd": str(preferred),
        "missing": [],
    }


def _runtime_replay_version(replay_version: Any):
    """Make an exact local-build version PySC2 accepts for new SC2 patches."""
    from pysc2.run_configs import lib as run_configs_lib

    build_version = int(getattr(replay_version, "build_version", 0) or 0)
    data_version = getattr(replay_version, "data_version", None)
    game_version = str(getattr(replay_version, "game_version", "") or "")
    if not build_version:
        raise CaptureUnavailable("The replay does not expose a usable SC2 BaseBuild.")
    if not data_version:
        raise CaptureUnavailable(
            "The replay does not expose a DataVersion, so its exact local SC2 binary cannot be selected safely."
        )
    return run_configs_lib.Version(
        game_version=game_version or f"build-{build_version}",
        build_version=build_version,
        data_version=str(data_version),
        binary="local-install",
    )


def _select_replay_run_config(replay_data: bytes):
    from pysc2 import run_configs
    from pysc2.lib import replay as replay_lib

    default_config = run_configs.get()
    replay_version = replay_lib.get_replay_version(replay_data)
    replay_build = int(getattr(replay_version, "build_version", 0) or 0)
    installed = _installed_builds(default_config.data_dir)
    exact_dir = Path(default_config.data_dir) / "Versions" / f"Base{replay_build:05d}"

    if replay_build and exact_dir.is_dir() and getattr(replay_version, "data_version", None):
        exact_version = _runtime_replay_version(replay_version)
        return run_configs.get(version=exact_version), replay_version, "exact-base-build"

    latest_build = int(getattr(default_config.version, "build_version", 0) or 0)
    if replay_build and replay_build == latest_build:
        return default_config, replay_version, "latest-alias"

    available = ", ".join(str(x) for x in installed[-8:]) or "none detected"
    raise CaptureUnavailable(
        f"Replay {getattr(replay_version, 'game_version', 'unknown')} requires "
        f"SC2 Base{replay_build:05d}, but that local binary was not found. "
        f"Installed Base builds: {available}. Launch Battle.net, update StarCraft II, "
        "and open the game once so the matching replay binary is installed."
    )


def capture_status() -> dict[str, Any]:
    status = {
        "available": False,
        "renderer": "StarCraft II API RGB renderer",
        "requires_local_sc2": True,
        "reason": None,
        "sc2_path": os.environ.get("SC2PATH"),
        "installed_builds": [],
        "latest_build": None,
        "runtime": None,
    }
    try:
        from absl import flags
        from pysc2 import run_configs

        if not flags.FLAGS.is_parsed():
            flags.FLAGS(["sc2-master-coach"])
        run_config = run_configs.get()
        data_dir = Path(getattr(run_config, "data_dir", ""))
        status["sc2_path"] = str(data_dir) if str(data_dir) else status["sc2_path"]
        if not data_dir.is_dir():
            status["reason"] = (
                "StarCraft II was not detected. Install/run SC2 once, or set SC2PATH "
                "to the StarCraft II installation directory."
            )
            return status
        versions = data_dir / "Versions"
        if not versions.is_dir():
            status["reason"] = "The StarCraft II Versions directory was not found."
            return status
        installed = _installed_builds(data_dir)
        status["installed_builds"] = installed
        status["latest_build"] = installed[-1] if installed else None
        if not installed:
            status["reason"] = "No local StarCraft II Base build directories were found."
            return status
        if os.name == "nt":
            runtime = _configure_windows_runtime(run_config, strict=False)
            status["runtime"] = runtime
            if runtime.get("missing"):
                status["reason"] = runtime.get("reason")
                return status
        status["available"] = True
        return status
    except ImportError as exc:
        status["reason"] = f"RGB replay renderer dependency is unavailable: {exc}"
        return status
    except Exception as exc:
        status["reason"] = f"SC2 renderer readiness check failed: {type(exc).__name__}: {exc}"
        return status


def _save_rgb_image(image_data: Any, target: Path) -> dict[str, Any]:
    from PIL import Image
    from pysc2.lib import features

    pixels = features.Feature.unpack_rgb_image(image_data)
    if pixels is None or getattr(pixels, "ndim", 0) != 3:
        raise CaptureUnavailable("SC2 did not return a usable RGB frame.")
    target.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(pixels).save(target, format="PNG", optimize=True)
    return {
        "filename": target.name,
        "width": int(pixels.shape[1]),
        "height": int(pixels.shape[0]),
    }


def _camera_action(x: float, y: float, distance: float = 0.0):
    from s2clientprotocol import common_pb2 as sc_common
    from s2clientprotocol import sc2api_pb2 as sc_pb

    return sc_pb.ObserverAction(
        camera_move=sc_pb.ActionObserverCameraMove(
            world_pos=sc_common.Point2D(x=float(x), y=float(y)),
            distance=float(distance),
        )
    )


def _step_to_loop(controller: Any, target_loop: int) -> int:
    first = controller.observe()
    current = int(first.observation.game_loop)
    while current < target_loop:
        count = min(2240, target_loop - current)
        controller.step(max(1, count))
        obs = controller.observe()
        current = int(obs.observation.game_loop)
        if obs.player_result:
            break
    return current


def _capture_locked(req: CaptureRequest) -> dict[str, Any]:
    from absl import flags
    from s2clientprotocol import sc2api_pb2 as sc_pb

    if not flags.FLAGS.is_parsed():
        flags.FLAGS(["sc2-master-coach"])

    replay_path = req.replay_path.expanduser().resolve()
    if not replay_path.is_file():
        raise CaptureUnavailable("The stored replay file is missing.")

    from pysc2 import run_configs

    base_run_config = run_configs.get()
    replay_data = base_run_config.replay_data(str(replay_path))
    run_config, replay_version, version_resolution = _select_replay_run_config(replay_data)
    runtime_context = _configure_windows_runtime(run_config) if os.name == "nt" else None

    interface = sc_pb.InterfaceOptions(
        raw=True,
        score=True,
        show_cloaked=True,
        show_burrowed_shadows=True,
        show_placeholders=True,
    )
    interface.raw_affects_selection = True
    interface.render.resolution.x = int(req.width)
    interface.render.resolution.y = int(req.height)
    interface.render.minimap_resolution.x = 320
    interface.render.minimap_resolution.y = 180

    safe_key = _safe_name(req.moment_key)
    stem = f"{safe_key}-{int(round(req.second * 10)):06d}-p{int(req.player_id)}"
    player_path = req.output_dir / f"{stem}-player-pov.png"
    truth_path = req.output_dir / f"{stem}-observer-truth.png"
    player_minimap_path = req.output_dir / f"{stem}-player-minimap.png"
    truth_minimap_path = req.output_dir / f"{stem}-truth-minimap.png"
    metadata_path = req.output_dir / f"{stem}.json"

    if player_path.is_file() and truth_path.is_file() and metadata_path.is_file():
        return json.loads(metadata_path.read_text(encoding="utf-8"))

    with run_config.start(
        want_rgb=True,
        window_size=(max(640, req.width), max(480, req.height)),
    ) as controller:
        info = controller.replay_info(replay_data)
        map_data = None
        map_data_error = None
        if info.local_map_path:
            try:
                try:
                    map_data = run_config.map_data(info.local_map_path, len(info.player_info))
                except TypeError:
                    map_data = run_config.map_data(info.local_map_path)
            except Exception as exc:
                map_data_error = f"{type(exc).__name__}: {exc}"
                map_data = None

        start = sc_pb.RequestStartReplay(
            replay_data=replay_data,
            map_data=map_data,
            options=interface,
            observed_player_id=int(req.player_id),
            disable_fog=False,
            realtime=False,
        )
        controller.start_replay(start)

        loops_per_second = 22.4
        if getattr(info, "game_duration_seconds", 0) and getattr(info, "game_duration_loops", 0):
            loops_per_second = float(info.game_duration_loops) / float(info.game_duration_seconds)
        target_loop = max(0, int(round(float(req.second) * loops_per_second)))
        reached_loop = _step_to_loop(controller, target_loop)

        if req.camera_x is not None and req.camera_y is not None:
            controller.observer_act(_camera_action(req.camera_x, req.camera_y))
            controller.step(1)

        player_obs = controller.observe(disable_fog=False)
        truth_obs = controller.observe(disable_fog=True)

        player_render = player_obs.observation.render_data
        truth_render = truth_obs.observation.render_data
        if not player_render.HasField("map") or not truth_render.HasField("map"):
            raise CaptureUnavailable(
                "SC2 started the replay but did not return RGB render_data. "
                "Check graphics support and the local game installation."
            )

        req.output_dir.mkdir(parents=True, exist_ok=True)
        player_meta = _save_rgb_image(player_render.map, player_path)
        truth_meta = _save_rgb_image(truth_render.map, truth_path)
        player_minimap_meta = None
        truth_minimap_meta = None
        if player_render.HasField("minimap"):
            player_minimap_meta = _save_rgb_image(player_render.minimap, player_minimap_path)
        if truth_render.HasField("minimap"):
            truth_minimap_meta = _save_rgb_image(truth_render.minimap, truth_minimap_path)

    result = {
        "renderer": "StarCraft II API RGB renderer",
        "actual_game_render": True,
        "requested_second": round(float(req.second), 3),
        "target_game_loop": target_loop,
        "reached_game_loop": reached_loop,
        "loops_per_second": round(loops_per_second, 4),
        "player_id": int(req.player_id),
        "replay_version": {
            "game_version": getattr(replay_version, "game_version", None),
            "build_version": getattr(replay_version, "build_version", None),
            "data_version": getattr(replay_version, "data_version", None),
            "resolution": version_resolution,
        },
        "runtime_context": runtime_context,
        "map_data_warning": map_data_error,
        "camera": {
            "x": req.camera_x,
            "y": req.camera_y,
            "source": "recorded replay camera" if req.camera_x is not None and req.camera_y is not None else "SC2 default camera",
        },
        "frames": {
            "player": player_meta,
            "truth": truth_meta,
            "player_minimap": player_minimap_meta,
            "truth_minimap": truth_minimap_meta,
        },
        "evidence_boundary": (
            "Frames are rendered by the local StarCraft II engine from the replay. "
            "Player POV keeps fog enabled; Observer Truth requests fog disabled. "
            "The render resolution is chosen by SC2 Master Coach and may not exactly match "
            "the player's original monitor resolution or UI scale."
        ),
    }
    metadata_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def capture_replay_views(req: CaptureRequest) -> dict[str, Any]:
    with _CAPTURE_LOCK:
        try:
            return _capture_locked(req)
        except CaptureUnavailable:
            raise
        except ImportError as exc:
            raise CaptureUnavailable(f"Replay rendering dependency is unavailable: {exc}") from exc
        except Exception as exc:
            message = f"{type(exc).__name__}: {exc}"
            if (
                "SC2" in message
                or "StarCraft" in message
                or "binary" in message.lower()
                or "Unknown game version" in message
                or "BaseBuild" in message
                or "icuuc52.dll" in message.lower()
            ):
                raise CaptureUnavailable(message) from exc
            raise RuntimeError(message) from exc
