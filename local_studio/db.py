"""Local Video Studio: SQLite schema, connection handling, and event logging."""

from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from typing import Any, Iterator

import config
from config import utc_now


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
    except sqlite3.OperationalError as exc:
        if "duplicate column" not in str(exc).lower():
            raise


def init_db() -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    for folder in (config.WORKSPACE_DIR / "inputs", config.WORKSPACE_DIR / "outputs"):
        folder.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("""CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, source_path TEXT NOT NULL,
            output_path TEXT NOT NULL, timeline_json TEXT NOT NULL, caption TEXT NOT NULL,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL, kind TEXT NOT NULL,
            status TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 0,
            payload_json TEXT NOT NULL, result_json TEXT, error_text TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id)
        )""")
        _ensure_column(conn, "jobs", "progress", "INTEGER NOT NULL DEFAULT 0")
        _ensure_column(conn, "jobs", "cancel_requested", "INTEGER NOT NULL DEFAULT 0")
        conn.execute("""CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY, project_id TEXT, job_id TEXT, type TEXT NOT NULL,
            detail_json TEXT NOT NULL, created_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS bot_sessions (
            bot_id TEXT PRIMARY KEY, display_name TEXT NOT NULL,
            last_action TEXT NOT NULL, last_detail_json TEXT NOT NULL,
            last_seen TEXT NOT NULL, created_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS bot_activity (
            id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, action TEXT NOT NULL,
            detail_json TEXT NOT NULL, created_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS edit_method (
            id TEXT PRIMARY KEY, method_json TEXT NOT NULL, updated_by TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS bot_entries (
            id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, display_name TEXT NOT NULL,
            purpose TEXT NOT NULL, task TEXT NOT NULL, joined_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS bot_execution_policies (
            bot_id TEXT PRIMARY KEY, mode TEXT NOT NULL, updated_by TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS project_artifacts (
            id TEXT PRIMARY KEY, project_id TEXT, type TEXT NOT NULL, title TEXT NOT NULL,
            payload_json TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id)
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_project_created ON jobs(project_id, created_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_open_status ON jobs(status, created_at DESC) WHERE status NOT IN ('succeeded', 'failed')")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_project_created ON events(project_id, created_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bot_sessions_last_seen ON bot_sessions(last_seen DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bot_activity_bot_created ON bot_activity(bot_id, created_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bot_entries_joined ON bot_entries(joined_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bot_execution_policies_updated ON bot_execution_policies(updated_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_project_artifacts_project_type_updated ON project_artifacts(project_id, type, updated_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_project_artifacts_type_updated ON project_artifacts(type, updated_at DESC)")
        conn.execute("PRAGMA optimize")


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    value = dict(row)
    for key in ("timeline_json", "payload_json", "result_json", "detail_json"):
        if key in value and value[key]:
            value[key] = json.loads(value[key])
    return value


def event(project_id: str | None, job_id: str | None, kind: str, detail: dict[str, Any]) -> None:
    with db() as conn:
        conn.execute("INSERT INTO events (id, project_id, job_id, type, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?)", (str(uuid.uuid4()), project_id, job_id, kind, json.dumps(detail), utc_now()))


