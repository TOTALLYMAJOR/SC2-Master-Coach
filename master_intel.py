from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
import ipaddress
import json
import os
import re
import subprocess
import sys
import tempfile

from flask import Blueprint, current_app, jsonify, request

from case_workspace import (
    CaseIntegrityError,
    case_directory,
    load_case_records,
    persist_case_records,
    workspace_root,
)
from replay_intelligence import build_case_learning_index, build_case_learning_summary


master_intel_api = Blueprint("master_intel", __name__, url_prefix="/api/intel")

PACK_SCHEMA_VERSION = "0.1"
MAX_PACK_BYTES = 5 * 1024 * 1024
PACK_ID = re.compile(r"^[a-z0-9][a-z0-9._-]{2,63}$")
VALID_RACES = {"Protoss", "Terran", "Zerg", "Random", "Unknown"}


def _loopback_address(value: str | None) -> bool:
    try:
        return ipaddress.ip_address(str(value or "").split("%", 1)[0]).is_loopback
    except ValueError:
        return str(value or "").lower() == "localhost"


@master_intel_api.before_app_request
def enforce_loopback_browser_authority():
    """Reject DNS-rebinding and cross-origin mutation of the local application."""
    if not _loopback_address(request.remote_addr):
        return jsonify({"ok": False, "error": "The local service accepts loopback requests only."}), 403
    try:
        host = urlsplit(request.host_url).hostname
    except ValueError:
        host = None
    if not _loopback_address(host):
        return jsonify({"ok": False, "error": "The request Host is not a loopback address."}), 403
    fetch_site = str(request.headers.get("Sec-Fetch-Site") or "").lower()
    if fetch_site == "cross-site":
        return jsonify({"ok": False, "error": "Cross-site browser requests are not allowed."}), 403
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin = request.headers.get("Origin")
        if origin and origin.rstrip("/").lower() != request.host_url.rstrip("/").lower():
            return jsonify({"ok": False, "error": "Cross-origin local mutations are not allowed."}), 403
    return None


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


def _atomic_write_json(path: Path, value: dict[str, Any]) -> None:
    """Commit one local JSON record only after its complete payload reaches disk."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temporary = Path(handle.name)
            json.dump(value, handle, indent=2, ensure_ascii=False)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.replace(path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


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
        publisher_declared_verified = bool(
            identity.get("publisher_declared_verified", identity.get("verified", raw.get("verified", False)))
        )
        publisher_declared_confidence = str(
            identity.get("publisher_declared_confidence")
            or identity.get("confidence")
            or raw.get("identity_confidence")
            or ("high" if publisher_declared_verified else "unverified")
        ).strip().lower()
        if publisher_declared_confidence not in {"high", "moderate", "low", "unverified"}:
            publisher_declared_confidence = "unverified"

        coverage = raw.get("coverage") if isinstance(raw.get("coverage"), dict) else {}
        dossier = raw.get("dossier") if isinstance(raw.get("dossier"), dict) else {}
        normalized_players.append(
            {
                "player_id": player_id,
                "display_name": name,
                "race": race,
                "aliases": [str(alias).strip() for alias in raw.get("aliases", []) if str(alias).strip()],
                "identity": {
                    "verified": False,
                    "publisher_declared_verified": publisher_declared_verified,
                    "confidence": "unverified",
                    "publisher_declared_confidence": publisher_declared_confidence,
                    "claim_source": "publisher_declared",
                    "independently_verified": False,
                },
                "coverage": coverage,
                "dossier": dossier,
                "synthetic": bool(value.get("synthetic", False) or raw.get("synthetic", False)),
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
    incoming_ids = {row["player_id"] for row in normalized["players"]}
    installed_ids = {
        row["player_id"]
        for pack in load_player_packs()
        if pack.get("pack_id") != normalized["pack_id"]
        for row in pack.get("players") or []
        if isinstance(row, dict) and row.get("player_id")
    }
    collisions = sorted(incoming_ids & installed_ids)
    if collisions:
        raise ValueError(
            "player_id must be unique across installed packs; conflicting ID: "
            + collisions[0]
        )
    payload = json.dumps(normalized, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    normalized["local_import"] = {
        "imported_at": utc_now(),
        "source_filename": source_filename,
        "sha256": sha256(payload).hexdigest(),
    }
    path = _safe_pack_path(normalized["pack_id"])
    _atomic_write_json(path, normalized)
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
            stored = _read_json(path)
            imported = stored.get("local_import") if isinstance(stored.get("local_import"), dict) else {}
            claimed_digest = str(imported.get("sha256") or "")
            unsigned = {key: value for key, value in stored.items() if key != "local_import"}
            normalized = validate_player_pack(unsigned)
            payload = json.dumps(normalized, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
            if not claimed_digest or sha256(payload).hexdigest() != claimed_digest:
                continue
            normalized["local_import"] = imported
            packs.append(normalized)
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
            publisher_claim = bool(
                identity.get("publisher_declared_verified", identity.get("verified", False))
            ) and not bool(identity.get("independently_verified", False))
            players.append(
                {
                    **row,
                    "pack_id": summary["pack_id"],
                    "pack_title": summary["title"],
                    "pack_version": summary["pack_version"],
                    "pack_synthetic": summary["synthetic"],
                    "patch_coverage": summary["patch_coverage"],
                    "identity_label": "Publisher-declared" if publisher_claim else "Unverified",
                    "identity_trust": "publisher_declared" if publisher_claim else "unverified",
                    "identity_confidence": identity.get("confidence", "unverified"),
                    "publisher_declared_confidence": identity.get("publisher_declared_confidence", "unverified"),
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
        try:
            value, analyzed, _learning = load_case_records(path.name)
        except (OSError, ValueError, CaseIntegrityError):
            # Preserve recovery discoverability without trusting any failed metadata.
            # The directory name is already a bounded local case identifier; no
            # replay-derived labels, players, patch, or matchup escape this branch.
            if re.fullmatch(r"[a-f0-9]{12,64}", path.name) and (
                path / "replay.SC2Replay"
            ).is_file():
                rows.append({
                    "case_id": path.name,
                    "display_name": "Replay needs re-import",
                    "analysis_available": False,
                    "integrity_status": "failed",
                    "recovery_required": True,
                    "recovery_action": "reimport_original_replay",
                    "imported_at": None,
                    "created_at": None,
                    "patch": None,
                    "matchup": None,
                    "map": None,
                })
            continue
        source = analyzed.get("source") if isinstance(analyzed.get("source"), dict) else {}
        value["case_id"] = value.get("case_id") or path.name
        value["analysis_available"] = True
        value["integrity_status"] = "verified_local"
        value["recovery_required"] = False
        value["imported_at"] = value.get("created_at")
        value["source_evidence_class"] = str(source.get("evidence_class") or "unknown")
        rows.append(value)
    rows.sort(key=lambda row: str(row.get("created_at") or ""), reverse=True)
    return rows[: max(1, min(limit, 100))]


def _case_player_selection(case_id: str) -> dict[str, Any] | None:
    try:
        value = _read_json(case_directory(case_id) / "player-selection.json")
    except (FileNotFoundError, ValueError, OSError, json.JSONDecodeError):
        return None
    pid = str(value.get("selected_player_pid") or "").strip()
    return value if (
        value.get("schema_version") == "1.0"
        and value.get("case_id") == case_id
        and value.get("authority") == "player_report"
        and pid
    ) else None


def _played_at(value: Any) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def load_learning_indexes(
    *, exclude_case_id: str | None = None, before_played_at: Any = None
) -> list[dict[str, Any]]:
    """Load only fingerprints whose local replay ownership was explicitly reported."""
    target_played_at = _played_at(before_played_at)
    if target_played_at is None:
        return []
    indexes = []
    for row in list_recent_cases(100):
        case_id = str(row.get("case_id") or "")
        if not case_id or case_id == exclude_case_id:
            continue
        selection = _case_player_selection(case_id)
        if not selection:
            continue
        try:
            _manifest, analysis, _learning = load_case_records(case_id)
            candidate_played_at = _played_at((analysis.get("replay") or {}).get("date"))
            if candidate_played_at is None or candidate_played_at >= target_played_at:
                continue
            value = build_case_learning_index(analysis, selection["selected_player_pid"])
        except (FileNotFoundError, ValueError, OSError, json.JSONDecodeError, CaseIntegrityError):
            continue
        if value.get("status") == "calculated":
            indexes.append({
                **value,
                "case_id": case_id,
                "played_at": candidate_played_at.isoformat().replace("+00:00", "Z"),
            })
    return indexes


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


def _platform_label() -> str:
    if os.name == "nt":
        return "Windows"
    if sys.platform == "darwin":
        return "macOS"
    return "Linux"


def _optional_readiness() -> dict[str, dict[str, Any]]:
    optional: dict[str, dict[str, Any]] = {}
    try:
        from sc2_frame_capture import capture_status

        capture = capture_status()
        optional["frame_capture"] = {
            "status": "ready" if capture.get("available") else "unavailable",
            "manual_fallback": True,
        }
    except Exception:
        optional["frame_capture"] = {"status": "unavailable", "manual_fallback": True}
    try:
        from python_strategy_science.storage import database_health

        science = database_health()
        optional["strategy_science"] = {
            "status": "ready" if science.get("ok") else "unavailable",
            "state_authority": "strategic_os",
            "manual_fallback": True,
        }
    except Exception:
        optional["strategy_science"] = {
            "status": "unavailable", "state_authority": "strategic_os", "manual_fallback": True
        }
    try:
        from python_strategy_science.voice import voice_status

        voice = voice_status()
        optional["voice"] = {
            "status": "ready" if voice.get("ok") else "unavailable",
            "offline": True,
            "manual_fallback": True,
        }
    except Exception:
        optional["voice"] = {"status": "unavailable", "offline": True, "manual_fallback": True}
    return optional


def _storage_write_status(root: Path) -> str:
    temporary: Path | None = None
    try:
        root.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=root, prefix=".sc2mc-write-probe-", delete=False
        ) as handle:
            temporary = Path(handle.name)
            handle.write(b"local-storage-probe")
            handle.flush()
            os.fsync(handle.fileno())
        temporary.unlink()
        temporary = None
        return "ready"
    except OSError:
        return "unavailable"
    finally:
        if temporary is not None:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                pass


@master_intel_api.get("/support-report")
def support_report():
    """Return an allowlisted diagnostic summary without local paths or player data."""
    try:
        recent = list_recent_cases(100)
        packs = load_player_packs()
        players = flatten_players()
        replay_storage_status = _storage_write_status(workspace_root())
        player_library_status = _storage_write_status(player_pack_root())
        parser_ready = True
        try:
            import sc2reader  # noqa: F401
        except Exception:
            parser_ready = False
        return jsonify(
            {
                "schema_version": "1.0",
                "generated_at": utc_now(),
                "application": {
                    "version": current_app.config.get("APP_VERSION", "unknown"),
                    "platform": _platform_label(),
                    "offline_only": bool(current_app.config.get("OFFLINE_ONLY", True)),
                },
                "core": {
                    "local_service": "ready",
                    "replay_parser": "ready" if parser_ready else "unavailable",
                    "replay_storage": {"status": replay_storage_status, "case_count": len(recent)},
                    "player_library": {
                        "status": player_library_status, "pack_count": len(packs), "player_count": len(players)
                    },
                },
                "optional": _optional_readiness(),
                "privacy": {
                    "filesystem_paths_included": False,
                    "replay_or_player_identity_included": False,
                    "raw_audio_included": False,
                },
            }
        )
    except Exception:
        return jsonify({"ok": False, "error": "The local support report could not be generated."}), 503


@master_intel_api.post("/storage/open")
def open_storage():
    payload = request.get_json(silent=True) or {}
    target = payload.get("target")
    roots = {"replays": workspace_root, "application": app_data_root}
    if target not in roots:
        return jsonify({"ok": False, "error": "Choose the replay or application data folder."}), 400
    try:
        directory = roots[target]().resolve()
        if os.name == "nt":
            os.startfile(str(directory))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(directory)])
        else:
            subprocess.Popen(["xdg-open", str(directory)])
        return jsonify({"ok": True, "target": target})
    except Exception:
        return jsonify(
            {"ok": False, "error": "The folder could not be opened. Copy its path from Settings instead."}
        ), 422


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
        manifest, analysis, _learning_index = load_case_records(case_id)
    except CaseIntegrityError:
        return jsonify({
            "ok": False,
            "error": "Replay case integrity check failed. Re-import the original replay to repair it.",
        }), 409
    except (FileNotFoundError, ValueError, OSError, json.JSONDecodeError):
        return jsonify({"ok": False, "error": "Replay analysis was not found."}), 404
    stored_selection = _case_player_selection(case_id)
    selected_player_pid = str((stored_selection or {}).get("selected_player_pid") or "")
    analyses = analysis.get("analysis_by_player") or {}
    selection_recovery_required = bool(selected_player_pid and selected_player_pid not in analyses)
    if selected_player_pid and selected_player_pid not in analyses:
        selected_player_pid = ""
    if selected_player_pid:
        learning = build_case_learning_summary(
            analysis,
            load_learning_indexes(
                exclude_case_id=case_id,
                before_played_at=(analysis.get("replay") or {}).get("date"),
            ),
            target_player_pid=selected_player_pid,
        )
    else:
        learning = {
            "status": "withheld",
            "reason": "Choose which replay player is you before personal coaching is calculated.",
            "requires_player_selection": True,
        }
    return jsonify(
        {
            "ok": True,
            "manifest": manifest,
            "analysis": analysis,
            "learning": learning,
            "selected_player_pid": selected_player_pid or None,
            "selection_authority": "player_report" if selected_player_pid else "withheld",
            "selection_recovery_required": selection_recovery_required,
        }
    )


@master_intel_api.post("/cases/<case_id>/player-selection")
def select_case_player(case_id: str):
    """Persist one local player-reported replay identity for longitudinal learning."""
    try:
        directory = case_directory(case_id)
        manifest, analysis, _learning_index = load_case_records(case_id)
    except CaseIntegrityError:
        return jsonify({
            "ok": False,
            "error": "Replay case integrity check failed. Re-import the original replay to repair it.",
        }), 409
    except (FileNotFoundError, ValueError, OSError, json.JSONDecodeError):
        return jsonify({"ok": False, "error": "Replay analysis was not found."}), 404
    payload = request.get_json(silent=True) or {}
    player_pid = str(payload.get("player_pid") or "").strip()
    if not player_pid or player_pid not in (analysis.get("analysis_by_player") or {}):
        return jsonify({"ok": False, "error": "Choose an available replay player."}), 400
    selection = {
        "schema_version": "1.0",
        "case_id": case_id,
        "selected_player_pid": player_pid,
        "authority": "player_report",
        "selected_at": utc_now(),
    }
    index = build_case_learning_index(analysis, player_pid)
    try:
        # Refresh all case-integrity bindings before the player report commit marker.
        persist_case_records(case_id, manifest, analysis, index)
        _atomic_write_json(directory / "player-selection.json", selection)
    except (OSError, CaseIntegrityError):
        return jsonify({"ok": False, "error": "Replay identity could not be saved locally."}), 503
    return jsonify({"ok": True, "selection": selection})


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
            "network_required": False,
            "connect_policy": "self_only",
            "manual_update_steps": [
                "Obtain a trusted installer or portable package outside the application.",
                "Open Settings and select the local package to review its filename, type, and size.",
                "Close SC2 Master Coach before running the installer or replacing the portable folder.",
                "Keep a backup of the local data directory before major upgrades.",
            ],
        }
    )
