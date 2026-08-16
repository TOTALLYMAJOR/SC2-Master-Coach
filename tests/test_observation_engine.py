from types import SimpleNamespace as NS

from observation_engine import reconstruct_observation_model


def event(name, second, **kw):
    return NS(name=name, second=second, **kw)


def test_camera_visibility_decision_chain():
    p1 = NS(pid=1, name="You")
    p2 = NS(pid=2, name="Enemy")
    scout = NS(id=101, name="Overlord", owner=p1, x=48, y=50)
    tech = NS(id=202, name="Barracks", owner=p2, x=55, y=50)
    replay = NS(
        events=[
            event("CameraEvent", 102, pid=1, x=55, y=50),
            event("SelectionEvent", 104, pid=1, new_units=[scout]),
            event("TargetPointCommandEvent", 107, pid=1, ability_name="Move", x=60, y=50),
        ],
        tracker_events=[
            event("UnitBornEvent", 95, control_pid=1, unit=scout, x=48, y=50, unit_type_name="Overlord"),
            event("UnitInitEvent", 100, control_pid=2, unit=tech, x=55, y=50, unit_type_name="Barracks"),
        ],
    )
    players = [{"pid": 1, "race": "Zerg"}, {"pid": 2, "race": "Terran"}]
    model = reconstruct_observation_model(replay, players, {"Terran": {"Barracks"}})["1"]
    row = model["opportunities"][0]
    assert row["status"] == "plausibly_observed"
    assert row["observation_latency_seconds"] == 2
    assert row["inference_latency_seconds"] == 2
    assert row["decision_latency_seconds"] == 5


def test_camera_without_position_is_low_confidence():
    p2 = NS(pid=2, name="Enemy")
    tech = NS(id=202, name="Barracks", owner=p2, x=55, y=50)
    replay = NS(
        events=[event("CameraEvent", 105, pid=1, x=55, y=50)],
        tracker_events=[event("UnitInitEvent", 100, control_pid=2, unit=tech, x=55, y=50, unit_type_name="Barracks")],
    )
    players = [{"pid": 1, "race": "Zerg"}, {"pid": 2, "race": "Terran"}]
    model = reconstruct_observation_model(replay, players, {"Terran": {"Barracks"}})["1"]
    assert model["opportunities"][0]["status"] == "camera_attention_without_position_proof"
    assert model["opportunities"][0]["confidence"] == "low"
