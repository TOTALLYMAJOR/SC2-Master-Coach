from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any
import json
import os
import re
import sys

from flask import Blueprint, current_app, jsonify, request

from case_workspace import case_directory, workspace_root


master_intel_api = Blueprint("master_intel", __name__, url_prefix="/api/intel")

PACK_SCHEMA_VERSION = "0.1"
MAX_PACK_BYTES = 5 * 1024 * 1024
PACK_ID = re.compile(r"^[a-z0-9][a-z0-9._-]{2,63}$")
VALID_RACES = {"Protoss", "Terran", "Zerg", "Random", "Unknown"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def app_data_root() -> Path:
    override = os.environ.get("SC2_MASTER_COACH_DATA")
    if override:
        root = Path(override).expanduser()
    elif os.name == "nt":
        root = Path(os.environ.get("APPDATA", Path.home())) / "SC2 Master Coach"
    elif sys.platform == "darwin":
        root = Path.home() / "Library" / "Application Support" / "SC2 Master Coach"
    else:
        root = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "SC2 Master Coach"
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def player_pack_root() -> Path:
    root = app_data_root() / "PlayerPacks"
    root.mkdir(parents=True, exist_ok=True)
    return root


def bundled_demo_path() -> Path:
    return Path(current_app.static_folder or "static") / "data" / "master-intel-demo-pack.json"


def _read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Expected a JSON object.")
    return value


def _safe_pack_path(pack_id: str) -> Path:
    if not PACK_ID.fullmatch(pack_id):
        raise ValueError("Pack ID must use lowercase letters, numbers, dots, dashes, or underscores.")
    path = (player_pack_root() / f"{pack_id}.json").resolve()
    if player_pack_root() not in path.parents:
        raise ValueError("Pack path escaped local storage.")
    return path


def validate_player_pack(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("Player pack must be a JSON object.")

    pack_id = str(value.get("pack_id") or "").strip().lower()
    if not PACK_ID.fullmatch(pack_id):
        raise ValueError("pack_id is missing or invalid.")

    title = str(value.get("title") or "").strip()
    if not title:
        raise ValueError("title is required.")

    schema_version = str(value.get("schema_version") or "").strip()
    if schema_version not in {PACK_SCHEMA_VERSION, "1.0"}:
        raise ValueError(f"Unsupported player-pack schema: {schema_version or 'missing'}.")

    players = value.get("players")
    if not isinstance(players, list) or not players:
        raise ValueError("players must contain at least one player record.")
    if len(players) > 250:
        raise ValueError("Player pack contains too many player records.")

    normalized_players: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for index, raw in enumerate(players):
        if not isinstance(raw, dict):
            raise ValueError(f"Player record {index + 1} must be an object.")
        player_id = str(raw.get("player_id") or raw.get("id") or "").strip().lower()
        if not PACK_ID.fullmatch(player_id):
            raise ValueError(f"Player record {index + 1} has an invalid player_id.")
        if player_id in seen_ids:
            raise ValueError(f"Duplicate player_id: {player_id}.")
        seen_ids.add(player_id)

        name = str(raw.get("display_name") or raw.get("name") or "").strip()
        if not name:
            raise ValueError(f"Player record {index + 1} is missing display_name.")

        race = str(raw.get("race") or "Unknown").strip().title()
        if race not in VALID_RACES:
            raise ValueError(f"Player {name} has unsupported race {race}.")

        identity = raw.get("identity") if isinstance(raw.get("identity"), dict) else {}
        verified = bool(identity.get("verified", raw.get("verified", False)))
        confidence = str(identity.get("confidence") or raw.get("identity_confidence") or ("high" if verified else "unverified")).strip().lower()
        if confidence not in {"high", "moderate", "low", "unverified"}:
            confidence = "unverified"

        coverage = raw.get("coverage") if isinstance(raw.get("coverage"), dict) else {}
        dossier = raw.get("dossier") if isinstance(raw.get("dossier"), dict) else {}
        normalized_players.append(
            {
                "player_id": player_id,
                "display_name": name,
                "race": race,
                "aliases": [str(alias).strip() for alias in raw.get("aliases", []) if str(alias).strip()],
                "identity": {"verified": verified, "confidence": confidence},
                "coverage": coverage,
                "dossier": dossier,
                "synthetic": bool(raw.get("synthetic", value.get("synthetic", False))),
            }
        )

    return {
        "schema_version": schema_version,
        "pack_id": pack_id,
        "title": title,
        "description": str(value.get("description") or "").strip(),
        "publisher": str(value.get("publisher") or "Unknown local publisher").strip(),
        "pack_version": str(value.get("pack_version") or "1.0.0").strip(),
        "patch_coverage": value.get("patch_coverage") if isinstance(value.get("patch_coverage"), list) else [],
        "synthetic": bool(value.get("synthetic", False)),
        "players": normalized_players,
        "provenance": value.get("provenance") if isinstance(value.get("provenance"), dict) else {},
    }


def store_player_pack(value: dict[str, Any], *, source_filename: str) -> dict[str, Any]:
    normalized = validate_player_pack(value)
    payload = json.dumps(normalized, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    normalized["local_import"] = {
        "imported_at": utc_now(),
        "source_filename": source_filename,
        "sha256": sha256(payload).hexdigest(),
    }
    path = _safe_pack_path(normalized["pack_id"])
    path.write_text(json.dumps(normalized, indent=2, ensure_ascii=False), encoding="utf-8")
    return pack_summary(normalized)


def pack_summary(pack: dict[str, Any]) -> dict[str, Any]:
    imported = pack.get("local_import") if isinstance(pack.get("local_import"), dict) else {}
    return {
        "pack_id": pack.get("pack_id"),
        "title": pack.get("title"),
        "description": pack.get("description"),
        "publisher": pack.get("publisher"),
        "pack_version": pack.get("pack_version"),
        "patch_coverage": pack.get("patch_coverage") or [],
        "synthetic": bool(pack.get("synthetic")),
        "player_count": len(pack.get("players") or []),
        "imported_at": imported.get("imported_at"),
        "integrity_sha256": imported.get("sha256"),
    }


def load_player_packs() -> list[dict[str, Any]]:
    packs: list[dict[str, Any]] = []
    for path in sorted(player_pack_root().glob("*.json")):
        try:
            packs.append(_read_json(path))
        except (OSError, ValueError, json.JSONDecodeError):
            continue
    return packs


def flatten_players() -> list[dict[str, Any]]:
    players: list[dict[str, Any]] = []
    for pack in load_player_packs():
        summary = pack_summary(pack)
        for row in pack.get("players") or []:
            if not isinstance(row, dict):
                continue
            identity = row.get("identity") if isinstance(row.get("identity"), dict) else {}
            players.append(
                {
                    **row,
                    "pack_id": summary["pack_id"],
                    "pack_title": summary["title"],
                    "pack_version": summary["pack_version"],
                    "pack_synthetic": summary["synthetic"],
                    "patch_coverage": summary["patch_coverage"],
                    "identity_label": "Verified" if identity.get("verified") else "Unverified",
                    "identity_confidence": identity.get("confidence", "unverified"),
                }
            )
    players.sort(key=lambda row: (str(row.get("display_name") or "").lower(), str(row.get("pack_title") or "").lower()))
    return players


def list_recent_cases(limit: int = 20) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    root = workspace_root()
    for path in root.iterdir():
        if not path.is_dir():
            continue
        manifest = path / "manifest.json"
        analysis = path / "analysis.json"
        if not manifest.is_file() or not analysis.is_file():
            continue
        try:
            value = _read_json(manifest)
        except (OSError, ValueError, json.JSONDecodeError):
            continue
        value["case_id"] = value.get("case_id") or path.name
        value["analysis_available"] = True
        value["imported_at"] = value.get("created_at")
        rows.append(value)
    rows.sort(key=lambda row: str(row.get("created_at") or ""), reverse=True)
    return rows[: max(1, min(limit, 100))]


def latest_data_timestamp() -> str | None:
    timestamps = [str(row.get("created_at") or "") for row in list_recent_cases(100)]
    for pack in load_player_packs():
        imported = pack.get("local_import") if isinstance(pack.get("local_import"), dict) else {}
        timestamps.append(str(imported.get("imported_at") or ""))
    rows = sorted((value for value in timestamps if value), reverse=True)
    return rows[0] if rows else None


@master_intel_api.get("/status")
def status():
    recent = list_recent_cases(100)
    packs = load_player_packs()
    return jsonify(
        {
            "ok": True,
            "version": current_app.config.get("APP_VERSION", "unknown"),
            "offline_only": bool(current_app.config.get("OFFLINE_ONLY", True)),
            "network_required": False,
            "automatic_updates": False,
            "connect_policy": "self_only",
            "workspace": str(workspace_root()),
            "data_root": str(app_data_root()),
            "replay_count": len(recent),
            "pack_count": len(packs),
            "player_count": len(flatten_players()),
            "latest_local_data": latest_data_timestamp(),
        }
    )


@master_intel_api.get("/recent")
def recent():
    try:
        limit = int(request.args.get("limit", "12"))
    except ValueError:
        limit = 12
    return jsonify({"ok": True, "games": list_recent_cases(limit)})


@master_intel_api.get("/cases/<case_id>")
def case_detail(case_id: str):
    try:
        directory = case_directory(case_id)
        manifest = _read_json(directory / "manifest.json")
        analysis = _read_json(directory / "analysis.json")
    except (FileNotFoundError, ValueError, OSError, json.JSONDecodeError):
        return jsonify({"ok": False, "error": "Replay analysis was not found."}), 404
    return jsonify({"ok": True, "manifest": manifest, "analysis": analysis})


@master_intel_api.get("/player-packs")
def player_packs():
    return jsonify({"ok": True, "packs": [pack_summary(pack) for pack in load_player_packs()]})


@master_intel_api.get("/players")
def players():
    return jsonify({"ok": True, "players": flatten_players()})


@master_intel_api.post("/player-packs/import")
def import_player_pack():
    upload = request.files.get("pack")
    if upload is None:
        return jsonify({"ok": False, "error": "Choose a local player-pack JSON file."}), 400
    filename = Path(upload.filename or "player-pack.json").name
    if not filename.lower().endswith((".json", ".sc2pack")):
        return jsonify({"ok": False, "error": "Expected a .json or .sc2pack file."}), 400
    payload = upload.read(MAX_PACK_BYTES + 1)
    if len(payload) > MAX_PACK_BYTES:
        return jsonify({"ok": False, "error": "Player pack exceeds the 5 MB Milestone 0 safety limit."}), 413
    try:
        decoded = json.loads(payload.decode("utf-8"))
        result = store_player_pack(decoded, source_filename=filename)
    except UnicodeDecodeError:
        return jsonify({"ok": False, "error": "Player pack must be UTF-8 JSON."}), 400
    except (json.JSONDecodeError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 422
    return jsonify({"ok": True, "pack": result})


@master_intel_api.post("/demo/install")
def install_demo():
    path = bundled_demo_path()
    if not path.is_file():
        return jsonify({"ok": False, "error": "Bundled demonstration pack is missing."}), 503
    try:
        result = store_player_pack(_read_json(path), source_filename=path.name)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return jsonify({"ok": False, "error": f"Bundled demonstration pack is invalid: {exc}"}), 503
    return jsonify({"ok": True, "pack": result})


@master_intel_api.delete("/player-packs/<pack_id>")
def remove_pack(pack_id: str):
    try:
        path = _safe_pack_path(pack_id)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    if not path.exists():
        return jsonify({"ok": False, "error": "Player pack was not found."}), 404
    path.unlink()
    return jsonify({"ok": True, "removed": pack_id})


@master_intel_api.get("/offline-policy")
def offline_policy():
    return jsonify(
        {
            "ok": True,
            "guarantee": "Core journeys run without internet access. No replay, player pack, or coaching record is uploaded.",
            "automatic_update_checks": False,
            "manual_update_steps": [
                "Obtain a trusted installer or portable package outside the application.",
                "Open Settings and select the local package for inspection.",
                "Close SC2 Master Coach before running the installer or replacing the portable folder.",
                "Keep a backup of the local data directory before major upgrades.",
            ],
        }
    )
