from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any
import json
import math
import os
import re

_CAPTURE_LOCK = Lock()


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


def capture_status() -> dict[str, Any]:
    status = {
        "available": False,
        "renderer": "StarCraft II API RGB renderer",
        "requires_local_sc2": True,
        "reason": None,
        "sc2_path": os.environ.get("SC2PATH"),
    }
    try:
        from absl import flags
        from pysc2 import run_configs
        from pysc2.lib import sc_process

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
    current = 0
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
    from pysc2 import run_configs
    from pysc2.lib import replay as replay_lib
    from s2clientprotocol import sc2api_pb2 as sc_pb

    if not flags.FLAGS.is_parsed():
        flags.FLAGS(["sc2-master-coach"])

    replay_path = req.replay_path.expanduser().resolve()
    if not replay_path.is_file():
        raise CaptureUnavailable("The stored replay file is missing.")

    base_run_config = run_configs.get()
    replay_data = base_run_config.replay_data(str(replay_path))
    version = replay_lib.get_replay_version(replay_data)
    run_config = run_configs.get(version=version)

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
        if info.local_map_path:
            try:
                map_data = run_config.map_data(info.local_map_path, len(info.player_info))
            except TypeError:
                map_data = run_config.map_data(info.local_map_path)

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
            if "SC2" in message or "StarCraft" in message or "binary" in message.lower():
                raise CaptureUnavailable(message) from exc
            raise RuntimeError(message) from exc
