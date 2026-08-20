from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from .database import initialize_database, open_database


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_json(value: Mapping[str, Any] | list[Any] | dict[str, Any]) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def payload_hash(value: Mapping[str, Any] | list[Any] | dict[str, Any]) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


class ScienceRepository:
    def __init__(self, database_path: str | Path | None = None) -> None:
        self.database_path = initialize_database(database_path)

    def register_model(
        self,
        *,
        model_name: str,
        model_version: str,
        capability_id: str,
        deterministic: bool,
        checksum: str | None = None,
    ) -> None:
        with open_database(self.database_path) as connection:
            connection.execute(
                """
                INSERT INTO science_model_versions(
                    model_name, model_version, capability_id, deterministic, checksum, installed_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(model_name, model_version) DO UPDATE SET
                    capability_id=excluded.capability_id,
                    deterministic=excluded.deterministic,
                    checksum=COALESCE(excluded.checksum, science_model_versions.checksum)
                """,
                (
                    model_name,
                    model_version,
                    capability_id,
                    1 if deterministic else 0,
                    checksum,
                    utc_now(),
                ),
            )
            connection.commit()

    def start_run(
        self,
        *,
        run_id: str,
        request_id: str,
        capability_id: str,
        game_patch: str,
        ruleset_version: str,
        model_name: str,
        model_version: str,
        session_id: str | None,
        event_sequence: int,
        seed: int | None,
        request_payload: Mapping[str, Any],
    ) -> None:
        request_json = canonical_json(dict(request_payload))
        with open_database(self.database_path) as connection:
            connection.execute(
                """
                INSERT INTO science_runs(
                    run_id, request_id, capability_id, status, game_patch, ruleset_version,
                    model_name, model_version, session_id, event_sequence, seed, input_hash,
                    warnings_json, created_at
                ) VALUES (?, ?, ?, 'running', ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)
                """,
                (
                    run_id,
                    request_id,
                    capability_id,
                    game_patch,
                    ruleset_version,
                    model_name,
                    model_version,
                    session_id,
                    event_sequence,
                    seed,
                    hashlib.sha256(request_json.encode("utf-8")).hexdigest(),
                    utc_now(),
                ),
            )
            connection.execute(
                "INSERT INTO science_run_inputs(run_id, request_json) VALUES (?, ?)",
                (run_id, request_json),
            )
            connection.commit()

    def complete_run(
        self,
        *,
        run_id: str,
        advisory: Mapping[str, Any],
        duration_ms: int,
        proof_items: list[Mapping[str, Any]],
        warnings: list[str] | None = None,
    ) -> None:
        advisory_json = canonical_json(dict(advisory))
        with open_database(self.database_path) as connection:
            connection.execute(
                """
                UPDATE science_runs
                   SET status='complete', output_hash=?, duration_ms=?, warnings_json=?, completed_at=?
                 WHERE run_id=?
                """,
                (
                    hashlib.sha256(advisory_json.encode("utf-8")).hexdigest(),
                    int(duration_ms),
                    canonical_json(warnings or []),
                    utc_now(),
                    run_id,
                ),
            )
            connection.execute(
                "INSERT INTO science_run_outputs(run_id, advisory_json) VALUES (?, ?)",
                (run_id, advisory_json),
            )
            for index, item in enumerate(proof_items):
                connection.execute(
                    """
                    INSERT INTO science_proof_items(
                        proof_item_id, run_id, claim, evidence_ids_json, rule_ids_json, limitation
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        f"{run_id}-proof-{index + 1}",
                        run_id,
                        str(item.get("claim") or ""),
                        canonical_json(list(item.get("evidence_ids") or [])),
                        canonical_json(list(item.get("rule_ids") or [])),
                        item.get("limitation"),
                    ),
                )
            connection.commit()

    def fail_run(self, *, run_id: str, status: str, error_code: str, warning: str) -> None:
        with open_database(self.database_path) as connection:
            connection.execute(
                """
                UPDATE science_runs
                   SET status=?, error_code=?, warnings_json=?, completed_at=?
                 WHERE run_id=?
                """,
                (status, error_code, canonical_json([warning]), utc_now(), run_id),
            )
            connection.commit()

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        with open_database(self.database_path) as connection:
            row = connection.execute(
                """
                SELECT r.*, i.request_json, o.advisory_json
                  FROM science_runs r
             LEFT JOIN science_run_inputs i ON i.run_id = r.run_id
             LEFT JOIN science_run_outputs o ON o.run_id = r.run_id
                 WHERE r.run_id = ?
                """,
                (run_id,),
            ).fetchone()
        if row is None:
            return None
        result = dict(row)
        for key in ("request_json", "advisory_json", "warnings_json"):
            raw = result.get(key)
            if raw:
                try:
                    result[key.removesuffix("_json")] = json.loads(raw)
                except json.JSONDecodeError:
                    result[key.removesuffix("_json")] = None
        return result
