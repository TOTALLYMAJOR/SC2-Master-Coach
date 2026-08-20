from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path


SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def default_database_path(explicit: str | Path | None = None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", Path.home()))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return (base / "SC2 Master Coach" / "strategy_science.db").resolve()


def open_database(path: str | Path | None = None) -> sqlite3.Connection:
    db_path = default_database_path(path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path, timeout=5.0)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


def initialize_database(path: str | Path | None = None) -> Path:
    db_path = default_database_path(path)
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    with open_database(db_path) as connection:
        connection.executescript(schema)
        connection.commit()
    return db_path


def database_health(path: str | Path | None = None) -> dict[str, object]:
    db_path = initialize_database(path)
    try:
        with open_database(db_path) as connection:
            user_version = int(connection.execute("PRAGMA user_version").fetchone()[0])
            table_count = int(
                connection.execute(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
                ).fetchone()[0]
            )
            connection.execute("SELECT 1").fetchone()
        return {
            "ok": True,
            "path": str(db_path),
            "schema_version": user_version,
            "table_count": table_count,
        }
    except sqlite3.Error as exc:
        return {
            "ok": False,
            "path": str(db_path),
            "error": str(exc),
        }
