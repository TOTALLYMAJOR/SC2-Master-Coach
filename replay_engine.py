from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
import math
import statistics


BASE_TYPES = {
    "CommandCenter", "Nexus", "Hatchery"
}
BASE_FAMILY = {
    "CommandCenter", "OrbitalCommand", "PlanetaryFortress",
    "Nexus",
    "Hatchery", "Lair", "Hive",
}
WORKER_TYPES = {"SCV", "Probe", "Drone"}

STRUCTURES = {
    "Terran": {
        "SupplyDepot","Barracks","Refinery","Factory","Starport","EngineeringBay","Armory",
        "Bunker","MissileTurret","SensorTower","GhostAcademy","FusionCore","TechLab","Reactor",
        "CommandCenter"
    },
    "Protoss": {
        "Pylon","Gateway","Assimilator","CyberneticsCore","Forge","TwilightCouncil",
        "RoboticsFacility","RoboticsBay","Stargate","FleetBeacon","TemplarArchive",
        "DarkShrine","PhotonCannon","ShieldBattery","Nexus"
    },
    "Zerg": {
        "Hatchery","Extractor","SpawningPool","RoachWarren","BanelingNest","EvolutionChamber",
        "Lair","Hive","HydraliskDen","LurkerDenMP","InfestationPit","Spire","GreaterSpire",
        "UltraliskCavern","NydusNetwork","SpineCrawler","SporeCrawler"
    },
}

DOCTRINES = {
    "ZvT": ("Elastic Swarm", "Absorb scheduled pressure, preserve larva flexibility, then collapse when Terran siege geometry breaks."),
    "ZvP": ("Information Elasticity", "Translate Protoss tech and production thresholds into larva allocation before the power spike arrives."),
    "ZvZ": ("Larva Knife-Fight", "Read Drone-versus-army cycles earlier than the opponent and exploit defender reinforcement geometry."),
    "TvZ": ("Scheduled Taxation", "Synchronize repeatable production cycles and credible multi-prong pressure so Zerg larvae become units instead of Drones."),
    "TvP": ("Geometry & Tax", "Identify the Protoss spike, pre-split, force movement, and make expensive power units defend too much space."),
    "TvT": ("Vision Siege Chess", "Convert information and air control into superior Tank geometry before committing the ground army."),
    "PvT": ("Asymmetric Power", "Use discrete tech thresholds, Blink/Prism/Recall geometry, and preservation to create local asymmetry."),
    "PvZ": ("Power-Spike Leverage", "Use concentrated power spikes and warp geometry to pin Zerg while economy or tech compounds behind it."),
    "PvP": ("Local Superiority", "Resolve hidden allocation, preserve expensive units, and create a temporary local geometry advantage."),
}

RACE_LETTER = {"Zerg": "Z", "Terran": "T", "Protoss": "P"}


def safe_attr(obj: Any, name: str, default=None):
    try:
        value = getattr(obj, name)
        return default if value is None else value
    except Exception:
        return default


def pid_of_player(player: Any) -> int | None:
    for name in ("pid", "id", "detail_data"):
        value = safe_attr(player, name)
        if isinstance(value, int):
            return value
    return None


def sec_of(event: Any) -> int:
    value = safe_attr(event, "second")
    if value is not None:
        return int(value)
    frame = safe_attr(event, "frame", 0) or 0
    return int(frame // 16)


def unit_owner_pid(event: Any) -> int | None:
    for attr in ("control_pid", "upkeep_pid", "pid"):
        value = safe_attr(event, attr)
        if isinstance(value, int) and value > 0:
            return value
    unit = safe_attr(event, "unit")
    owner = safe_attr(unit, "owner")
    value = safe_attr(owner, "pid")
    return int(value) if isinstance(value, int) else None


def unit_type(event: Any) -> str:
    name = safe_attr(event, "unit_type_name")
    if name:
        return str(name)
    unit = safe_attr(event, "unit")
    for attr in ("name", "type_name"):
        value = safe_attr(unit, attr)
        if value:
            return str(value)
    return "Unknown"


def unit_cost(event: Any) -> int:
    unit = safe_attr(event, "unit")
    minerals = safe_attr(unit, "minerals", 0) or 0
    gas = safe_attr(unit, "vespene", 0) or 0
    try:
        return int(minerals) + int(gas)
    except Exception:
        return 0


def replay_seconds(replay: Any) -> int:
    length = safe_attr(replay, "game_length")
    seconds = safe_attr(length, "seconds")
    if seconds is not None:
        return int(seconds)
    frames = safe_attr(replay, "frames", 0) or 0
    return int(frames // 16)


def fmt_time(seconds: int | float) -> str:
    seconds = max(0, int(seconds))
    return f"{seconds // 60}:{seconds % 60:02d}"


def nearest_snapshot(series: list[dict], second: int, *, before=True) -> dict | None:
    if not series:
        return None
    if before:
        candidates = [x for x in series if x["second"] <= second]
        return candidates[-1] if candidates else series[0]
    candidates = [x for x in series if x["second"] >= second]
    return candidates[0] if candidates else series[-1]


def first_sustained(series: list[dict], predicate, min_duration: int = 20) -> tuple[dict, dict] | None:
    start = None
    last = None
    for snap in series:
        if predicate(snap):
            if start is None:
                start = snap
            last = snap
            if last["second"] - start["second"] >= min_duration:
                return start, last
        else:
            start = last = None
    return None


def player_summary(player: Any) -> dict:
    pid = pid_of_player(player)
    race = safe_attr(player, "play_race") or safe_attr(player, "pick_race") or safe_attr(player, "race") or "Unknown"
    name = safe_attr(player, "name") or f"Player {pid or '?'}"
    result = safe_attr(player, "result") or "Unknown"
    team_id = safe_attr(player, "team_id")
    return {
        "pid": pid,
        "name": str(name),
        "race": str(race),
        "result": str(result),
        "team": team_id,
    }


def stats_snapshot(event: Any, bases: int | None = None) -> dict:
    army_value = (safe_attr(event, "minerals_used_active_forces", 0) or 0) + (safe_attr(event, "vespene_used_active_forces", 0) or 0)
    workers = safe_attr(event, "workers_active_count", 0) or 0
    food_used = safe_attr(event, "food_used", 0) or 0
    food_made = safe_attr(event, "food_made", 0) or 0
    minerals = safe_attr(event, "minerals_current", 0) or 0
    gas = safe_attr(event, "vespene_current", 0) or 0
    return {
        "second": sec_of(event),
        "time": fmt_time(sec_of(event)),
        "workers": int(workers),
        "bases": bases,
        "minerals": int(minerals),
        "gas": int(gas),
        "bank": int(minerals + gas),
        "mineral_rate": int(safe_attr(event, "minerals_collection_rate", 0) or 0),
        "gas_rate": int(safe_attr(event, "vespene_collection_rate", 0) or 0),
        "food_used": round(float(food_used), 1),
        "food_made": round(float(food_made), 1),
        "army_supply_approx": round(max(0.0, float(food_used) - float(workers)), 1),
        "army_value": int(army_value),
        "resources_lost": int((safe_attr(event, "minerals_lost", 0) or 0) + (safe_attr(event, "vespene_lost", 0) or 0)),
        "resources_killed": int((safe_attr(event, "minerals_killed", 0) or 0) + (safe_attr(event, "vespene_killed", 0) or 0)),
        "tech_in_progress": int((safe_attr(event, "minerals_used_in_progress_technology", 0) or 0) + (safe_attr(event, "vespene_used_in_progress_technology", 0) or 0)),
        "army_in_progress": int((safe_attr(event, "minerals_used_in_progress_army", 0) or 0) + (safe_attr(event, "vespene_used_in_progress_army", 0) or 0)),
    }


def base_count_at(base_events: list[tuple[int, int]], second: int) -> int | None:
    if not base_events:
        return None
    total = 0
    for s, delta in base_events:
        if s <= second:
            total += delta
        else:
            break
    return max(0, total)


def build_matchup(players: list[dict], pid: int) -> str:
    me = next((p for p in players if p["pid"] == pid), None)
    other = next((p for p in players if p["pid"] != pid), None)
    if not me or not other:
        return "Unknown"
    a = RACE_LETTER.get(me["race"])
    b = RACE_LETTER.get(other["race"])
    return f"{a}v{b}" if a and b else "Unknown"


def group_engagements(deaths: list[dict], stats_by_pid: dict[int, list[dict]], player_ids: list[int]) -> list[dict]:
    if not deaths:
        return []
    deaths = sorted(deaths, key=lambda x: x["second"])
    clusters: list[list[dict]] = []
    current: list[dict] = []
    for d in deaths:
        if not current or d["second"] - current[-1]["second"] <= 12:
            current.append(d)
        else:
            if len(current) >= 4:
                clusters.append(current)
            current = [d]
    if len(current) >= 4:
        clusters.append(current)

    out = []
    for idx, cluster in enumerate(clusters, 1):
        owners = {x["owner_pid"] for x in cluster if x.get("owner_pid")}
        if len(owners.intersection(player_ids)) < 2 and len(player_ids) == 2:
            continue
        start = cluster[0]["second"]
        end = cluster[-1]["second"]
        row = {
            "id": idx,
            "start_second": start,
            "end_second": end,
            "start": fmt_time(start),
            "end": fmt_time(end),
            "deaths": len(cluster),
            "location": {
                "x": round(statistics.mean([x["x"] for x in cluster if x.get("x") is not None]), 1) if any(x.get("x") is not None for x in cluster) else None,
                "y": round(statistics.mean([x["y"] for x in cluster if x.get("y") is not None]), 1) if any(x.get("y") is not None for x in cluster) else None,
            },
            "players": {},
            "units_lost": {},
        }
        for pid in player_ids:
            series = stats_by_pid.get(pid, [])
            before = nearest_snapshot(series, max(0, start - 10), before=True)
            after = nearest_snapshot(series, end + 10, before=False)
            lost = max(0, (after or {}).get("resources_lost", 0) - (before or {}).get("resources_lost", 0)) if before and after else 0
            killed = max(0, (after or {}).get("resources_killed", 0) - (before or {}).get("resources_killed", 0)) if before and after else 0
            army_before = (before or {}).get("army_value", 0)
            row["players"][str(pid)] = {
                "resources_lost": lost,
                "resources_killed": killed,
                "army_value_before": army_before,
            }
            names = [x["unit_type"] for x in cluster if x.get("owner_pid") == pid]
            row["units_lost"][str(pid)] = names[:20]
        out.append(row)
    return out


def economy_inflections(series: list[dict]) -> list[dict]:
    out = []
    if len(series) < 2:
        return out
    for prev, cur in zip(series, series[1:]):
        worker_delta = cur["workers"] - prev["workers"]
        bank_delta = cur["bank"] - prev["bank"]
        army_delta = cur["army_value"] - prev["army_value"]
        if worker_delta <= -5:
            out.append({
                "second": cur["second"], "time": cur["time"], "type": "worker_shock",
                "severity": "high", "title": f"Worker shock: {abs(worker_delta)} workers lost",
                "detail": f"Active workers fell from {prev['workers']} to {cur['workers']} in roughly {cur['second']-prev['second']} seconds."
            })
        if army_delta <= -900:
            out.append({
                "second": cur["second"], "time": cur["time"], "type": "army_collapse",
                "severity": "high", "title": "Army-value collapse",
                "detail": f"Active-force value fell by about {abs(army_delta)} resources."
            })
        if bank_delta >= 700 and cur["bank"] >= 1200:
            out.append({
                "second": cur["second"], "time": cur["time"], "type": "bank_spike",
                "severity": "medium", "title": "Resource bank spike",
                "detail": f"Bank rose to {cur['bank']} total resources; review production-cycle conversion."
            })
    return out


def build_decision_windows(
    pid: int,
    build_events: list[dict],
    upgrades: list[dict],
    engagements: list[dict],
    inflections: list[dict],
) -> list[dict]:
    rows = []
    for e in build_events:
        if e["pid"] != pid:
            continue
        if e["kind"] == "expansion":
            rows.append({"second": e["second"], "time": e["time"], "type": "Expansion", "title": f"{e['unit']} started", "evidence": "Expansion commitment reconstructed from tracker unit-init/birth data."})
        elif e["kind"] == "structure":
            rows.append({"second": e["second"], "time": e["time"], "type": "Tech / Production", "title": f"{e['unit']} started", "evidence": "Structure timing reconstructed from tracker events."})
    for u in upgrades:
        if u["pid"] == pid:
            rows.append({"second": u["second"], "time": u["time"], "type": "Power Spike", "title": f"{u['upgrade']} completed", "evidence": "Upgrade completion reconstructed from tracker events."})
    for g in engagements:
        rows.append({"second": g["start_second"], "time": g["start"], "type": "Engagement", "title": f"Engagement window · {g['deaths']} deaths", "evidence": "Clustered unit-death events within a 12-second combat window."})
    for x in inflections:
        rows.append({"second": x["second"], "time": x["time"], "type": "State Change", "title": x["title"], "evidence": x["detail"]})
    rows.sort(key=lambda x: (x["second"], x["type"]))
    return rows


def doctrine_violations(pid: int, opponent_pid: int | None, matchup: str, series: list[dict], opponent_series: list[dict], engagements: list[dict]) -> list[dict]:
    doctrine_name, doctrine_summary = DOCTRINES.get(matchup, ("General", "Use evidence to update the plan before the game state forces the update."))
    issues = []

    sustained = first_sustained(series, lambda s: s["second"] >= 240 and s["bank"] >= 1000 and s["food_used"] < 198, 20)
    if sustained:
        start, end = sustained
        issues.append({
            "second": start["second"], "time": start["time"], "severity": "high" if max(start["bank"], end["bank"]) >= 1500 else "medium",
            "code": "BANK_CONVERSION", "title": "Production conversion lag",
            "evidence": f"Bank remained ≥1000 resources from {start['time']} through at least {end['time']} while below max supply.",
            "doctrine": doctrine_name,
            "why": "Unused resources are latent power. The coaching question is which production bottleneck prevented conversion: larva/inject, infrastructure/queues, warp cycles, or an over-complex tech plan.",
            "better": "At the first sustained bank signal, identify the production currency that is capped and spend through that bottleneck before adding strategic complexity.",
        })

    capped = first_sustained(series, lambda s: 30 <= s["food_used"] < 198 and s["food_made"] - s["food_used"] <= 0.25, 10)
    if capped:
        start, end = capped
        issues.append({
            "second": start["second"], "time": start["time"], "severity": "medium",
            "code": "SUPPLY_BLOCK", "title": "Sustained supply lock",
            "evidence": f"Supply was effectively capped across multiple stats samples beginning near {start['time']}.",
            "doctrine": doctrine_name,
            "why": "A supply lock delays the next production cycle and therefore shifts every downstream timing.",
            "better": "Treat supply as production infrastructure: create headroom before the next large unit/worker cycle rather than reacting at zero space.",
        })

    for i in range(len(series)):
        a = series[i]
        if a["second"] < 120 or a["second"] > 420:
            continue
        b = next((x for x in series[i+1:] if x["second"] >= a["second"] + 60), None)
        if b and b["workers"] - a["workers"] <= 1 and b["workers"] < 55:
            issues.append({
                "second": a["second"], "time": a["time"], "severity": "review",
                "code": "WORKER_GROWTH_STALL", "title": "Worker-growth stall — review context",
                "evidence": f"Workers moved from {a['workers']} to {b['workers']} over ~{b['second']-a['second']} seconds.",
                "doctrine": doctrine_name,
                "why": "The replay proves the stall, but not by itself whether the stall was correct under fog-of-war pressure. This is a review checkpoint, not an automatic mistake.",
                "better": "At this timestamp, inspect the opponent threat and ask whether the worker cut was evidence-backed or simply lost macro attention.",
            })
            break

    for g in engagements:
        mine = g["players"].get(str(pid), {})
        opp = g["players"].get(str(opponent_pid), {}) if opponent_pid else {}
        lost = mine.get("resources_lost", 0)
        killed = mine.get("resources_killed", 0)
        my_army = mine.get("army_value_before", 0)
        opp_army = opp.get("army_value_before", 0)
        if lost >= 700 and lost > max(1, killed) * 1.45:
            severity = "high" if lost >= 1400 else "medium"
            issues.append({
                "second": g["start_second"], "time": g["start"], "severity": severity,
                "code": "BAD_EXCHANGE", "title": "Unfavorable engagement exchange",
                "evidence": f"Approx. {lost} resources lost versus {killed} killed across the combat window.",
                "doctrine": doctrine_name,
                "why": f"{doctrine_summary} This exchange deserves review because the cost ratio moved sharply against you.",
                "better": "Replay the 20 seconds before contact and identify the first reversible moment: scouting, route, formation, target choice, retreat, or reinforcement timing.",
            })
        if my_army and opp_army and my_army < opp_army * 0.75 and lost > killed and lost >= 500:
            issues.append({
                "second": g["start_second"], "time": g["start"], "severity": "high",
                "code": "ENGAGEMENT_GATE", "title": "Engagement gate likely violated",
                "evidence": f"Active-force value before contact was roughly {my_army} versus {opp_army}, and the ensuing exchange was unfavorable.",
                "doctrine": doctrine_name,
                "why": "Army value is not the whole fight, but entering down this much value and then losing the exchange is a strong signal that geometry or timing did not compensate.",
                "better": "Before commit, require a compensating reason: superior position, spell/upgrade threshold, defender reinforcement advantage, surround, or a higher-value objective.",
            })

    if opponent_series:
        for snap in series:
            if snap["second"] < 240:
                continue
            later = nearest_snapshot(series, snap["second"] + 60, before=False)
            opp_now = nearest_snapshot(opponent_series, snap["second"], before=True)
            opp_later = nearest_snapshot(opponent_series, snap["second"] + 60, before=False)
            after = nearest_snapshot(series, snap["second"] + 100, before=False)
            if not (later and opp_now and opp_later and after):
                continue
            worker_gain = later["workers"] - snap["workers"]
            opp_army_gain = opp_later["army_value"] - opp_now["army_value"]
            losses_after = after["resources_lost"] - snap["resources_lost"]
            own_army_gain = later["army_value"] - snap["army_value"]
            if worker_gain >= 7 and opp_army_gain >= 1200 and own_army_gain < 600 and losses_after >= 900:
                issues.append({
                    "second": snap["second"], "time": snap["time"], "severity": "review",
                    "code": "POSTHOC_GREED_SIGNATURE", "title": "Greed-under-pressure signature",
                    "evidence": f"+{worker_gain} workers while opponent active-force value rose ~{opp_army_gain}; significant losses followed within the next ~100 seconds.",
                    "doctrine": doctrine_name,
                    "why": "This is a hindsight correlation, not proof that the information was visible at the time. It identifies a timestamp worth reviewing against your actual scouting.",
                    "better": "Check what you had observed before this worker cycle. If production/army evidence was available, the economic allocation likely needed compression; if not, the real leak may have been scouting.",
                })
                break

    seen = set()
    deduped = []
    for issue in sorted(issues, key=lambda x: (x["second"], x["code"])):
        key = (issue["code"], issue["second"])
        if key not in seen:
            seen.add(key)
            deduped.append(issue)
    return deduped


def score_analysis(violations: list[dict]) -> int:
    penalty = 0
    for v in violations:
        penalty += {"high": 12, "medium": 7, "review": 2}.get(v["severity"], 3)
    return max(0, 100 - min(70, penalty))


def analyze_replay(path: str | Path) -> dict:
    import sc2reader

    path = Path(path)
    replay = sc2reader.load_replay(str(path), load_level=4, load_map=False)

    players = [player_summary(p) for p in list(safe_attr(replay, "players", []) or [])]
    players = [p for p in players if p["pid"] is not None]
    player_ids = [p["pid"] for p in players]

    tracker_events = list(safe_attr(replay, "tracker_events", []) or [])
    if not tracker_events:
        tracker_events = [e for e in list(safe_attr(replay, "events", []) or []) if "Event" in safe_attr(e, "name", "")]

    base_events: dict[int, list[tuple[int, int]]] = {pid: [] for pid in player_ids}
    build_events: list[dict] = []
    upgrades: list[dict] = []
    deaths: list[dict] = []

    for event in tracker_events:
        name = safe_attr(event, "name", event.__class__.__name__)
        second = sec_of(event)
        pid = unit_owner_pid(event)
        utype = unit_type(event)

        if name in ("UnitBornEvent", "UnitInitEvent"):
            if pid in base_events and utype in BASE_TYPES:
                base_events[pid].append((second, +1))
            race = next((p["race"] for p in players if p["pid"] == pid), "Unknown")
            is_structure = utype in STRUCTURES.get(race, set())
            if is_structure:
                kind = "expansion" if utype in BASE_TYPES else "structure"
                build_events.append({"second": second, "time": fmt_time(second), "pid": pid, "unit": utype, "kind": kind})

        elif name == "UnitDiedEvent":
            dead_type = unit_type(event)
            owner = unit_owner_pid(event)
            if owner in base_events and dead_type in BASE_FAMILY:
                base_events[owner].append((second, -1))
            deaths.append({
                "second": second, "time": fmt_time(second), "owner_pid": owner,
                "killer_pid": safe_attr(event, "killing_player_id"),
                "unit_type": dead_type,
                "cost": unit_cost(event),
                "x": safe_attr(event, "x"), "y": safe_attr(event, "y"),
            })

        elif name == "UpgradeCompleteEvent":
            upid = safe_attr(event, "pid")
            upgrade = safe_attr(event, "upgrade_type_name", "Unknown")
            upgrades.append({"second": second, "time": fmt_time(second), "pid": upid, "upgrade": str(upgrade)})

    for pid in base_events:
        base_events[pid].sort()

    stats_by_pid: dict[int, list[dict]] = {pid: [] for pid in player_ids}
    for event in tracker_events:
        name = safe_attr(event, "name", event.__class__.__name__)
        if name != "PlayerStatsEvent":
            continue
        pid = safe_attr(event, "pid")
        if pid not in stats_by_pid:
            continue
        second = sec_of(event)
        bases = base_count_at(base_events.get(pid, []), second)
        stats_by_pid[pid].append(stats_snapshot(event, bases=bases))

    for pid in stats_by_pid:
        stats_by_pid[pid].sort(key=lambda x: x["second"])

    engagements = group_engagements(deaths, stats_by_pid, player_ids)

    analyses = {}
    for p in players:
        pid = p["pid"]
        opponent = next((x for x in players if x["pid"] != pid), None)
        opp_pid = opponent["pid"] if opponent else None
        matchup = build_matchup(players, pid)
        inflections = economy_inflections(stats_by_pid.get(pid, []))
        decisions = build_decision_windows(pid, build_events, upgrades, engagements, inflections)
        violations = doctrine_violations(
            pid, opp_pid, matchup, stats_by_pid.get(pid, []),
            stats_by_pid.get(opp_pid, []) if opp_pid else [],
            engagements
        )
        doctrine_name, doctrine_summary = DOCTRINES.get(matchup, ("General", "Evidence should update the plan before the game state forces the update."))

        final = stats_by_pid.get(pid, [])[-1] if stats_by_pid.get(pid) else {}
        analyses[str(pid)] = {
            "pid": pid,
            "matchup": matchup,
            "doctrine": {"name": doctrine_name, "summary": doctrine_summary},
            "score": score_analysis(violations),
            "stats": stats_by_pid.get(pid, []),
            "economy_inflections": inflections,
            "decision_windows": decisions,
            "violations": violations,
            "summary": {
                "final_workers": final.get("workers"),
                "peak_workers": max([x["workers"] for x in stats_by_pid.get(pid, [])], default=None),
                "peak_bank": max([x["bank"] for x in stats_by_pid.get(pid, [])], default=None),
                "peak_army_value": max([x["army_value"] for x in stats_by_pid.get(pid, [])], default=None),
                "resources_lost": final.get("resources_lost"),
                "resources_killed": final.get("resources_killed"),
                "expansions_started": len([x for x in build_events if x["pid"] == pid and x["kind"] == "expansion"]),
                "upgrades_completed": len([x for x in upgrades if x["pid"] == pid]),
                "engagements": len(engagements),
            }
        }

    return {
        "schema_version": "1.0",
        "source": {
            "filename": path.name,
            "parser": "sc2reader",
            "confidence_note": "Tracker/resource reconstruction is replay-derived. Doctrine flags are coaching heuristics. Fog-of-war knowledge is not reconstructed, so hidden-information judgments are labeled as review signatures rather than proven mistakes.",
        },
        "replay": {
            "map": str(safe_attr(replay, "map_name", "Unknown")),
            "duration_seconds": replay_seconds(replay),
            "duration": fmt_time(replay_seconds(replay)),
            "release": str(safe_attr(replay, "release_string", "Unknown")),
            "build": safe_attr(replay, "build"),
            "date": str(safe_attr(replay, "date", "")),
            "category": str(safe_attr(replay, "category", "")),
            "type": str(safe_attr(replay, "type", "")),
        },
        "players": players,
        "build_events": sorted(build_events, key=lambda x: x["second"]),
        "upgrades": sorted(upgrades, key=lambda x: x["second"]),
        "engagements": engagements,
        "analysis_by_player": analyses,
    }


def demo_analysis() -> dict:
    players = [
        {"pid": 1, "name": "You", "race": "Zerg", "result": "Defeat", "team": 1},
        {"pid": 2, "name": "Opponent", "race": "Terran", "result": "Victory", "team": 2},
    ]
    stats1, stats2 = [], []
    for s in range(0, 601, 10):
        workers1 = min(67, 8 + int(s * 0.105))
        workers2 = min(64, 8 + int(s * 0.095))
        if 330 <= s <= 390:
            workers1 += int((s - 330) / 10)
        if s >= 430:
            workers1 -= 9
        bank1 = max(100, int(180 + s * 0.9 + (1200 if 300 <= s <= 360 else 0)))
        bank2 = max(100, int(160 + s * 0.55))
        army1 = max(0, int((s - 150) * 6.0))
        army2 = max(0, int((s - 140) * 6.8 + (900 if 330 <= s <= 430 else 0)))
        lost1 = 0 if s < 420 else int((s - 420) * 15)
        lost2 = 0 if s < 420 else int((s - 420) * 8)
        stats1.append({"second":s,"time":fmt_time(s),"workers":workers1,"bases":1+(s>=110)+(s>=205)+(s>=390),"minerals":int(bank1*.78),"gas":bank1-int(bank1*.78),"bank":bank1,"mineral_rate":0,"gas_rate":0,"food_used":min(190,8+s*.24),"food_made":min(200,15+s*.25),"army_supply_approx":max(0,8+s*.24-workers1),"army_value":army1,"resources_lost":lost1,"resources_killed":lost2,"tech_in_progress":0,"army_in_progress":0})
        stats2.append({"second":s,"time":fmt_time(s),"workers":workers2,"bases":1+(s>=120)+(s>=250),"minerals":int(bank2*.8),"gas":bank2-int(bank2*.8),"bank":bank2,"mineral_rate":0,"gas_rate":0,"food_used":min(190,8+s*.25),"food_made":min(200,15+s*.26),"army_supply_approx":max(0,8+s*.25-workers2),"army_value":army2,"resources_lost":lost2,"resources_killed":lost1,"tech_in_progress":0,"army_in_progress":0})
    engagements = [{
        "id":1,"start_second":420,"end_second":448,"start":"7:00","end":"7:28","deaths":18,"location":{"x":92.0,"y":64.0},
        "players":{"1":{"resources_lost":1500,"resources_killed":700,"army_value_before":1500},"2":{"resources_lost":700,"resources_killed":1500,"army_value_before":2400}},
        "units_lost":{"1":["Roach","Roach","Hydralisk","Hydralisk"],"2":["Marine","Marine","Marauder"]}
    }]
    build_events = [
        {"second":112,"time":"1:52","pid":1,"unit":"Hatchery","kind":"expansion"},
        {"second":205,"time":"3:25","pid":1,"unit":"Hatchery","kind":"expansion"},
        {"second":220,"time":"3:40","pid":1,"unit":"RoachWarren","kind":"structure"},
        {"second":390,"time":"6:30","pid":1,"unit":"Hatchery","kind":"expansion"},
        {"second":145,"time":"2:25","pid":2,"unit":"CommandCenter","kind":"expansion"},
        {"second":310,"time":"5:10","pid":2,"unit":"Barracks","kind":"structure"},
    ]
    upgrades = [{"second":340,"time":"5:40","pid":1,"upgrade":"ZergMissileWeaponsLevel1"}]
    analyses = {}
    for pid, series, opp in [(1,stats1,stats2),(2,stats2,stats1)]:
        matchup = "ZvT" if pid == 1 else "TvZ"
        inflections = economy_inflections(series)
        decisions = build_decision_windows(pid, build_events, upgrades, engagements, inflections)
        violations = doctrine_violations(pid, 2 if pid == 1 else 1, matchup, series, opp, engagements)
        dn, ds = DOCTRINES[matchup]
        analyses[str(pid)] = {
            "pid":pid,"matchup":matchup,"doctrine":{"name":dn,"summary":ds},"score":score_analysis(violations),
            "stats":series,"economy_inflections":inflections,"decision_windows":decisions,"violations":violations,
            "summary":{"final_workers":series[-1]["workers"],"peak_workers":max(x["workers"] for x in series),"peak_bank":max(x["bank"] for x in series),"peak_army_value":max(x["army_value"] for x in series),"resources_lost":series[-1]["resources_lost"],"resources_killed":series[-1]["resources_killed"],"expansions_started":len([x for x in build_events if x["pid"]==pid and x["kind"]=="expansion"]),"upgrades_completed":len([x for x in upgrades if x["pid"]==pid]),"engagements":len(engagements)}
        }
    return {
        "schema_version":"1.0","source":{"filename":"SYNTHETIC_DEMO.SC2Replay","parser":"demo","confidence_note":"Synthetic UI fixture only. Upload a real .SC2Replay for replay-derived analysis."},
        "replay":{"map":"Demo Arena LE","duration_seconds":600,"duration":"10:00","release":"Demo","build":None,"date":"","category":"1v1","type":"1v1"},
        "players":players,"build_events":build_events,"upgrades":upgrades,"engagements":engagements,"analysis_by_player":analyses
    }
