from __future__ import annotations

from collections import defaultdict
from typing import Any
import math
import statistics

# Conservative coaching heuristics, not exact game-balance truth. Blizzard's
# tracker unit-position events are sparse, so all visibility conclusions carry
# an explicit confidence label.
VISION_RADIUS = 10.0
CAMERA_ATTENTION_RADIUS = 24.0
OPPORTUNITY_HORIZON = 90


def safe_attr(obj: Any, name: str, default=None):
    try:
        value = getattr(obj, name)
        return default if value is None else value
    except Exception:
        return default


def sec_of(event: Any) -> int:
    value = safe_attr(event, "second")
    if value is not None:
        return int(value)
    frame = safe_attr(event, "frame", 0) or 0
    return int(frame // 16)


def player_pid(event: Any) -> int | None:
    value = safe_attr(event, "pid")
    if isinstance(value, int) and value > 0:
        return value
    player = safe_attr(event, "player")
    value = safe_attr(player, "pid")
    if isinstance(value, int) and value > 0:
        return value
    return None


def unit_owner_pid(event: Any) -> int | None:
    for attr in ("control_pid", "upkeep_pid", "pid"):
        value = safe_attr(event, attr)
        if isinstance(value, int) and value > 0:
            return value
    unit = safe_attr(event, "unit", event)
    owner = safe_attr(unit, "owner")
    value = safe_attr(owner, "pid")
    return int(value) if isinstance(value, int) and value > 0 else None


def unit_name(event_or_unit: Any) -> str:
    name = safe_attr(event_or_unit, "unit_type_name")
    if name:
        return str(name)
    unit = safe_attr(event_or_unit, "unit", event_or_unit)
    for attr in ("name", "type_name"):
        value = safe_attr(unit, attr)
        if value:
            return str(value)
    return "Unknown"


def unit_tag(event_or_unit: Any) -> str | None:
    unit = safe_attr(event_or_unit, "unit", event_or_unit)
    for attr in ("id", "tag", "unit_id", "unit_tag"):
        value = safe_attr(unit, attr)
        if value is not None:
            return str(value)
    idx = safe_attr(event_or_unit, "unit_id") or safe_attr(event_or_unit, "unit_tag_index")
    rec = safe_attr(event_or_unit, "unit_tag_recycle")
    if idx is not None:
        return f"{idx}:{rec or 0}"
    return None


def point_of(obj: Any) -> tuple[float, float] | None:
    x = safe_attr(obj, "x")
    y = safe_attr(obj, "y")
    if x is not None and y is not None:
        try:
            return float(x), float(y)
        except Exception:
            pass
    loc = safe_attr(obj, "location") or safe_attr(obj, "point") or safe_attr(obj, "target")
    if loc is not None:
        x = safe_attr(loc, "x")
        y = safe_attr(loc, "y")
        if x is not None and y is not None:
            try:
                return float(x), float(y)
            except Exception:
                return None
    return None


def distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def selected_units(event: Any) -> list[str]:
    candidates = []
    for attr in ("new_units", "objects", "selected", "units"):
        value = safe_attr(event, attr)
        if value:
            if isinstance(value, dict):
                value = list(value.keys()) or list(value.values())
            if isinstance(value, (list, tuple, set)):
                candidates = list(value)
                break
    out = []
    for item in candidates:
        tag = unit_tag(item)
        name = unit_name(item)
        out.append(f"{name}:{tag or '?'}")
    return out[:24]


def command_label(event: Any) -> str:
    for attr in ("ability_name", "ability", "command_name"):
        value = safe_attr(event, attr)
        if value:
            name = safe_attr(value, "name") or value
            return str(name)
    return str(safe_attr(event, "name", event.__class__.__name__))


def iter_position_updates(event: Any):
    """Best-effort compatibility across sc2reader tracker wrapper versions."""
    second = sec_of(event)
    for attr in ("positions", "units"):
        value = safe_attr(event, attr)
        if isinstance(value, dict):
            for unit, point in value.items():
                pos = point_of(point) or point_of(unit)
                if pos:
                    yield unit_tag(unit), unit_owner_pid(unit), unit_name(unit), second, pos
            return
        if isinstance(value, (list, tuple)):
            for item in value:
                if isinstance(item, (list, tuple)) and len(item) >= 2:
                    unit, point = item[0], item[1]
                    pos = point_of(point) or point_of(unit)
                    if pos:
                        yield unit_tag(unit), unit_owner_pid(unit), unit_name(unit), second, pos
            if value:
                return
    value = safe_attr(event, "items")
    if isinstance(value, (list, tuple)):
        for item in value:
            pos = point_of(item)
            if pos:
                yield unit_tag(item), unit_owner_pid(item), unit_name(item), second, pos


def reconstruct_observation_model(replay: Any, players: list[dict], structures: dict[str, set[str]] | None = None) -> dict[str, dict]:
    structures = structures or {}
    events = list(safe_attr(replay, "events", []) or [])
    tracker = list(safe_attr(replay, "tracker_events", []) or [])
    if not tracker:
        tracker = [e for e in events if "Unit" in str(safe_attr(e, "name", "")) or "PlayerStats" in str(safe_attr(e, "name", ""))]

    cameras: dict[int, list[dict]] = defaultdict(list)
    selections: dict[int, list[dict]] = defaultdict(list)
    commands: dict[int, list[dict]] = defaultdict(list)
    tracks: dict[str, list[dict]] = defaultdict(list)
    unit_meta: dict[str, dict] = {}
    opportunities: list[dict] = []

    for event in events:
        name = str(safe_attr(event, "name", event.__class__.__name__))
        pid = player_pid(event)
        if not pid:
            continue
        second = sec_of(event)
        if name == "CameraEvent":
            pos = point_of(event)
            if pos:
                cameras[pid].append({"second": second, "x": round(pos[0], 2), "y": round(pos[1], 2)})
        elif name == "SelectionEvent":
            selections[pid].append({"second": second, "units": selected_units(event)})
        elif name.endswith("CommandEvent") or "AbilityEvent" in name:
            pos = point_of(event)
            commands[pid].append({
                "second": second,
                "command": command_label(event),
                "x": round(pos[0], 2) if pos else None,
                "y": round(pos[1], 2) if pos else None,
            })

    race_by_pid = {p["pid"]: p.get("race", "Unknown") for p in players}

    for event in tracker:
        name = str(safe_attr(event, "name", event.__class__.__name__))
        second = sec_of(event)
        if name in ("UnitBornEvent", "UnitInitEvent"):
            pid = unit_owner_pid(event)
            pos = point_of(event) or point_of(safe_attr(event, "unit"))
            tag = unit_tag(event)
            uname = unit_name(event)
            if tag and pos:
                unit_meta[tag] = {"pid": pid, "name": uname}
                tracks[tag].append({"second": second, "x": pos[0], "y": pos[1], "pid": pid, "name": uname})
            race = race_by_pid.get(pid, "Unknown")
            if pid and pos and uname in structures.get(race, set()):
                opportunities.append({
                    "second": second,
                    "pid": pid,
                    "unit": uname,
                    "kind": "expansion" if uname in {"CommandCenter", "Nexus", "Hatchery"} else "structure",
                    "x": pos[0], "y": pos[1],
                })
        elif name == "UnitPositionsEvent":
            for tag, pid, uname, t, pos in iter_position_updates(event):
                if not tag:
                    continue
                meta = unit_meta.get(tag, {})
                pid = pid or meta.get("pid")
                uname = uname if uname != "Unknown" else meta.get("name", "Unknown")
                unit_meta[tag] = {"pid": pid, "name": uname}
                tracks[tag].append({"second": t, "x": pos[0], "y": pos[1], "pid": pid, "name": uname})

    for bucket in (cameras, selections, commands):
        for pid in bucket:
            bucket[pid].sort(key=lambda x: x["second"])
    for tag in tracks:
        tracks[tag].sort(key=lambda x: x["second"])

    def friendly_position_samples(pid: int, start: int, end: int):
        for points in tracks.values():
            if not points or points[0].get("pid") != pid:
                continue
            latest_before = None
            for p in points:
                if p["second"] <= start:
                    latest_before = p
                elif p["second"] > end:
                    break
            if latest_before is not None:
                yield {**latest_before, "second": start, "position_age": start - latest_before["second"]}
            for p in points:
                if start < p["second"] <= end:
                    yield {**p, "position_age": 0}

    def first_camera_near(pid: int, pos: tuple[float, float], start: int, end: int):
        for cam in cameras.get(pid, []):
            if cam["second"] < start:
                continue
            if cam["second"] > end:
                break
            if distance((cam["x"], cam["y"]), pos) <= CAMERA_ATTENTION_RADIUS:
                return cam
        return None

    def first_selection_after(pid: int, start: int, end: int):
        return next((x for x in selections.get(pid, []) if start <= x["second"] <= end), None)

    def first_command_after(pid: int, start: int, end: int):
        return next((x for x in commands.get(pid, []) if start <= x["second"] <= end), None)

    result: dict[str, dict] = {}
    duration = max([sec_of(e) for e in events[-20:]] + [1]) if events else 1

    for me in players:
        pid = me["pid"]
        opp_ids = {p["pid"] for p in players if p["pid"] != pid}
        rows = []
        for opp in opportunities:
            if opp["pid"] not in opp_ids:
                continue
            start = opp["second"]
            end = start + OPPORTUNITY_HORIZON
            target = (opp["x"], opp["y"])
            first_visible = None
            visibility_distance = None
            for p in friendly_position_samples(pid, start, end):
                d = distance((p["x"], p["y"]), target)
                if d <= VISION_RADIUS:
                    first_visible = p
                    visibility_distance = d
                    break

            camera_start = first_visible["second"] if first_visible else start
            cam = first_camera_near(pid, target, camera_start, end)
            observed_at = cam["second"] if cam else None
            selection = first_selection_after(pid, observed_at if observed_at is not None else start, min(end, (observed_at or start) + 15))
            command = first_command_after(pid, observed_at if observed_at is not None else start, min(end, (observed_at or start) + 25))

            if first_visible and cam:
                confidence = "medium"
                status = "plausibly_observed"
            elif cam and not first_visible:
                confidence = "low"
                status = "camera_attention_without_position_proof"
            elif first_visible and not cam:
                confidence = "low"
                status = "plausibly_visible_not_camera_confirmed"
            else:
                confidence = "low"
                status = "not_confirmed"

            inference_at = selection["second"] if selection else (command["second"] if command else None)
            rows.append({
                "event_second": start,
                "event_time": f"{start // 60}:{start % 60:02d}",
                "enemy_unit": opp["unit"],
                "kind": opp["kind"],
                "position": {"x": round(opp["x"], 1), "y": round(opp["y"], 1)},
                "status": status,
                "confidence": confidence,
                "plausible_visible_second": first_visible["second"] if first_visible else None,
                "camera_attention_second": observed_at,
                "observation_latency_seconds": (observed_at - first_visible["second"]) if first_visible and observed_at is not None else None,
                "inference_proxy_second": inference_at,
                "inference_latency_seconds": (inference_at - observed_at) if inference_at is not None and observed_at is not None else None,
                "decision_second": command["second"] if command else None,
                "decision_latency_seconds": (command["second"] - observed_at) if command and observed_at is not None else None,
                "selection_proxy": selection["units"][:8] if selection else [],
                "decision_proxy": command["command"] if command else None,
                "visibility_distance": round(visibility_distance, 2) if visibility_distance is not None else None,
            })

        observed = [r for r in rows if r["status"] == "plausibly_observed"]
        obs_lat = [r["observation_latency_seconds"] for r in observed if r["observation_latency_seconds"] is not None]
        dec_lat = [r["decision_latency_seconds"] for r in rows if r["decision_latency_seconds"] is not None]
        inf_lat = [r["inference_latency_seconds"] for r in rows if r["inference_latency_seconds"] is not None]
        result[str(pid)] = {
            "model_version": "1.0",
            "evidence_boundary": (
                "Camera and selection timing are replay-derived. Visible-unit status is an approximation built from sparse tracker positions "
                "and a conservative uniform sight radius; it is not exact fog-of-war reconstruction. Inference timing is a proxy based on the "
                "first selection/command after camera attention, not a claim about the player's private thought process."
            ),
            "coverage": {
                "camera_events": len(cameras.get(pid, [])),
                "selection_events": len(selections.get(pid, [])),
                "command_events": len(commands.get(pid, [])),
                "tracked_unit_paths": len([1 for pts in tracks.values() if pts and pts[0].get("pid") == pid]),
                "opportunities": len(rows),
                "plausibly_observed": len(observed),
            },
            "summary": {
                "camera_events_per_minute": round(len(cameras.get(pid, [])) / max(duration / 60, 1), 1),
                "selection_events_per_minute": round(len(selections.get(pid, [])) / max(duration / 60, 1), 1),
                "median_observation_latency_seconds": round(statistics.median(obs_lat), 1) if obs_lat else None,
                "median_inference_proxy_latency_seconds": round(statistics.median(inf_lat), 1) if inf_lat else None,
                "median_decision_latency_seconds": round(statistics.median(dec_lat), 1) if dec_lat else None,
            },
            "opportunities": rows[:120],
            "camera_timeline": cameras.get(pid, [])[:600],
            "selection_timeline": selections.get(pid, [])[:600],
            "command_timeline": commands.get(pid, [])[:900],
        }

    return result
