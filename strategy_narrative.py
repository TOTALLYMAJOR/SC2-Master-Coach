from __future__ import annotations

from typing import Any


_SEVERITY = {"high": 4, "medium": 3, "review": 2, "low": 1}


def _player(result: dict, pid: int) -> dict:
    return next((p for p in result.get("players", []) if p.get("pid") == pid), {})


def _opponent(result: dict, pid: int) -> dict:
    me = _player(result, pid)
    my_team = me.get("team")
    players = [p for p in result.get("players", []) if p.get("pid") != pid]
    if my_team is not None:
        enemy = next((p for p in players if p.get("team") != my_team), None)
        if enemy:
            return enemy
    return players[0] if players else {}


def _time(value: Any) -> str:
    try:
        sec = max(0, int(value))
        return f"{sec // 60}:{sec % 60:02d}"
    except Exception:
        return "—"


def _clean(text: Any) -> str:
    return " ".join(str(text or "").split())


def build_strategy_narrative(result: dict, pid: int) -> dict:
    """Turn replay evidence into a readable coaching story without an AI service.

    The narrative deliberately separates facts, plausible-observation evidence,
    and coaching interpretation. It is generated locally and deterministically.
    """
    analysis = (result.get("analysis_by_player") or {}).get(str(pid), {})
    me = _player(result, pid)
    opp = _opponent(result, pid)
    replay = result.get("replay") or {}
    summary = analysis.get("summary") or {}
    doctrine = analysis.get("doctrine") or {}
    observation = analysis.get("observation_model") or {}
    obs_summary = observation.get("summary") or {}
    coverage = observation.get("coverage") or {}
    violations = sorted(
        analysis.get("violations") or [],
        key=lambda v: (-_SEVERITY.get(v.get("severity"), 0), v.get("second", 10**9)),
    )

    matchup = analysis.get("matchup") or "Unknown matchup"
    player_name = _clean(me.get("name")) or "Selected player"
    opponent_name = _clean(opp.get("name")) or "the opponent"
    result_text = _clean(me.get("result")) or "Unknown result"
    map_name = _clean(replay.get("map")) or "the map"
    doctrine_name = _clean(doctrine.get("name")) or "evidence-first play"
    doctrine_summary = _clean(doctrine.get("summary"))

    opening = (
        f"You are reviewing {player_name}'s {matchup} on {map_name} against {opponent_name}. "
        f"The strategic lens is {doctrine_name}. {doctrine_summary}"
    ).strip()

    obs_count = coverage.get("opportunities")
    plausibly = coverage.get("plausibly_observed")
    obs_latency = obs_summary.get("median_observation_latency_seconds")
    decision_latency = obs_summary.get("median_decision_latency_seconds")
    if obs_count:
        info = (
            f"The replay produced {obs_count} information opportunities and {plausibly or 0} were plausibly observed. "
            f"Median camera/observation latency was {obs_latency if obs_latency is not None else 'not measurable'} seconds, "
            f"and the median command-response proxy was {decision_latency if decision_latency is not None else 'not measurable'} seconds. "
            "Use those numbers as attention and response evidence, not as proof of what you were consciously thinking."
        )
    else:
        info = (
            "The replay did not yield enough high-confidence visibility opportunities for a useful observation-latency summary. "
            "The strategic review therefore leans more heavily on economy, production, and engagement evidence."
        )

    economy_bits = []
    if summary.get("peak_workers") is not None:
        economy_bits.append(f"peaked at {summary['peak_workers']} workers")
    if summary.get("peak_bank") is not None:
        economy_bits.append(f"reached a peak bank of {summary['peak_bank']} resources")
    if summary.get("expansions_started") is not None:
        economy_bits.append(f"started {summary['expansions_started']} expansions")
    if summary.get("upgrades_completed") is not None:
        economy_bits.append(f"completed {summary['upgrades_completed']} tracked upgrades")
    economy = (
        "Economically, you " + ", ".join(economy_bits) + "."
        if economy_bits
        else "The replay did not provide enough economy samples for a confident macro narrative."
    )

    turning_points = []
    for issue in violations[:3]:
        when = issue.get("time") or _time(issue.get("second"))
        turning_points.append({
            "time": when,
            "title": _clean(issue.get("title")) or "Review point",
            "evidence": _clean(issue.get("evidence")),
            "meaning": _clean(issue.get("why")),
            "better": _clean(issue.get("better")),
            "severity": issue.get("severity") or "review",
        })

    if not turning_points:
        engagements = result.get("engagements") or []
        first = engagements[0] if engagements else None
        if first:
            mine = (first.get("players") or {}).get(str(pid), {})
            turning_points.append({
                "time": first.get("start") or _time(first.get("start_second")),
                "title": "First major engagement",
                "evidence": (
                    f"Approx. {mine.get('resources_lost', 0)} resources lost and "
                    f"{mine.get('resources_killed', 0)} killed in the reconstructed combat window."
                ),
                "meaning": "Use the approach to this fight to decide whether the real failure was scouting, positioning, timing, or execution.",
                "better": "Review the 20 seconds before contact and identify the first reversible decision.",
                "severity": "review",
            })

    if turning_points:
        first = turning_points[0]
        diagnosis = (
            f"The highest-value review point occurs around {first['time']}: {first['title']}. "
            f"{first['evidence']} {first['meaning']}"
        ).strip()
    else:
        diagnosis = (
            "No major doctrine violation was confidently detected. The next review should focus on whether your scouting cadence and "
            "production cycles created enough information and tempo to support the chosen strategy."
        )

    better_actions = []
    for point in turning_points:
        if point.get("better") and point["better"] not in better_actions:
            better_actions.append(point["better"])
    if not better_actions:
        better_actions.append(doctrine_summary or "Keep scouting evidence ahead of expensive or irreversible commitments.")

    outcome = (
        f"The recorded result was {result_text}. The useful question is not simply why the game ended that way, but which earlier "
        "information or allocation decision made the later position difficult."
    )
    next_game = "Next game: " + " Then, ".join(action.rstrip(".") for action in better_actions[:3]) + "."

    headline = f"{matchup} replay story — {doctrine_name}"
    chapters = [
        {"label": "1 · The plan", "text": opening},
        {"label": "2 · What you could know", "text": info},
        {"label": "3 · Economy and conversion", "text": economy},
        {"label": "4 · Where the game bent", "text": diagnosis},
        {"label": "5 · What to do next", "text": f"{outcome} {next_game}"},
    ]
    spoken_text = " ".join(chapter["text"] for chapter in chapters)

    return {
        "headline": headline,
        "player": {"pid": pid, "name": player_name, "race": me.get("race"), "result": result_text},
        "opponent": {"pid": opp.get("pid"), "name": opponent_name, "race": opp.get("race")},
        "matchup": matchup,
        "doctrine": doctrine_name,
        "chapters": chapters,
        "turning_points": turning_points,
        "next_game_actions": better_actions[:3],
        "spoken_text": spoken_text,
        "evidence_boundary": (
            "Narrative statements about timings, economy, commands and engagements are replay-derived. "
            "Visibility and inference statements remain confidence-labeled approximations; the narrative does not claim access to private thought."
        ),
    }
