from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any
import json
import os
import re
import shutil

APP_FOLDER = "SC2 Master Coach"


def workspace_root() -> Path:
    override = os.environ.get("SC2_MASTER_COACH_WORKSPACE")
    if override:
        root = Path(override).expanduser()
    else:
        root = Path.home() / "Documents" / APP_FOLDER / "Replays"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _safe_label(value: str, max_length: int = 64) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._ -]+", "-", value or "Replay").strip(" .-")
    cleaned = re.sub(r"\s+", " ", cleaned)
    return (cleaned or "Replay")[:max_length]


def replay_digest(path: str | Path) -> str:
    h = sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def case_directory(case_id: str) -> Path:
    if not re.fullmatch(r"[a-f0-9]{12,64}", case_id or ""):
        raise ValueError("Invalid case identifier.")
    path = (workspace_root() / case_id).resolve()
    root = workspace_root().resolve()
    if root not in path.parents:
        raise ValueError("Case path escaped the workspace.")
    return path


def create_or_update_case(replay_path: str | Path, analysis: dict[str, Any]) -> dict[str, Any]:
    source = Path(replay_path).expanduser().resolve()
    digest = replay_digest(source)
    case_id = digest[:16]
    target = case_directory(case_id)
    frames = target / "frames"
    target.mkdir(parents=True, exist_ok=True)
    frames.mkdir(parents=True, exist_ok=True)

    stored_replay = target / "replay.SC2Replay"
    if not stored_replay.exists() or stored_replay.stat().st_size != source.stat().st_size:
        shutil.copy2(source, stored_replay)

    replay_meta = analysis.get("replay") or {}
    players = analysis.get("players") or []
    matchup = ""
    if players:
        first_pid = str(players[0].get("pid"))
        matchup = ((analysis.get("analysis_by_player") or {}).get(first_pid) or {}).get("matchup", "")

    manifest = {
        "schema_version": "1.0",
        "case_id": case_id,
        "digest_sha256": digest,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_filename": source.name,
        "display_name": _safe_label(f"{replay_meta.get('map', 'Replay')} {matchup}"),
        "map": replay_meta.get("map"),
        "duration": replay_meta.get("duration"),
        "players": players,
        "replay_file": stored_replay.name,
        "frames_directory": frames.name,
    }
    (target / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    (target / "analysis.json").write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")

    case = {
        "id": case_id,
        "display_name": manifest["display_name"],
        "source_filename": source.name,
        "workspace": str(target),
        "frame_base_url": f"/api/cases/{case_id}/frames",
        "capture_available": None,
    }
    analysis["case"] = case
    # Persist the case metadata in the final analysis file as well.
    (target / "analysis.json").write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")
    return case


def resolve_case_replay(case_id: str) -> Path:
    path = case_directory(case_id) / "replay.SC2Replay"
    if not path.is_file():
        raise FileNotFoundError("Replay case was not found.")
    return path


def resolve_case_frames(case_id: str) -> Path:
    path = case_directory(case_id) / "frames"
    path.mkdir(parents=True, exist_ok=True)
    return path
