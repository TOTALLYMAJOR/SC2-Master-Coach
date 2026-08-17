from __future__ import annotations

from pathlib import Path

from observation_engine import reconstruct_observation_model
from strategy_narrative import build_strategy_narrative


def _structure_catalog():
    # Kept local to avoid a circular import with replay_engine.
    return {
        "Terran": {"SupplyDepot","Barracks","Refinery","Factory","Starport","EngineeringBay","Armory","Bunker","MissileTurret","SensorTower","GhostAcademy","FusionCore","TechLab","Reactor","CommandCenter"},
        "Protoss": {"Pylon","Gateway","Assimilator","CyberneticsCore","Forge","TwilightCouncil","RoboticsFacility","RoboticsBay","Stargate","FleetBeacon","TemplarArchive","DarkShrine","PhotonCannon","ShieldBattery","Nexus"},
        "Zerg": {"Hatchery","Extractor","SpawningPool","RoachWarren","BanelingNest","EvolutionChamber","Lair","Hive","HydraliskDen","LurkerDenMP","InfestationPit","Spire","GreaterSpire","UltraliskCavern","NydusNetwork","SpineCrawler","SporeCrawler"},
    }


def _attach_narratives(result: dict) -> dict:
    for pid, analysis in (result.get("analysis_by_player") or {}).items():
        try:
            analysis["strategy_narrative"] = build_strategy_narrative(result, int(pid))
        except Exception as exc:
            analysis["strategy_narrative"] = {
                "headline": "Replay strategy narrative unavailable",
                "chapters": [{"label": "Review", "text": f"Narrative generation failed safely: {type(exc).__name__}: {exc}"}],
                "turning_points": [],
                "next_game_actions": [],
                "spoken_text": "Replay narrative generation was unavailable for this game.",
                "evidence_boundary": "Raw replay analysis remains available even when narrative generation fails.",
            }
    return result


def enrich_replay_analysis(path: str | Path, result: dict) -> dict:
    import sc2reader

    replay = sc2reader.load_replay(str(path), load_level=4, load_map=False)
    models = reconstruct_observation_model(replay, result.get("players", []), structures=_structure_catalog())
    for pid, analysis in (result.get("analysis_by_player") or {}).items():
        analysis["observation_model"] = models.get(str(pid), {})
    result["schema_version"] = "1.2"
    source = result.setdefault("source", {})
    source["confidence_note"] = (
        "Resource/unit/tracker state plus camera, selection and command events are replay-derived. "
        "Plausible visibility is approximated from sparse unit-position samples and a conservative sight-radius model; "
        "inference timing is a behavioral proxy, not a claim about the player's private thought process."
    )
    return _attach_narratives(result)


def enrich_demo_analysis(result: dict) -> dict:
    demo = {
        "model_version": "1.0",
        "evidence_boundary": "Synthetic demo observation data. Real replays use camera, selection, command and sparse tracker-position evidence.",
        "coverage": {"camera_events": 92, "selection_events": 138, "command_events": 311, "tracked_unit_paths": 24, "opportunities": 4, "plausibly_observed": 3},
        "summary": {"camera_events_per_minute": 9.2, "selection_events_per_minute": 13.8, "median_observation_latency_seconds": 4.0, "median_inference_proxy_latency_seconds": 2.0, "median_decision_latency_seconds": 5.0},
        "opportunities": [
            {"event_second":310,"event_time":"5:10","enemy_unit":"Barracks","kind":"structure","status":"plausibly_observed","confidence":"medium","plausible_visible_second":315,"camera_attention_second":319,"observation_latency_seconds":4,"inference_proxy_second":321,"inference_latency_seconds":2,"decision_second":324,"decision_latency_seconds":5,"selection_proxy":["Zergling:demo"],"decision_proxy":"Move"},
            {"event_second":390,"event_time":"6:30","enemy_unit":"CommandCenter","kind":"expansion","status":"camera_attention_without_position_proof","confidence":"low","plausible_visible_second":None,"camera_attention_second":401,"observation_latency_seconds":None,"inference_proxy_second":404,"inference_latency_seconds":3,"decision_second":408,"decision_latency_seconds":7,"selection_proxy":[],"decision_proxy":"Move"},
        ],
        "camera_timeline": [], "selection_timeline": [], "command_timeline": [],
    }
    for analysis in (result.get("analysis_by_player") or {}).values():
        analysis["observation_model"] = dict(demo)
    result["schema_version"] = "1.2"
    return _attach_narratives(result)
