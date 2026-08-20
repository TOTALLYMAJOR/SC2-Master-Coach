from __future__ import annotations

from typing import Any, Iterable, Mapping


LEVEL_ORDER = {"LOW": 0, "MODERATE": 1, "HIGH": 2}


def _level_max(*values: str) -> str:
    return max(values, key=lambda value: LEVEL_ORDER[value])


def _evidence_types(intel: Iterable[Mapping[str, Any]]) -> set[str]:
    return {str(row.get("type") or "").strip() for row in intel if row.get("type")}


def _evidence_age(intel: Iterable[Mapping[str, Any]], evidence_type: str, game_second: int) -> int | None:
    ages: list[int] = []
    for row in intel:
        if str(row.get("type") or "") != evidence_type:
            continue
        try:
            observed = int(row.get("observed_game_second", row.get("observedGameSecond", game_second)))
        except (TypeError, ValueError):
            observed = game_second
        ages.append(max(0, game_second - observed))
    return min(ages) if ages else None


def estimate_pvt_attack_hazard(
    intel: Iterable[Mapping[str, Any]],
    *,
    game_second: int,
) -> dict[str, Any]:
    """Return a qualitative near-term PvT threat horizon.

    The first model intentionally avoids numerical attack probabilities. Without
    exact production uptime, add-ons, army location, and map travel distance,
    percentages would imply calibration we do not yet possess. The output is a
    bounded decision aid built only from active player-reported evidence.
    """
    rows = tuple(dict(row) for row in intel)
    kinds = _evidence_types(rows)

    next_30 = "LOW"
    sec_30_60 = "MODERATE"
    sec_60_90 = "MODERATE"
    drivers: list[str] = []
    resolving_intel = "Refresh Terran production and movement before the next irreversible investment."

    if "normal_natural" in kinds:
        drivers.append("A normal natural confirms an economic floor, reducing one-base concentration risk but not eliminating pressure.")
        next_30 = "LOW"

    if "fast_third" in kinds:
        drivers.append("A fast third adds another economic commitment and usually reduces the value of assuming an immediate all-in.")
        next_30 = "LOW"
        sec_30_60 = "LOW"
        resolving_intel = "Check whether production rises behind the third before adding further greed."

    if "reaper" in kinds:
        drivers.append("A Reaper is early scouting/pressure evidence; the follow-up matters more than the Reaper itself.")
        sec_30_60 = _level_max(sec_30_60, "MODERATE")
        resolving_intel = "Confirm the natural and the first production follow-up."

    if "factory" in kinds:
        drivers.append("Factory evidence makes control, harassment, and Tank-supported pressure credible branches.")
        next_30 = _level_max(next_30, "MODERATE")
        sec_30_60 = _level_max(sec_30_60, "MODERATE")
        resolving_intel = "Identify whether the Factory is buying harassment, control, or a push."

    if "starport" in kinds:
        drivers.append("Starport evidence raises near-term harassment and mobility risk across a wider three-base footprint.")
        next_30 = _level_max(next_30, "MODERATE")
        sec_30_60 = _level_max(sec_30_60, "MODERATE")
        resolving_intel = "Identify the Starport payload before over-countering it."

    if "hidden_tech" in kinds:
        drivers.append("A technology information gap increases decision risk even when no attack has been confirmed.")
        next_30 = _level_max(next_30, "MODERATE")
        sec_30_60 = _level_max(sec_30_60, "MODERATE")
        sec_60_90 = _level_max(sec_60_90, "MODERATE")
        resolving_intel = "Resolve the missing tech branch before the next expensive commitment."

    if "extra_production" in kinds:
        drivers.append("Reported extra production increases near-term unit throughput and compresses the payoff window for economy.")
        next_30 = _level_max(next_30, "MODERATE")
        sec_30_60 = "HIGH"
        sec_60_90 = "HIGH"
        resolving_intel = "Determine whether the increased production is moving out or protecting Terran economy."

    if "no_natural" in kinds:
        drivers.append("No natural removes the expected economic floor and leaves more early resources available for immediate power or concealed technology.")
        next_30 = "HIGH"
        sec_30_60 = "HIGH"
        sec_60_90 = _level_max(sec_60_90, "MODERATE")
        resolving_intel = "Identify what Terran bought instead of the Command Center before widening your economy."

    if "move_out" in kinds:
        drivers.append("A confirmed move-out is direct timing evidence and overrides probabilistic posture reasoning.")
        next_30 = "HIGH"
        sec_30_60 = "HIGH"
        sec_60_90 = _level_max(sec_60_90, "MODERATE")
        resolving_intel = "Identify the attack route and defensive arrival point now."

    if not drivers:
        drivers.append("No active decision-changing Terran evidence is present; uncertainty itself limits confidence in greed.")

    evidence_age = {
        kind: age
        for kind in sorted(kinds)
        if (age := _evidence_age(rows, kind, game_second)) is not None
    }

    return {
        "model": "pvt-qualitative-attack-hazard",
        "version": "0.1.0",
        "game_second": int(game_second),
        "bands": [
            {"from_seconds": 0, "to_seconds": 30, "level": next_30},
            {"from_seconds": 30, "to_seconds": 60, "level": sec_30_60},
            {"from_seconds": 60, "to_seconds": 90, "level": sec_60_90},
        ],
        "drivers": drivers,
        "evidence_age_seconds": evidence_age,
        "next_resolving_intel": resolving_intel,
        "boundary": (
            "Qualitative hazard only: no calibrated attack probability is claimed until exact production, map travel distance, and larger outcome samples are modeled."
        ),
    }
