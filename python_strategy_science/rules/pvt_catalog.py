from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


PATCH = "5.0.16b"


@dataclass(frozen=True)
class CostRule:
    key: str
    mineral: int
    gas: int
    supply: int = 0
    kind: str = "investment"


COSTS: dict[str, CostRule] = {
    "pylon": CostRule("pylon", 100, 0, kind="infrastructure"),
    "gateway": CostRule("gateway", 150, 0, kind="production"),
    "assimilator": CostRule("assimilator", 75, 0, kind="economy"),
    "nexus": CostRule("nexus", 400, 0, kind="economy"),
    "cybernetics_core": CostRule("cybernetics_core", 150, 0, kind="tech"),
    "twilight_council": CostRule("twilight_council", 150, 100, kind="tech"),
    "robotics_facility": CostRule("robotics_facility", 150, 100, kind="tech"),
    "robotics_bay": CostRule("robotics_bay", 150, 150, kind="tech"),
    "shield_battery": CostRule("shield_battery", 100, 0, kind="defense"),
    "stalker": CostRule("stalker", 125, 50, supply=2, kind="army"),
    "sentry": CostRule("sentry", 50, 100, supply=2, kind="army"),
    "adept": CostRule("adept", 100, 25, supply=2, kind="army"),
    "immortal": CostRule("immortal", 250, 100, supply=4, kind="army"),
    "colossus": CostRule("colossus", 300, 200, supply=6, kind="army"),
}


# These are deliberately lexical and conservative. A policy window may contain
# several named commitments; each recognized token is counted once per row.
TOKENS: tuple[tuple[str, str], ...] = (
    ("third nexus", "nexus"),
    ("natural nexus", "nexus"),
    ("nexus", "nexus"),
    ("robotics bay", "robotics_bay"),
    ("robo bay", "robotics_bay"),
    ("robotics facility", "robotics_facility"),
    ("robo", "robotics_facility"),
    ("twilight", "twilight_council"),
    ("cybernetics core", "cybernetics_core"),
    ("cyber core", "cybernetics_core"),
    ("shield battery", "shield_battery"),
    ("battery", "shield_battery"),
    ("gateway", "gateway"),
    ("pylon", "pylon"),
    ("assimilator", "assimilator"),
    ("stalker", "stalker"),
    ("sentry", "sentry"),
    ("adept", "adept"),
    ("immortal", "immortal"),
    ("colossus", "colossus"),
)


def _window_times(row: Mapping[str, Any]) -> tuple[int, int]:
    try:
        start = int(row.get("earliest_second", row.get("start", 0)) or 0)
    except (TypeError, ValueError):
        start = 0
    try:
        end = int(row.get("latest_second", row.get("end", start)) or start)
    except (TypeError, ValueError):
        end = start
    return max(0, start), max(start, end)


def _recognized_costs(action: str) -> list[CostRule]:
    text = action.lower()
    found: list[CostRule] = []
    seen: set[str] = set()
    for token, key in TOKENS:
        if token in text and key not in seen:
            found.append(COSTS[key])
            seen.add(key)
    return found


def estimate_policy_commitments(
    policy: Mapping[str, Any],
    *,
    game_second: int,
    horizon_seconds: int = 75,
) -> dict[str, Any]:
    """Estimate named commitments inside the next planning horizon.

    This does not infer the player's exact mineral/gas balance. It simply
    translates recognized policy actions into a transparent commitment ledger
    so the Digital Twin can explain opportunity cost without pretending to see
    resources the player never reported.
    """
    rows = policy.get("build_windows") or policy.get("buildWindows") or []
    horizon_end = max(game_second, game_second + max(1, int(horizon_seconds)))
    items: list[dict[str, Any]] = []
    unknown_actions: list[str] = []

    for raw in rows:
        if not isinstance(raw, Mapping):
            continue
        start, end = _window_times(raw)
        if end < game_second or start > horizon_end:
            continue
        action = str(raw.get("action") or raw.get("label") or "").strip()
        if not action:
            continue
        rules = _recognized_costs(action)
        if not rules:
            unknown_actions.append(action)
            continue
        for rule in rules:
            items.append(
                {
                    "key": rule.key,
                    "action": action,
                    "window": {"start": start, "end": end},
                    "mineral": rule.mineral,
                    "gas": rule.gas,
                    "supply": rule.supply,
                    "kind": rule.kind,
                }
            )

    mineral = sum(int(row["mineral"]) for row in items)
    gas = sum(int(row["gas"]) for row in items)
    army_mineral = sum(int(row["mineral"]) for row in items if row["kind"] == "army")
    army_gas = sum(int(row["gas"]) for row in items if row["kind"] == "army")
    investment_mineral = mineral - army_mineral
    investment_gas = gas - army_gas

    alternatives = [
        {
            "label": "Two additional Gateways",
            "mineral": 300,
            "gas": 0,
            "strategic_meaning": "more immediate production throughput instead of future economy or technology",
        },
        {
            "label": "Two Stalkers",
            "mineral": 250,
            "gas": 100,
            "strategic_meaning": "mobile immediate army and response range",
        },
        {
            "label": "Gateway + Shield Battery",
            "mineral": 250,
            "gas": 0,
            "strategic_meaning": "production plus local defensive time",
        },
    ]

    return {
        "patch": PATCH,
        "game_second": int(game_second),
        "horizon_seconds": int(horizon_seconds),
        "horizon_end": horizon_end,
        "items": items,
        "totals": {
            "mineral": mineral,
            "gas": gas,
            "army_mineral": army_mineral,
            "army_gas": army_gas,
            "investment_mineral": investment_mineral,
            "investment_gas": investment_gas,
        },
        "alternatives": alternatives,
        "unknown_actions": unknown_actions,
        "boundary": (
            "Commitment ledger only: named costs are game rules, but the model does not know the player's exact live mineral/gas balance."
        ),
    }
