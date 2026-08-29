from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any
import json
import os
import re
import shutil
import tempfile
import uuid

from replay_intelligence import build_case_learning_index

APP_FOLDER = "SC2 Master Coach"


class CaseIntegrityError(ValueError):
    """A persisted replay case is incomplete, corrupt, or internally inconsistent."""


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


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _existing_created_at(case_id: str, digest: str) -> str | None:
    try:
        value, _, _ = load_case_records(case_id)
    except (FileNotFoundError, CaseIntegrityError, OSError, ValueError):
        return None
    if value.get("case_id") != case_id or value.get("digest_sha256") != digest:
        return None
    created_at = value.get("created_at")
    return str(created_at) if created_at else None


def _json_bytes(value: dict[str, Any]) -> bytes:
    return json.dumps(value, indent=2, ensure_ascii=False).encode("utf-8")


def _atomic_write_json(path: Path, value: dict[str, Any]) -> None:
    """Durably replace one JSON object without exposing a partial file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", delete=False
        ) as handle:
            temporary = Path(handle.name)
            handle.write(_json_bytes(value))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def _manifest_identity_digest(manifest: dict[str, Any]) -> str:
    identity_payload = {key: value for key, value in manifest.items() if key != "metadata_files"}
    return sha256(_json_bytes(identity_payload)).hexdigest()


def _record_identity(
    case_id: str, digest: str, revision: str, manifest_digest: str
) -> dict[str, str]:
    return {
        "case_id": case_id,
        "digest_sha256": digest,
        "metadata_revision": revision,
        "manifest_sha256": manifest_digest,
    }


def persist_case_records(
    case_id: str,
    manifest: dict[str, Any],
    analysis: dict[str, Any],
    learning_index: dict[str, Any],
) -> None:
    """Write one coherent case generation; the manifest is its commit marker.

    Each file replacement is atomic. The shared revision and manifest hashes make
    an interrupted multi-file update fail closed on the next production read.
    """
    target = case_directory(case_id)
    digest = str(manifest.get("digest_sha256") or "")
    if not re.fullmatch(r"[a-f0-9]{64}", digest) or digest[:16] != case_id:
        raise CaseIntegrityError("Case identity does not match its replay digest.")
    replay_path = target / "replay.SC2Replay"
    if not replay_path.is_file() or replay_digest(replay_path) != digest:
        raise CaseIntegrityError("Stored replay does not match the case digest.")
    source = analysis.get("source") if isinstance(analysis.get("source"), dict) else {}
    case = analysis.get("case") if isinstance(analysis.get("case"), dict) else {}
    if source.get("digest_sha256") != digest or case.get("id") != case_id:
        raise CaseIntegrityError("Analysis identity does not match the replay case.")

    revision = uuid.uuid4().hex
    manifest["schema_version"] = "1.1"
    manifest["metadata_revision"] = revision
    manifest.pop("metadata_files", None)
    identity = _record_identity(case_id, digest, revision, _manifest_identity_digest(manifest))
    analysis["_case_integrity"] = dict(identity)
    learning_index["_case_integrity"] = dict(identity)
    manifest["metadata_files"] = {
        "analysis.json": {"sha256": sha256(_json_bytes(analysis)).hexdigest()},
        "learning-index.json": {"sha256": sha256(_json_bytes(learning_index)).hexdigest()},
    }

    # The manifest is replaced last because it identifies the committed generation.
    _atomic_write_json(target / "learning-index.json", learning_index)
    _atomic_write_json(target / "analysis.json", analysis)
    _atomic_write_json(target / "manifest.json", manifest)


def load_case_records(case_id: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    """Read a replay case only when replay and metadata identities are coherent."""
    target = case_directory(case_id)
    paths = {
        "manifest.json": target / "manifest.json",
        "analysis.json": target / "analysis.json",
        "learning-index.json": target / "learning-index.json",
    }
    if not any(path.exists() for path in paths.values()):
        raise FileNotFoundError("Replay case was not found.")
    raw: dict[str, bytes] = {}
    values: dict[str, dict[str, Any]] = {}
    for name, path in paths.items():
        try:
            raw[name] = path.read_bytes()
            value = json.loads(raw[name].decode("utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CaseIntegrityError(f"{name} is missing or corrupt.") from exc
        if not isinstance(value, dict):
            raise CaseIntegrityError(f"{name} must contain a JSON object.")
        values[name] = value

    manifest = values["manifest.json"]
    analysis = values["analysis.json"]
    learning = values["learning-index.json"]
    digest = str(manifest.get("digest_sha256") or "")
    revision = str(manifest.get("metadata_revision") or "")
    if (
        manifest.get("schema_version") != "1.1"
        or manifest.get("case_id") != case_id
        or not re.fullmatch(r"[a-f0-9]{64}", digest)
        or digest[:16] != case_id
        or not re.fullmatch(r"[a-f0-9]{32}", revision)
        or manifest.get("replay_file") != "replay.SC2Replay"
        or manifest.get("learning_index_file") != "learning-index.json"
    ):
        raise CaseIntegrityError("Manifest identity is invalid.")

    replay_path = target / "replay.SC2Replay"
    if not replay_path.is_file() or replay_digest(replay_path) != digest:
        raise CaseIntegrityError("Stored replay does not match the manifest digest.")

    expected_identity = _record_identity(
        case_id, digest, revision, _manifest_identity_digest(manifest)
    )
    if analysis.get("_case_integrity") != expected_identity:
        raise CaseIntegrityError("Analysis identity does not match the case manifest.")
    if learning.get("_case_integrity") != expected_identity:
        raise CaseIntegrityError("Learning-index identity does not match the case manifest.")
    source = analysis.get("source") if isinstance(analysis.get("source"), dict) else {}
    case = analysis.get("case") if isinstance(analysis.get("case"), dict) else {}
    if source.get("digest_sha256") != digest or case.get("id") != case_id:
        raise CaseIntegrityError("Analysis identity does not match the stored replay.")
    if learning.get("digest_sha256") not in {None, digest}:
        raise CaseIntegrityError("Learning-index digest does not match the stored replay.")

    metadata_files = manifest.get("metadata_files")
    if not isinstance(metadata_files, dict):
        raise CaseIntegrityError("Manifest metadata hashes are missing.")
    for name in ("analysis.json", "learning-index.json"):
        entry = metadata_files.get(name)
        claimed = str(entry.get("sha256") or "") if isinstance(entry, dict) else ""
        if not re.fullmatch(r"[a-f0-9]{64}", claimed):
            raise CaseIntegrityError(f"Manifest hash for {name} is invalid.")
        if sha256(raw[name]).hexdigest() != claimed:
            raise CaseIntegrityError(f"{name} does not match the committed manifest hash.")
    return manifest, analysis, learning


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
    stored_digest = replay_digest(stored_replay) if stored_replay.is_file() else None
    if stored_digest != digest:
        temporary_replay: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                dir=target, prefix=".replay-copy-", suffix=".SC2Replay", delete=False
            ) as handle:
                temporary_replay = Path(handle.name)
            shutil.copy2(source, temporary_replay)
            if replay_digest(temporary_replay) != digest:
                raise OSError("Copied replay digest did not match the authorized source.")
            os.replace(temporary_replay, stored_replay)
            temporary_replay = None
        finally:
            if temporary_replay is not None:
                temporary_replay.unlink(missing_ok=True)
    if replay_digest(stored_replay) != digest:
        raise OSError("Stored replay digest did not match the authorized source.")

    replay_meta = analysis.get("replay") or {}
    players = analysis.get("players") or []
    matchup = ""
    if players:
        first_pid = str(players[0].get("pid"))
        matchup = ((analysis.get("analysis_by_player") or {}).get(first_pid) or {}).get("matchup", "")

    patch = (
        replay_meta.get("patch")
        or replay_meta.get("game_version")
        or replay_meta.get("gameVersion")
        or replay_meta.get("version")
        or replay_meta.get("release")
    )
    now = _utc_now()
    analysis_source = analysis.setdefault("source", {})
    analysis_source["digest_sha256"] = digest
    analysis_source["ingested_at"] = now
    for player_analysis in (analysis.get("analysis_by_player") or {}).values():
        hard_data_source = (
            (player_analysis.get("hard_data") or {})
            .get("fact_envelope", {})
            .get("source")
        )
        if isinstance(hard_data_source, dict):
            hard_data_source["digest_sha256"] = digest
            hard_data_source["ingested_at"] = now
    learning_index = build_case_learning_index(analysis)
    learning_index_file = "learning-index.json"
    manifest = {
        "schema_version": "1.1",
        "case_id": case_id,
        "digest_sha256": digest,
        "created_at": _existing_created_at(case_id, digest) or now,
        "updated_at": now,
        "source_filename": source.name,
        "display_name": _safe_label(f"{replay_meta.get('map', 'Replay')} {matchup}"),
        "map": replay_meta.get("map"),
        "duration": replay_meta.get("duration"),
        "patch": patch,
        "game_version": patch,
        "matchup": matchup or None,
        "players": players,
        "replay_file": stored_replay.name,
        "frames_directory": frames.name,
        "learning_index_file": learning_index_file,
    }
    case = {
        "id": case_id,
        "display_name": manifest["display_name"],
        "source_filename": source.name,
        "workspace": str(target),
        "frame_base_url": f"/api/cases/{case_id}/frames",
        "capture_available": None,
        "patch": patch,
        "matchup": matchup or None,
    }
    analysis["case"] = case
    persist_case_records(case_id, manifest, analysis, learning_index)
    return case


def resolve_case_replay(case_id: str) -> Path:
    path = case_directory(case_id) / "replay.SC2Replay"
    load_case_records(case_id)
    return path


def resolve_case_frames(case_id: str) -> Path:
    path = case_directory(case_id) / "frames"
    path.mkdir(parents=True, exist_ok=True)
    return path
