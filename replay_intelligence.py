from __future__ import annotations

import math
from statistics import median
from typing import Any, Callable


FACT_SCHEMA_VERSION = "1.0"
REPORT_SCHEMA_VERSION = "1.0"
MINERAL_THRESHOLDS = (500, 1000, 1500)
SUPPLY_PROVIDERS = {"Overlord", "Pylon", "SupplyDepot"}
MAX_CORROBORATED_GAP_SECONDS = 30

RESOURCE_FIELDS = (
    "workers",
    "bases",
    "minerals",
    "gas",
    "bank",
    "food_used",
    "food_made",
    "army_value",
    "resources_lost",
    "resources_killed",
)


def _int(value: Any, default: int = 0) -> int:
    try:
        return max(0, int(float(value)))
    except (TypeError, ValueError):
        return default


def _number(value: Any, default: float = 0.0) -> float:
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        return default


def normalize_resource_samples(
    samples: list[dict[str, Any]], evidence_class: str = "observed_replay"
) -> list[dict[str, Any]]:
    """Return one stable, sanitized resource fact per observed game second."""
    by_second: dict[int, dict[str, Any]] = {}
    for raw in samples or []:
        if not isinstance(raw, dict) or raw.get("second") is None:
            continue
        second = _int(raw.get("second"))
        row: dict[str, Any] = {
            "second": second,
            "time": f"{second // 60}:{second % 60:02d}",
            "evidence_class": evidence_class,
        }
        for field in RESOURCE_FIELDS:
            value = raw.get(field)
            if value is None:
                row[field] = None
            elif field in {"food_used", "food_made"}:
                row[field] = round(_number(value), 2)
            else:
                row[field] = _int(value)
        by_second[second] = row
    return [by_second[second] for second in sorted(by_second)]


def _intervals(samples: list[dict[str, Any]], end_second: int):
    for index, sample in enumerate(samples):
        start = sample["second"]
        end = samples[index + 1]["second"] if index + 1 < len(samples) else end_second
        if end > start:
            yield sample, start, end


def _qualified_windows(
    samples: list[dict[str, Any]],
    end_second: int,
    predicate: Callable[[dict[str, Any]], bool],
) -> list[dict[str, Any]]:
    """Return conservative lower-bound windows between corroborating observations."""
    windows: list[dict[str, Any]] = []
    for sample, next_sample in zip(samples, samples[1:]):
        start = sample["second"]
        end = next_sample["second"]
        if end <= start or end - start > MAX_CORROBORATED_GAP_SECONDS:
            continue
        if not predicate(sample) or not predicate(next_sample):
            continue
        if windows and windows[-1]["end_second"] == start:
            windows[-1]["end_second"] = end
            windows[-1]["duration_seconds"] = end - windows[-1]["start_second"]
            windows[-1]["source_sample_seconds"].append(next_sample["second"])
        else:
            windows.append(
                {
                    "start_second": start,
                    "end_second": end,
                    "duration_seconds": end - start,
                    "source_sample_seconds": [sample["second"], next_sample["second"]],
                    "evidence_class": "derived",
                }
            )
    return windows


def worker_continuity(samples: list[dict[str, Any]], end_second: int) -> dict[str, Any]:
    """Encode a second-resolution worker map as compact stepwise segments."""
    segments: list[dict[str, Any]] = []
    for sample, start, end in _intervals(samples, end_second):
        workers = sample.get("workers")
        if workers is None:
            continue
        if segments and segments[-1]["workers"] == workers and segments[-1]["end_second"] == start:
            segments[-1]["end_second"] = end
            segments[-1]["source_sample_seconds"].append(sample["second"])
        else:
            segments.append(
                {
                    "start_second": start,
                    "end_second": end,
                    "workers": workers,
                    "observed_at_second": sample["second"],
                    "source_sample_seconds": [sample["second"]],
                    "evidence_class": "derived",
                }
            )
    stalls = [
        {
            "start_second": row["start_second"],
            "end_second": row["source_sample_seconds"][-1],
            "duration_seconds": row["source_sample_seconds"][-1] - row["start_second"],
            "workers": row["workers"],
            "evidence_class": "derived",
        }
        for row in segments
        if row["start_second"] >= 120
        and row["workers"] < 60
        and len(row["source_sample_seconds"]) >= 2
        and max(
            later - earlier
            for earlier, later in zip(row["source_sample_seconds"], row["source_sample_seconds"][1:])
        ) <= MAX_CORROBORATED_GAP_SECONDS
        and row["source_sample_seconds"][-1] - row["start_second"] >= 45
    ]
    return {
        "availability": "calculated" if segments else "withheld",
        "resolution_seconds": 1,
        "encoding": "stepwise_rle",
        "segments": segments,
        "stall_windows": stalls,
        "evidence_note": (
            "Segments carry observations forward for display. Stall signals require repeated observations, "
            "bounded gaps, and use only the corroborated span between samples."
        ),
    }


def mineral_exposure(samples: list[dict[str, Any]], end_second: int) -> dict[str, Any]:
    thresholds = []
    for threshold in MINERAL_THRESHOLDS:
        windows = _qualified_windows(
            samples,
            end_second,
            lambda sample, minimum=threshold: (sample.get("minerals") or 0) >= minimum,
        )
        thresholds.append(
            {
                "minerals": threshold,
                "total_exposure_seconds": sum(row["duration_seconds"] for row in windows),
                "longest_exposure_seconds": max(
                    (row["duration_seconds"] for row in windows), default=0
                ),
                "windows": windows,
            }
        )
    return {
        "availability": "calculated" if samples else "withheld",
        "thresholds": thresholds,
        "evidence_note": "Durations are conservative lower bounds between corroborating threshold observations no more than 30 seconds apart.",
    }


def supply_blocks(
    samples: list[dict[str, Any]],
    build_events: list[dict[str, Any]],
    end_second: int,
) -> dict[str, Any]:
    windows = _qualified_windows(
        samples,
        end_second,
        lambda sample: (
            sample.get("food_used") is not None
            and sample.get("food_made") is not None
            and sample["food_used"] > 0
            and sample["food_made"] - sample["food_used"] <= 0.25
        ),
    )
    provider_events = [
        row
        for row in build_events or []
        if row.get("unit") in SUPPLY_PROVIDERS and row.get("second") is not None
    ]
    for window in windows:
        start, end = window["start_second"], window["end_second"]
        max_supply = any(
            (sample.get("food_made") or 0) >= 199.5
            for sample in samples
            if start <= sample["second"] < end
        )
        nearby = [row for row in provider_events if start - 30 <= _int(row["second"]) <= end]
        during = [row for row in nearby if start <= _int(row["second"]) <= end]
        if max_supply:
            cause = "maximum_supply_cap"
        elif any(row.get("phase") == "started" for row in during):
            cause = "supply_provider_started_during_block"
        elif any(row.get("phase") == "completed" for row in during):
            cause = "supply_provider_completed_during_block"
        elif nearby:
            cause = "insufficient_headroom_after_nearby_provider"
        else:
            cause = "no_supply_provider_event_near_block"
        window.update(
            {
                "cause_classification": cause,
                "cause_evidence_class": "derived",
                "provider_events": nearby,
                "production_delay_exposure_seconds": window["duration_seconds"],
                "downstream_unit_delay_seconds": None,
                "downstream_delay_status": "withheld_without_production_order_facts",
            }
        )
    return {
        "availability": "calculated" if samples else "withheld",
        "windows": windows,
        "total_exposure_seconds": sum(row["duration_seconds"] for row in windows),
        "evidence_note": (
            "Capped intervals require corroborating stats observations no more than 30 seconds apart. Cause is a review classification; "
            "specific queued-unit delay is withheld without explicit production-order facts."
        ),
    }


def _merge_ranges(ranges: list[tuple[int, int]]) -> list[tuple[int, int]]:
    merged: list[list[int]] = []
    for start, end in sorted(ranges):
        if end <= start:
            continue
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(start, end) for start, end in merged]


def _idle_ranges(start: int, end: int, active: list[tuple[int, int]]) -> list[tuple[int, int]]:
    cursor = start
    idle = []
    for active_start, active_end in active:
        if active_start > cursor:
            idle.append((cursor, active_start))
        cursor = max(cursor, active_end)
    if cursor < end:
        idle.append((cursor, end))
    return idle


def production_utilization(
    assets: list[dict[str, Any]],
    cycles: list[dict[str, Any]],
    end_second: int,
) -> dict[str, Any]:
    valid_assets = [
        row for row in assets or [] if row.get("producer_tag") and row.get("online_second") is not None
    ]
    valid_cycles = [
        row
        for row in cycles or []
        if row.get("producer_tag")
        and row.get("start_second") is not None
        and row.get("end_second") is not None
        and _int(row["end_second"]) > _int(row["start_second"])
    ]
    missing = []
    if not valid_assets:
        missing.append("production_asset_identity_and_online_time")
    if not valid_cycles:
        missing.append("production_cycle_start_and_end_events")
    if missing:
        return {
            "availability": "withheld",
            "missing_facts": missing,
            "utilization_percent": None,
            "idle_windows": [],
            "evidence_note": "Utilization is not estimated from unit births or resource spending alone.",
        }

    asset_rows = []
    total_available = 0
    total_active = 0
    all_idle = []
    for asset in valid_assets:
        tag = str(asset["producer_tag"])
        online = _int(asset["online_second"])
        offline = min(end_second, _int(asset.get("offline_second"), end_second))
        if offline <= online:
            continue
        active = _merge_ranges(
            [
                (max(online, _int(row["start_second"])), min(offline, _int(row["end_second"])))
                for row in valid_cycles
                if str(row["producer_tag"]) == tag
            ]
        )
        active_seconds = sum(end - start for start, end in active)
        available_seconds = offline - online
        idle = _idle_ranges(online, offline, active)
        total_active += active_seconds
        total_available += available_seconds
        all_idle.extend(
            {
                "producer_tag": tag,
                "start_second": start,
                "end_second": end,
                "duration_seconds": end - start,
                "evidence_class": "derived",
            }
            for start, end in idle
        )
        asset_rows.append(
            {
                "producer_tag": tag,
                "unit_type": asset.get("unit_type"),
                "available_seconds": available_seconds,
                "active_seconds": active_seconds,
                "utilization_percent": round(100 * active_seconds / available_seconds, 1),
            }
        )
    return {
        "availability": "calculated" if total_available else "withheld",
        "utilization_percent": round(100 * total_active / total_available, 1) if total_available else None,
        "active_capacity_seconds": total_active,
        "available_capacity_seconds": total_available,
        "assets": asset_rows,
        "idle_windows": all_idle,
        "evidence_note": "Calculated only from explicit producer identity plus cycle start/end facts.",
    }


def compatibility_fingerprint(
    replay: dict[str, Any],
    player: dict[str, Any],
    matchup: str,
    duration_seconds: int,
    evidence_class: str = "observed_replay",
) -> dict[str, Any]:
    patch = replay.get("patch") or replay.get("game_version") or replay.get("release")
    map_name = replay.get("map")
    race = player.get("race") or player.get("play_race")
    declared_mode = str(replay.get("type") or replay.get("category") or "").strip().lower().replace(" ", "")
    game_mode = "1v1" if declared_mode in {"1v1", "1vs1", "onevone"} else declared_mode or None
    values = {"race": race, "matchup": matchup, "patch": patch, "map": map_name, "game_mode": game_mode}
    complete = all(value and str(value).lower() != "unknown" for value in values.values())
    bucket_start = (duration_seconds // 60) * 60
    return {
        "schema_version": FACT_SCHEMA_VERSION,
        **values,
        "duration_bucket": {"start_second": bucket_start, "end_second": bucket_start + 59},
        "status": "complete" if complete else "incomplete",
        "evidence_class": f"{evidence_class}_with_derived_duration_bucket",
    }


def one_v_one_eligibility(analysis: dict[str, Any]) -> dict[str, Any]:
    """Require an explicit two-player, two-team 1v1 structure before personal coaching."""
    players = [row for row in (analysis.get("players") or []) if row.get("pid") is not None]
    replay = analysis.get("replay") or {}
    declared = str(replay.get("type") or replay.get("category") or "").strip().lower().replace(" ", "")
    declared_1v1 = declared in {"1v1", "1vs1", "onevone"}
    teams = {str(row.get("team")) for row in players if row.get("team") is not None}
    reasons = []
    if len(players) != 2:
        reasons.append("requires_exactly_two_players")
    if len(teams) != 2:
        reasons.append("requires_two_distinct_declared_teams")
    if not declared_1v1:
        reasons.append("requires_declared_1v1_mode")
    return {
        "status": "eligible" if not reasons else "withheld",
        "eligible": not reasons,
        "declared_mode": declared or None,
        "player_count": len(players),
        "team_count": len(teams),
        "reasons": reasons,
    }


def _qualifying_first_five_signals(
    workers: dict[str, Any],
    minerals: dict[str, Any],
    supply: dict[str, Any],
    production: dict[str, Any],
) -> dict[str, list[dict[str, Any]]]:
    """Return only signals that satisfy the shared five-minute correction contract."""
    threshold = next(
        (
            row
            for row in minerals.get("thresholds", [])
            if row.get("minerals") == 1000
        ),
        {"windows": []},
    )
    return {
        "WORKER_CONTINUITY_STALL": [
            row
            for row in workers.get("stall_windows", [])
            if _window_overlap(row, 0, 300) >= 45
        ],
        "MINERAL_FLOAT_EXPOSURE": [
            row
            for row in threshold.get("windows", [])
            if _window_overlap(row, 0, 300) >= 20
        ],
        "SUPPLY_BLOCK_EXPOSURE": [
            row
            for row in supply.get("windows", [])
            if _window_overlap(row, 0, 300) >= 8
            and row.get("cause_classification") != "maximum_supply_cap"
        ],
        "PRODUCTION_IDLE_EXPOSURE": [
            row
            for row in production.get("idle_windows", [])
            if production.get("availability") == "calculated"
            and _window_overlap(row, 0, 300) >= 30
        ],
    }


def _earliest_signal(
    workers: dict[str, Any],
    minerals: dict[str, Any],
    supply: dict[str, Any],
    production: dict[str, Any],
) -> dict[str, Any]:
    candidates = [
        (row.get("start_second", 10**9), code, row)
        for code, rows in _qualifying_first_five_signals(
            workers, minerals, supply, production
        ).items()
        for row in rows
    ]
    if not candidates:
        return {
            "status": "withheld",
            "reason": "No qualifying local hard-data signal was observed.",
            "master_comparison_status": "withheld_without_compatible_reference",
        }
    second, code, evidence = sorted(candidates, key=lambda row: (row[0], row[1]))[0]
    return {
        "status": "calculated",
        "second": second,
        "code": code,
        "evidence": evidence,
        "evidence_class": "derived",
        "meaning": "Earliest qualifying local signal; not a claim of divergence from a master reference.",
        "master_comparison_status": "withheld_without_compatible_reference",
    }


def build_player_hard_data(
    *,
    replay: dict[str, Any],
    player: dict[str, Any],
    matchup: str,
    resource_samples: list[dict[str, Any]],
    build_events: list[dict[str, Any]],
    production_assets: list[dict[str, Any]] | None = None,
    production_cycles: list[dict[str, Any]] | None = None,
    source: dict[str, Any] | None = None,
) -> dict[str, Any]:
    fact_evidence_class = (source or {}).get("evidence_class", "observed_replay")
    samples = normalize_resource_samples(resource_samples, fact_evidence_class)
    duration = _int(replay.get("duration_seconds"), samples[-1]["second"] if samples else 0)
    duration = max(duration, samples[-1]["second"] if samples else 0)
    sample_gaps = [b["second"] - a["second"] for a, b in zip(samples, samples[1:])]
    workers = worker_continuity(samples, duration)
    minerals = mineral_exposure(samples, duration)
    supply = supply_blocks(samples, build_events, duration)
    production = production_utilization(production_assets or [], production_cycles or [], duration)
    fingerprint = compatibility_fingerprint(
        replay, player, matchup, duration, fact_evidence_class
    )
    normalized_events = [
        {
            "second": _int(row.get("second")),
            "event_type": row.get("kind") or "unknown",
            "unit_type": row.get("unit"),
            "phase": row.get("phase"),
            "evidence_class": fact_evidence_class,
        }
        for row in build_events or []
        if row.get("second") is not None
    ]
    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "evidence_boundary": {
            "facts": fact_evidence_class,
            "metrics": "derived",
            "causality": "withheld_without_direct_evidence",
            "intent": "not_inferred",
        },
        "fact_envelope": {
            "schema_version": FACT_SCHEMA_VERSION,
            "source": {
                "parser": (source or {}).get("parser", "unknown"),
                "parser_version": (source or {}).get("parser_version", "unknown"),
                "parser_schema_version": (source or {}).get("parser_schema_version", "unknown"),
                "digest_sha256": (source or {}).get("digest_sha256"),
                "ingested_at": (source or {}).get("ingested_at"),
            },
            "player": {"pid": player.get("pid"), "race": player.get("race"), "matchup": matchup},
            "compatibility_fingerprint": fingerprint,
            "coverage": {
                "resource_sample_count": len(samples),
                "first_second": samples[0]["second"] if samples else None,
                "last_second": samples[-1]["second"] if samples else None,
                "duration_seconds": duration,
                "median_sample_gap_seconds": round(median(sample_gaps), 1) if sample_gaps else None,
                "production_asset_count": len(production_assets or []),
                "production_cycle_count": len(production_cycles or []),
            },
            "resource_samples": samples,
            "events": normalized_events,
            "production_assets": production_assets or [],
            "production_cycles": production_cycles or [],
        },
        "worker_continuity": workers,
        "mineral_exposure": minerals,
        "production_utilization": production,
        "supply_blocks": supply,
        "earliest_signal": _earliest_signal(workers, minerals, supply, production),
        "master_divergence": {
            "status": "withheld",
            "reason": "A compatible, provenance-backed reference fingerprint is required.",
        },
    }


def _phase(second: int) -> str:
    if second < 240:
        return "opening"
    if second < 480:
        return "early_midgame"
    if second < 720:
        return "late_midgame"
    return "late_game"


def _snapshot_at(samples: list[dict[str, Any]], second: int, *, after: bool = False):
    candidates = [
        row for row in samples if row["second"] >= second
    ] if after else [row for row in samples if row["second"] <= second]
    if not candidates:
        return None
    return candidates[0] if after else candidates[-1]


def _attention_gaps(
    observation_model: dict[str, Any], duration: int, threshold: int = 20
) -> dict[str, Any]:
    channels = {
        "camera": observation_model.get("camera_timeline") or [],
        "selection": observation_model.get("selection_timeline") or [],
        "command": observation_model.get("command_timeline") or [],
    }
    coverage = observation_model.get("coverage") or {}
    windows = []
    summaries = {}
    for channel, rows in channels.items():
        seconds = sorted({_int(row.get("second")) for row in rows if row.get("second") is not None})
        boundaries = [0, *seconds, duration]
        channel_windows = []
        for start, end in zip(boundaries, boundaries[1:]):
            gap = end - start
            if gap <= threshold:
                continue
            channel_windows.append(
                {
                    "channel": channel,
                    "start_second": start,
                    "end_second": end,
                    "gap_seconds": gap,
                    "excess_seconds": gap - threshold,
                    "phase": _phase(start),
                    "evidence_class": "derived_attention_proxy",
                }
            )
        windows.extend(channel_windows)
        expected_count = coverage.get(f"{channel}_events")
        summaries[channel] = {
            "event_count": expected_count if expected_count is not None else len(rows),
            "timeline_rows": len(rows),
            "coverage_status": "complete" if expected_count in (None, len(rows)) else "truncated",
            "gap_count": len(channel_windows),
            "excess_gap_seconds": sum(row["excess_seconds"] for row in channel_windows),
        }
    return {
        "availability": "calculated" if any(channels.values()) else "withheld",
        "gap_threshold_seconds": threshold,
        "channels": summaries,
        "windows": sorted(windows, key=lambda row: (row["start_second"], row["channel"])),
        "evidence_note": (
            "Attention debt is a camera/selection/command gap proxy, not a claim about cognition. "
            "A truncated timeline cannot support a complete-game debt total."
        ),
    }


def _repeated_phase_failures(report: dict[str, Any]) -> dict[str, Any]:
    signals = []
    for row in (report.get("worker_continuity") or {}).get("stall_windows", []):
        signals.append(("WORKER_CONTINUITY_STALL", row["start_second"]))
    for threshold in (report.get("mineral_exposure") or {}).get("thresholds", []):
        if threshold.get("minerals", 0) < 1000:
            continue
        for row in threshold.get("windows", []):
            if row.get("duration_seconds", 0) >= 20:
                signals.append((f"MINERAL_{threshold['minerals']}_EXPOSURE", row["start_second"]))
    for row in (report.get("supply_blocks") or {}).get("windows", []):
        if row.get("cause_classification") != "maximum_supply_cap":
            signals.append(("SUPPLY_BLOCK_EXPOSURE", row["start_second"]))
    if (report.get("production_utilization") or {}).get("availability") == "calculated":
        for row in report["production_utilization"].get("idle_windows", []):
            if row.get("duration_seconds", 0) >= 30:
                signals.append(("PRODUCTION_IDLE_EXPOSURE", row["start_second"]))
    grouped: dict[tuple[str, str], list[int]] = {}
    for code, second in signals:
        grouped.setdefault((code, _phase(second)), []).append(second)
    repeated = [
        {
            "code": code,
            "phase": phase,
            "occurrences": len(seconds),
            "seconds": sorted(seconds),
            "evidence_class": "derived",
        }
        for (code, phase), seconds in grouped.items()
        if len(seconds) >= 2
    ]
    return {
        "within_replay": sorted(repeated, key=lambda row: (row["seconds"][0], row["code"])),
        "cross_replay_status": "withheld_without_compatible_case_cohort",
        "evidence_note": "Repeated means the same normalized signal occurred at least twice in one phase; recurrence across games is not inferred here.",
    }


def attach_decision_context(
    report: dict[str, Any], observation_model: dict[str, Any]
) -> dict[str, Any]:
    """Attach information and attention context after observation reconstruction."""
    envelope = report.get("fact_envelope") or {}
    samples = envelope.get("resource_samples") or []
    events = envelope.get("events") or []
    duration = max(
        _int((envelope.get("coverage") or {}).get("duration_seconds")),
        _int((envelope.get("coverage") or {}).get("last_second")),
    )
    opportunities = observation_model.get("opportunities") or []

    def knowledge_second(row: dict[str, Any]):
        if row.get("status") in {"plausibly_observed", "camera_attention_without_position_proof"}:
            return row.get("camera_attention_second")
        return None

    commitments = []
    expansions = []
    for event in events:
        if event.get("event_type") not in {"expansion", "structure"}:
            continue
        if event.get("phase") not in {None, "started"}:
            continue
        second = _int(event.get("second"))
        known = [
            row
            for row in opportunities
            if knowledge_second(row) is not None and _int(knowledge_second(row)) <= second
        ]
        recent = [row for row in known if _int(knowledge_second(row)) >= max(0, second - 120)]
        confirmed = [row for row in recent if row.get("status") == "plausibly_observed"]
        attention_only = [
            row for row in recent if row.get("status") == "camera_attention_without_position_proof"
        ]
        before = _snapshot_at(samples, second)
        after = _snapshot_at(samples, second + 120, after=True)
        loss_delta = None
        if before and after and before.get("resources_lost") is not None and after.get("resources_lost") is not None:
            loss_delta = max(0, after["resources_lost"] - before["resources_lost"])
        outcome = {
            "window_seconds": 120,
            "resources_lost_delta": loss_delta,
            "classification": (
                "adverse_resource_loss_observed" if loss_delta is not None and loss_delta >= 700
                else "no_large_resource_loss_observed" if loss_delta is not None
                else "withheld_without_resource_samples"
            ),
            "evidence_class": "derived_outcome",
        }
        context = {
            "second": second,
            "phase": _phase(second),
            "commitment": event,
            "information_state_before": {
                "plausibly_observed_signals": len(confirmed),
                "camera_attention_without_position_proof": len(attention_only),
                "recent_signals": recent[-8:],
                "private_knowledge_status": "not_reconstructed",
                "evidence_class": "derived_from_observation_proxy",
            },
            "decision_reasonableness": {
                "status": "withheld_without_matchup_policy_and_exact_information_state",
                "separate_from_outcome": True,
            },
            "outcome": outcome,
        }
        commitments.append(context)
        if event.get("event_type") == "expansion":
            if confirmed:
                evidence_grade = "A"
            elif attention_only:
                evidence_grade = "B"
            else:
                evidence_grade = "C"
            expansions.append(
                {
                    "second": second,
                    "unit_type": event.get("unit_type"),
                    "scouting_evidence_grade": evidence_grade,
                    "plausibly_observed_signals": len(confirmed),
                    "attention_only_signals": len(attention_only),
                    "strategic_safety_grade": None,
                    "strategic_safety_status": "withheld_without_matchup_policy",
                    "outcome": outcome,
                    "evidence_class": "derived_evidence_coverage",
                }
            )

    report["decision_context"] = {
        "schema_version": "1.0",
        "evidence_boundary": (
            "Information state is reconstructed only from conservative visibility, camera, selection, and command proxies. "
            "Decision reasonableness remains separate from outcome and is withheld without an applicable policy."
        ),
        "commitment_windows": commitments,
        "expansion_reviews": expansions,
        "attention_debt": _attention_gaps(observation_model, duration),
        "repeated_phase_failures": _repeated_phase_failures(report),
    }
    return report


def _window_overlap(row: dict[str, Any], start: int, end: int) -> int:
    return max(0, min(end, _int(row.get("end_second"))) - max(start, _int(row.get("start_second"))))


def macro_fingerprint(report: dict[str, Any]) -> dict[str, Any]:
    envelope = report.get("fact_envelope") or {}
    samples = envelope.get("resource_samples") or []
    events = envelope.get("events") or []
    coverage = envelope.get("coverage") or {}
    duration = _int(coverage.get("duration_seconds"))
    last_second = _int(coverage.get("last_second"), -1)
    four_minute_complete = duration >= 240 and last_second >= 225
    five_minute_complete = duration >= 300 and last_second >= 285
    at_240 = _snapshot_at(samples, 240) if four_minute_complete else None
    at_300 = _snapshot_at(samples, 300) if five_minute_complete else None
    mineral_1000 = next(
        (
            row for row in (report.get("mineral_exposure") or {}).get("thresholds", [])
            if row.get("minerals") == 1000
        ),
        {"windows": []},
    )
    supply_windows = (report.get("supply_blocks") or {}).get("windows", [])
    attention = ((report.get("decision_context") or {}).get("attention_debt") or {})
    attention_opening = sum(
        _window_overlap(row, 0, 300)
        for row in attention.get("windows", [])
        if row.get("excess_seconds") is not None
    )
    expansions = sorted(
        _int(row.get("second"))
        for row in events
        if row.get("event_type") == "expansion" and row.get("phase") in {None, "started"}
    )
    return {
        "schema_version": "1.0",
        "evidence_class": "derived",
        "result_included": False,
        "compatibility_fingerprint": envelope.get("compatibility_fingerprint") or {},
        "observation_window": {
            "first_five_minutes": "complete" if five_minute_complete else "incomplete",
            "required_through_second": 300,
            "last_observed_second": coverage.get("last_second"),
            "endpoint_tolerance_seconds": 15,
        },
        "features": {
            "workers_at_4_minutes": at_240.get("workers") if at_240 else None,
            "workers_at_5_minutes": at_300.get("workers") if at_300 else None,
            "bases_at_5_minutes": at_300.get("bases") if at_300 else None,
            "expansion_start_seconds": expansions[:6],
            "mineral_1000_exposure_first_5_minutes": sum(
                _window_overlap(row, 0, 300) for row in mineral_1000.get("windows", [])
            ),
            "supply_block_exposure_first_5_minutes": sum(
                _window_overlap(row, 0, 300) for row in supply_windows
                if row.get("cause_classification") != "maximum_supply_cap"
            ),
            "attention_gap_proxy_first_5_minutes": (
                attention_opening if attention.get("availability") == "calculated" else None
            ),
            "production_utilization_percent": (
                (report.get("production_utilization") or {}).get("utilization_percent")
                if (report.get("production_utilization") or {}).get("availability") == "calculated"
                else None
            ),
        },
        "evidence_note": "The vector excludes victory/defeat and contains only normalized replay facts or labeled derivations.",
    }


def opponent_behavior_fingerprint(report: dict[str, Any] | None) -> dict[str, Any]:
    if not report:
        return {"status": "withheld", "reason": "Opponent hard-data facts are unavailable."}
    fingerprint = macro_fingerprint(report)
    return {
        "status": "calculated",
        "schema_version": fingerprint["schema_version"],
        "features": fingerprint["features"],
        "compatibility_fingerprint": fingerprint["compatibility_fingerprint"],
        "intent_status": "not_inferred",
        "evidence_class": "derived_observed_behavior_vector",
        "evidence_note": "This describes replay-observed behavior; it does not assign strategy, personality, or intent.",
    }


def _compatibility(target: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    keys = ("race", "matchup", "patch", "map", "game_mode")
    mismatches = [key for key in keys if target.get(key) != candidate.get(key)]
    if target.get("status") != "complete" or candidate.get("status") != "complete":
        mismatches.append("incomplete_fingerprint")
    return {"compatible": not mismatches, "mismatches": sorted(set(mismatches))}


def _opening_signal_codes(report: dict[str, Any]) -> set[str]:
    rows = _qualifying_first_five_signals(
        report.get("worker_continuity") or {},
        report.get("mineral_exposure") or {},
        report.get("supply_blocks") or {},
        report.get("production_utilization") or {},
    )
    return {code for code, values in rows.items() if values}


CORRECTION_CONTRACTS = {
    "WORKER_CONTINUITY_STALL": {
        "action": "Run a five-minute worker-growth drill; if the worker count plateaus, report whether production paused, workers were lost, or the cause is unknown.",
        "title": "Protect worker growth for five minutes",
        "target": "Keep intended worker growth moving through 5:00 and name the cause of any plateau.",
        "measure": "Next replay review finds no unexplained worker-count plateau before 5:00",
        "guided_prompt": "Did worker production stay active, or can you name why worker count stopped growing?",
        "measurement_mode": "hybrid",
        "replay_observed_component": "Worker-count plateau windows before 5:00",
        "player_report_component": "Whether production paused, workers were lost, or the plateau had another cause",
        "replay_verification": "conditional",
    },
    "MINERAL_FLOAT_EXPOSURE": {
        "action": "Run a five-minute spend-cycle drill; each time minerals cross 1,000, report whether the bank is planned and name the next commitment or constraint.",
        "title": "Run one five-minute spend cycle",
        "target": "When minerals cross 1,000, name whether the bank is planned and choose the next commitment or constraint response.",
        "measure": "Every 1,000-mineral crossing has a reported plan or constraint and a next response",
        "guided_prompt": "If minerals crossed 1,000, was the bank planned, and what commitment or constraint came next?",
        "measurement_mode": "hybrid",
        "replay_observed_component": "Mineral-bank windows at or above 1,000 before 5:00",
        "player_report_component": "Whether the bank was planned and what commitment or constraint caused it",
        "replay_verification": "partial",
    },
    "SUPPLY_BLOCK_EXPOSURE": {
        "action": "Run a five-minute supply-headroom drill; start the provider before the next production cycle reaches zero space.",
        "title": "Protect supply headroom for five minutes",
        "target": "Start the next supply provider before the following production cycle reaches zero free supply.",
        "measure": "No non-cap supply-block window appears before 5:00 in the next replay",
        "guided_prompt": "Did you start supply before planned production reached zero free space?",
        "measurement_mode": "hybrid",
        "replay_observed_component": "Non-cap supply-block windows before 5:00",
        "player_report_component": "Whether the next provider was intentionally started before planned production consumed the remaining space",
        "replay_verification": "conditional",
    },
    "PRODUCTION_IDLE_EXPOSURE": {
        "action": "Review explicit producer-cycle gaps and rehearse one repeatable production cadence before adding build complexity.",
        "title": "Rehearse one repeatable production cadence",
        "target": "Cycle through available producers before adding build complexity.",
        "measure": "Next replay contains no explicit 30-second producer gap before 5:00",
        "guided_prompt": "Since the last checkpoint, did planned production stay active?",
        "measurement_mode": "hybrid",
        "replay_observed_component": "Explicit producer-cycle idle windows of at least 30 seconds before 5:00",
        "player_report_component": "Whether the gap was deliberate and what decision justified it",
        "replay_verification": "conditional",
    },
}

CORRECTIONS = {code: contract["action"] for code, contract in CORRECTION_CONTRACTS.items()}


def _correction_evidence_anchor(report: dict[str, Any], code: str | None) -> dict[str, Any]:
    """Return evidence for the selected correction, never a different earlier signal."""
    qualifying = _qualifying_first_five_signals(
        report.get("worker_continuity") or {},
        report.get("mineral_exposure") or {},
        report.get("supply_blocks") or {},
        report.get("production_utilization") or {},
    )
    rows = qualifying.get(code or "", [])
    metric = None
    if code == "WORKER_CONTINUITY_STALL":
        metric = "worker_continuity.stall_windows"
    elif code == "MINERAL_FLOAT_EXPOSURE":
        metric = "mineral_exposure.thresholds[1000].windows"
    elif code == "SUPPLY_BLOCK_EXPOSURE":
        metric = "supply_blocks.windows"
    elif code == "PRODUCTION_IDLE_EXPOSURE":
        metric = "production_utilization.idle_windows"
    if not rows:
        return {
            "status": "withheld",
            "signal_code": code,
            "reason": "The selected correction has no matching evidence window in this replay.",
        }
    row = sorted(rows, key=lambda value: (value.get("start_second", 10**9), value.get("end_second", 10**9)))[0]
    start = max(0, int(row.get("start_second") or 0))
    duration = max(0, int(row.get("duration_seconds") or 0))
    end = max(start, int(row.get("end_second") or (start + duration)))
    return {
        "status": "calculated",
        "signal_code": code,
        "start_second": start,
        "end_second": end,
        "duration_seconds": duration or max(0, end - start),
        "derived_metric": metric,
        "evidence_class": "derived_from_observed_replay_facts",
    }


def _first_hard_data(analysis: dict[str, Any]) -> dict[str, Any] | None:
    players = analysis.get("players") or []
    by_player = analysis.get("analysis_by_player") or {}
    if players:
        value = by_player.get(str(players[0].get("pid"))) or {}
        return value.get("hard_data")
    value = next(iter(by_player.values()), {})
    return value.get("hard_data")


def _hard_data_for_player(
    analysis: dict[str, Any], player_pid: str | int | None = None
) -> dict[str, Any] | None:
    """Return one player's facts without silently treating an opponent as the user."""
    if player_pid is None:
        return _first_hard_data(analysis)
    value = (analysis.get("analysis_by_player") or {}).get(str(player_pid)) or {}
    return value.get("hard_data")


def _first_five_field_coverage(
    report: dict[str, Any], fields: tuple[str, ...]
) -> dict[str, Any]:
    """Prove that absence of a signal is observable, not just unreported."""
    samples = (report.get("fact_envelope") or {}).get("resource_samples") or []
    observed = [
        row
        for row in samples
        if 0 <= _int(row.get("second")) <= 300
        and all(row.get(field) is not None for field in fields)
    ]
    seconds = sorted({_int(row.get("second")) for row in observed})
    gaps = [later - earlier for earlier, later in zip(seconds, seconds[1:])]
    complete = bool(
        seconds
        and seconds[0] <= 15
        and seconds[-1] >= 285
        and gaps
        and max(gaps) <= MAX_CORROBORATED_GAP_SECONDS
    )
    missing = []
    if not seconds:
        missing.append("required_fields_unavailable")
    else:
        if seconds[0] > 15:
            missing.append("opening_boundary_unobserved")
        if seconds[-1] < 285:
            missing.append("five_minute_boundary_unobserved")
        if not gaps or max(gaps) > MAX_CORROBORATED_GAP_SECONDS:
            missing.append("observation_gaps_exceed_30_seconds")
    return {
        "status": "complete" if complete else "withheld",
        "required_fields": list(fields),
        "first_observed_second": seconds[0] if seconds else None,
        "last_observed_second": seconds[-1] if seconds else None,
        "maximum_gap_seconds": max(gaps) if gaps else None,
        "missing": missing,
    }


def _first_five_signal_observability(
    report: dict[str, Any], target_window_complete: bool
) -> dict[str, Any]:
    signal_codes = _opening_signal_codes(report)
    production_availability = (report.get("production_utilization") or {}).get("availability")
    coverage = {
        "WORKER_CONTINUITY_STALL": _first_five_field_coverage(report, ("workers",)),
        "MINERAL_FLOAT_EXPOSURE": _first_five_field_coverage(report, ("minerals",)),
        "SUPPLY_BLOCK_EXPOSURE": _first_five_field_coverage(report, ("food_used", "food_made")),
        "PRODUCTION_IDLE_EXPOSURE": {
            "status": "complete" if production_availability == "calculated" else "withheld",
            "required_fields": ["producer_identity", "producer_online_time", "production_cycle_start", "production_cycle_end"],
            "missing": [] if production_availability == "calculated" else (report.get("production_utilization") or {}).get("missing_facts", []),
        },
    }
    evaluations = {
        code: {
            "status": (
                "withheld"
                if not target_window_complete
                or (code not in signal_codes and coverage[code]["status"] != "complete")
                else "calculated"
            ),
            "signal_present": (
                code in signal_codes
                if target_window_complete
                and (code in signal_codes or coverage[code]["status"] == "complete")
                else None
            ),
            "reason": (
                "Replay coverage does not reach the five-minute observation boundary."
                if not target_window_complete
                else (
                    (
                        "Explicit producer identity and cycle timing are unavailable; production cadence is not inferred from unit births or spending."
                        if code == "PRODUCTION_IDLE_EXPOSURE"
                        else "The facts required to prove this signal absent do not densely cover the first five minutes."
                    )
                    if code not in signal_codes and coverage[code]["status"] != "complete"
                    else None
                )
            ),
        }
        for code in CORRECTION_CONTRACTS
    }
    return {"signal_codes": signal_codes, "coverage": coverage, "evaluations": evaluations}


def build_case_learning_index(
    analysis: dict[str, Any], player_pid: str | int | None = None
) -> dict[str, Any]:
    """Build a replay fingerprint for one explicitly identified player when supplied."""
    if player_pid is None:
        return {
            "schema_version": "1.0",
            "status": "withheld",
            "reason": "Choose which replay player is you before a personal learning index is calculated.",
            "requires_player_selection": True,
        }
    eligibility = one_v_one_eligibility(analysis)
    if not eligibility["eligible"]:
        return {"schema_version": "1.0", "status": "withheld", "reason": "Personal coaching requires an explicit two-player 1v1 replay.", "one_v_one_eligibility": eligibility}
    report = _hard_data_for_player(analysis, player_pid)
    if not report:
        return {"schema_version": "1.0", "status": "withheld", "reason": "Normalized hard data is unavailable."}
    envelope = report.get("fact_envelope") or {}
    if not envelope.get("resource_samples") or not envelope.get("compatibility_fingerprint"):
        return {"schema_version": "1.0", "status": "withheld", "reason": "Normalized replay coverage is incomplete."}
    macro = macro_fingerprint(report)
    target_window_complete = macro["observation_window"]["first_five_minutes"] == "complete"
    observability = _first_five_signal_observability(report, target_window_complete)
    return {
        "schema_version": "1.0",
        "status": "calculated",
        "digest_sha256": (envelope.get("source") or {}).get("digest_sha256"),
        "compatibility_fingerprint": envelope.get("compatibility_fingerprint") or {},
        "macro_fingerprint": macro,
        "first_five_window_complete": target_window_complete,
        "opening_signal_codes": sorted(observability["signal_codes"]),
        "signal_evaluations": observability["evaluations"],
        "signal_coverage": observability["coverage"],
        "evidence_class": (report.get("evidence_boundary") or {}).get("facts"),
        "selected_player_pid": str(player_pid) if player_pid is not None else None,
    }


def build_case_learning_summary(
    target_analysis: dict[str, Any],
    candidate_analyses: list[dict[str, Any]],
    target_player_pid: str | int | None = None,
) -> dict[str, Any]:
    eligibility = one_v_one_eligibility(target_analysis)
    if not eligibility["eligible"]:
        return {"status": "withheld", "reason": "Personal coaching requires an explicit two-player 1v1 replay.", "one_v_one_eligibility": eligibility}
    target = _hard_data_for_player(target_analysis, target_player_pid)
    if not target:
        return {"status": "withheld", "reason": "Target normalized hard data is unavailable."}
    target_envelope = target.get("fact_envelope") or {}
    target_source = target_envelope.get("source") or {}
    target_digest = target_source.get("digest_sha256")
    target_fingerprint = target_envelope.get("compatibility_fingerprint") or {}
    target_fact_class = (target.get("evidence_boundary") or {}).get("facts")
    target_macro = macro_fingerprint(target)
    target_window_complete = target_macro["observation_window"]["first_five_minutes"] == "complete"
    if not target_digest:
        return {"status": "withheld", "reason": "Target content-addressed digest is unavailable."}
    compatible_entries = []
    rejected = []
    seen_digests = {target_digest} if target_digest else set()
    for analysis in candidate_analyses:
        if analysis.get("compatibility_fingerprint") is not None:
            fingerprint = analysis.get("compatibility_fingerprint") or {}
            digest = analysis.get("digest_sha256")
            signal_codes = set(analysis.get("opening_signal_codes") or [])
            candidate_evaluations = analysis.get("signal_evaluations") or {}
            candidate_fact_class = analysis.get("evidence_class")
            candidate_window_complete = bool(analysis.get("first_five_window_complete"))
        else:
            candidate = _first_hard_data(analysis)
            if not candidate:
                continue
            envelope = candidate.get("fact_envelope") or {}
            fingerprint = envelope.get("compatibility_fingerprint") or {}
            digest = (envelope.get("source") or {}).get("digest_sha256")
            signal_codes = _opening_signal_codes(candidate)
            candidate_fact_class = (candidate.get("evidence_boundary") or {}).get("facts")
            candidate_window_complete = macro_fingerprint(candidate)["observation_window"]["first_five_minutes"] == "complete"
            candidate_evaluations = _first_five_signal_observability(
                candidate, candidate_window_complete
            )["evaluations"]
        if digest and digest in seen_digests:
            continue
        check = _compatibility(target_fingerprint, fingerprint)
        if not digest:
            check["mismatches"].append("missing_digest")
        if candidate_fact_class != target_fact_class:
            check["mismatches"].append("evidence_class")
        if not target_window_complete or not candidate_window_complete:
            check["mismatches"].append("incomplete_first_five_window")
        check["mismatches"] = sorted(set(check["mismatches"]))
        check["compatible"] = not check["mismatches"]
        if check["compatible"]:
            compatible_entries.append({
                "digest_sha256": digest,
                "signal_codes": signal_codes,
                "signal_evaluations": candidate_evaluations,
            })
            if digest:
                seen_digests.add(digest)
        else:
            rejected.append({"digest_sha256": digest, "mismatches": check["mismatches"]})

    target_observability = _first_five_signal_observability(target, target_window_complete)
    target_signal_codes = target_observability["signal_codes"]
    signal_coverage = target_observability["coverage"]
    signal_evaluations = target_observability["evaluations"]
    cohort_entries = [
        {"signal_codes": target_signal_codes, "signal_evaluations": signal_evaluations},
        *compatible_entries,
    ]
    recurring = []
    observable_counts: dict[str, int] = {}
    for code in CORRECTION_CONTRACTS:
        observable = [
            row for row in cohort_entries
            if (row.get("signal_evaluations") or {}).get(code, {}).get("status") == "calculated"
        ]
        observable_counts[code] = len(observable)
        present = sum(code in row["signal_codes"] for row in observable)
        minimum = max(2, (len(observable) + 1) // 2)
        if len(observable) >= 2 and present >= minimum:
            recurrence_rate = present / len(observable)
            z = 1.96
            denominator = 1 + (z * z / len(observable))
            center = recurrence_rate + (z * z / (2 * len(observable)))
            margin = z * math.sqrt(
                (recurrence_rate * (1 - recurrence_rate) + z * z / (4 * len(observable)))
                / len(observable)
            )
            recurring.append({
                "code": code,
                "games": present,
                "cohort_games": len(observable),
                "recurrence_rate": round(recurrence_rate, 3),
                "conservative_recurrence_lower_bound": round(
                    max(0.0, (center - margin) / denominator), 6
                ),
                "recurrence_strength_method": "wilson_lower_bound_95_percent",
            })
    recurring.sort(key=lambda row: (-row["conservative_recurrence_lower_bound"], -row["games"], row["code"]))
    recurring_status = "calculated" if max(observable_counts.values(), default=0) >= 2 else "withheld"
    current_recurring = [row for row in recurring if row["code"] in target_signal_codes]

    def correction_rank(row: dict[str, Any]) -> tuple[float, int, float, str]:
        evidence_anchor = _correction_evidence_anchor(target, row["code"])
        anchor_second = (
            evidence_anchor.get("start_second")
            if evidence_anchor.get("status") == "calculated"
            else float("inf")
        )
        return (
            -row["conservative_recurrence_lower_bound"],
            -row["games"],
            anchor_second,
            row["code"],
        )

    current_recurring.sort(key=correction_rank)
    selected_recurrence = current_recurring[0] if current_recurring else None
    correction_code = selected_recurrence["code"] if selected_recurrence else (target.get("earliest_signal") or {}).get("code")
    contract = CORRECTION_CONTRACTS.get(correction_code)
    anchor = _correction_evidence_anchor(target, correction_code)
    correction = (
        {
            "status": "provisional" if target_fact_class == "observed_replay" else target_fact_class,
            "code": correction_code,
            **contract,
            "evidence_class": "derived_coaching_hypothesis",
            "expert_validation": "UNVERIFIED",
            "selection_basis": (
                "highest_conservative_recurrence_lower_bound_then_current_anchor"
                if selected_recurrence
                else "earliest_current_local_signal"
            ),
            "selection_rationale": (
                {
                    "authority": "derived_from_observable_compatible_cohort",
                    "recurring_games": selected_recurrence["games"],
                    "observable_cohort_games": selected_recurrence["cohort_games"],
                    "recurrence_rate": selected_recurrence["recurrence_rate"],
                    "conservative_recurrence_lower_bound": selected_recurrence[
                        "conservative_recurrence_lower_bound"
                    ],
                    "recurrence_strength_method": selected_recurrence[
                        "recurrence_strength_method"
                    ],
                    "current_anchor_second": anchor.get("start_second"),
                    "expert_priority_status": "UNVERIFIED",
                }
                if selected_recurrence
                else {
                    "authority": "derived_from_current_replay_timing",
                    "current_anchor_second": anchor.get("start_second"),
                    "expert_priority_status": "UNVERIFIED",
                }
            ),
            "evidence_anchor": anchor,
            "measurement": {
                "rule": contract["measure"],
                "mode": contract["measurement_mode"],
                "replay_observed_component": contract["replay_observed_component"],
                "player_report_component": contract["player_report_component"],
                "replay_verification": contract["replay_verification"],
                "current_availability": "player_report_now_manual_next_replay_review_later",
                "outcome_authority": "UNVERIFIED",
            },
        }
        if contract and anchor.get("status") == "calculated"
        else {"status": "withheld", "reason": "No supported correction signal was available."}
    )
    analyses = target_analysis.get("analysis_by_player") or {}
    target_players = target_analysis.get("players") or []
    target_pid = (
        str(target_player_pid)
        if target_player_pid is not None
        else str(target_players[0].get("pid")) if target_players else next(iter(analyses), "")
    )
    opponent_report = next(
        (
            value.get("hard_data")
            for pid, value in analyses.items()
            if str(pid) != target_pid and value.get("hard_data")
        ),
        None,
    )
    return {
        "status": "calculated",
        "schema_version": "1.0",
        "selected_player_pid": target_pid,
        "source_evidence_class": target_fact_class,
        "personal_macro_fingerprint": target_macro,
        "opponent_behavior_fingerprint": opponent_behavior_fingerprint(opponent_report),
        "compatible_cohort": {
            "status": "calculated" if compatible_entries else "target_only",
            "compatible_prior_games": len(compatible_entries),
            "cohort_games_including_target": len(cohort_entries),
            "rejected_candidates": rejected,
            "required_dimensions": ["race", "matchup", "patch", "map", "game_mode", "complete_first_five_window"],
            "descriptive_dimensions_not_used_for_compatibility": ["duration_bucket"],
        },
        "recurring_first_five_signature": {
            "status": recurring_status,
            "signals": recurring if recurring_status == "calculated" else [],
            "reason": None if recurring_status == "calculated" else "At least two compatible games with observable facts for the same signal are required.",
        },
        "current_first_five_signals": {
            "status": "calculated" if target_window_complete else "withheld",
            "signals": sorted(target_signal_codes) if target_window_complete else [],
            "evaluations": signal_evaluations,
            "coverage_by_signal": signal_coverage,
            "reason": None if target_window_complete else "Replay coverage does not reach the five-minute observation boundary.",
            "evidence_class": "derived_from_observed_replay_facts",
        },
        "one_priority_correction": correction,
        "evidence_boundary": "Win/loss and opponent intent are excluded. Cross-game recurrence uses only strict compatible fingerprints; the correction is provisional until expert and player validation.",
    }
