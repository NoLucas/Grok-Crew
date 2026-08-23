"""Local Video Studio: local SQLite jobs, MoviePy rendering, and optional automatic Instagram upload."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sqlite3
import subprocess
import time
import uuid
from concurrent.futures import Future, ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Iterator
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
WORKSPACE_DIR = Path(os.getenv("LOCAL_STUDIO_WORKSPACE", BASE_DIR / "workspace")).resolve()
DB_PATH = DATA_DIR / "studio.db"
BOT_GUIDE_PATH = BASE_DIR / "bot-guide.json"
BOT_GUIDE_KO_PATH = BASE_DIR / "bot-guide.ko.json"
TERMINAL_CLI_PATH = BASE_DIR / "grok_crew.py"
ALLOWED_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}
SITE_BASE_URL = "http://localhost:3000"
BROWSER_PAGE_PATHS = {"/", "/edit", "/cut", "/production", "/operations", "/bots", "/bot-guide", "/terminal", "/library", "/agent", "/connect", "/packet", "/gates", "/export", "/privacy"}
PUBLIC_GET_PATHS = frozenset({"/health", "/api/terminal-contract", "/api/bot-guide", "/api/bot-entry", "/downloads/grok-crew.py"})
DEFAULT_EDIT_METHOD = {
    "schema": "local-video-workspace.edit-method/v1",
    "hook_strategy": "payoff_first",
    "pacing": "tight",
    "filler_policy": "remove",
    "caption_mode": "burn_in",
    "reframe_anchor": "center",
    "look": "natural",
    "audio_policy": "normalize",
    "speed": 1.0,
    "fps": 30,
    "quality": "balanced",
}
BOT_ENTRY_SCHEMA = "local-video-workspace.bot-entry/v1"
PROJECT_BUNDLE_SCHEMA = "local-video-workspace.project-bundle/v1"
ARTIFACT_TYPES = {"audio_plan", "bot_task", "brand_kit", "cut_map", "edit_variant", "media_inspection", "overlay_slots", "performance_note", "preflight_report", "project_memory", "quality_report"}
EXECUTION_MODES = {"auto_local", "approval_required"}
RENDER_EXECUTOR = ThreadPoolExecutor(max_workers=max(1, int(os.getenv("LOCAL_STUDIO_RENDER_WORKERS", "1"))))
PLATFORM_PRESETS = {
    "reels_tiktok_shorts": {"width": 1080, "height": 1920, "label": "Reels / TikTok / Shorts (9:16)"},
    "feed_square": {"width": 1080, "height": 1080, "label": "Feed / Square (1:1)"},
    "landscape_x": {"width": 1920, "height": 1080, "label": "Landscape / X (16:9)"},
}
QUALITY_PRESETS = {
    "fast_draft": {"quality": "compact", "fps": 24},
    "balanced": {"quality": "balanced", "fps": 30},
    "high_quality": {"quality": "high", "fps": 30},
    "archive": {"quality": "high", "fps": 60},
}
CAPTION_LAYOUT_PRESETS = {
    "bottom_bold": {"caption_y": 78, "caption_size": 84, "caption_stroke": 4, "caption_bg": True, "caption_bg_color": "#000000"},
    "top_minimal": {"caption_y": 48, "caption_size": 52, "caption_stroke": 1, "caption_bg": False},
    "subtitle_classic": {"caption_y": 80, "caption_size": 58, "caption_stroke": 2, "caption_bg": True, "caption_bg_color": "#00000090"},
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_dotenv() -> None:
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
    except sqlite3.OperationalError as exc:
        if "duplicate column" not in str(exc).lower():
            raise


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for folder in (WORKSPACE_DIR / "inputs", WORKSPACE_DIR / "outputs"):
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
    conn = sqlite3.connect(DB_PATH)
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


def workspace_path(value: str) -> Path:
    candidate = Path(value)
    resolved = (WORKSPACE_DIR / candidate).resolve() if not candidate.is_absolute() else candidate.resolve()
    if resolved != WORKSPACE_DIR and WORKSPACE_DIR not in resolved.parents:
        raise ValueError("Paths must stay inside local_studio/workspace.")
    return resolved


def require_path(value: Any, field: str) -> Path:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} is required.")
    return workspace_path(value)


def caption_font() -> str | None:
    """Find a usable local font without downloading or relying on a font name."""
    windir = Path(os.environ.get("WINDIR", "C:/Windows"))
    candidates = [
        os.getenv("LOCAL_STUDIO_FONT", ""),
        str(windir / "Fonts" / "arialbd.ttf"),
        str(windir / "Fonts" / "arial.ttf"),
        str(windir / "Fonts" / "segoeuib.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    return next((candidate for candidate in candidates if candidate and Path(candidate).exists()), None)


def new_project(body: dict[str, Any]) -> dict[str, Any]:
    title = str(body.get("title", "Untitled video project")).strip()[:120] or "Untitled video project"
    source = require_path(body.get("source_path"), "source_path")
    output = require_path(body.get("output_path", "outputs/final-video.mp4"), "output_path")
    timeline = body.get("timeline", {})
    if not isinstance(timeline, dict) or not isinstance(timeline.get("clips"), list):
        raise ValueError("timeline.clips must be a list.")
    project_id = str(uuid.uuid4())
    now = utc_now()
    with db() as conn:
        conn.execute("INSERT INTO projects (id, title, source_path, output_path, timeline_json, caption, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (project_id, title, str(source), str(output), json.dumps(timeline), str(body.get("caption", ""))[:2200], now, now))
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    event(project_id, None, "project_created", {"title": title, "source": str(source), "output": str(output)})
    return row_dict(row) or {}


def get_project(project_id: str) -> dict[str, Any] | None:
    with db() as conn:
        return row_dict(conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone())


def list_projects() -> list[dict[str, Any]]:
    with db() as conn:
        return [row_dict(row) or {} for row in conn.execute("SELECT * FROM projects ORDER BY updated_at DESC LIMIT 50")]


def list_jobs(project_id: str | None = None) -> list[dict[str, Any]]:
    query = "SELECT * FROM jobs" + (" WHERE project_id = ?" if project_id else "") + " ORDER BY created_at DESC LIMIT 100"
    with db() as conn:
        rows = conn.execute(query, (project_id,) if project_id else ()).fetchall()
    return [row_dict(row) or {} for row in rows]


def get_job(job_id: str) -> dict[str, Any] | None:
    with db() as conn:
        return row_dict(conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone())


def safe_detail(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        detail = value
    else:
        detail = {"message": str(value or "")}
    raw = json.dumps(detail, ensure_ascii=False)
    return detail if len(raw) <= 1200 else {"truncated": True, "summary": raw[:1000]}


def valid_bot_id(value: Any) -> str:
    bot_id = str(value or "").strip()[:80]
    if not bot_id or not all(character.isalnum() or character in "-_." for character in bot_id):
        raise ValueError("bot_id must use letters, numbers, hyphen, underscore, or period.")
    return bot_id


def record_bot_heartbeat(body: dict[str, Any]) -> dict[str, Any]:
    bot_id = valid_bot_id(body.get("bot_id"))
    display_name = str(body.get("display_name", bot_id)).strip()[:120] or bot_id
    action = str(body.get("action", "heartbeat")).strip()[:120] or "heartbeat"
    detail = safe_detail(body.get("detail", {}))
    now = utc_now()
    with db() as conn:
        conn.execute("""INSERT INTO bot_sessions (bot_id, display_name, last_action, last_detail_json, last_seen, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(bot_id) DO UPDATE SET display_name = excluded.display_name, last_action = excluded.last_action,
            last_detail_json = excluded.last_detail_json, last_seen = excluded.last_seen""", (bot_id, display_name, action, json.dumps(detail), now, now))
        conn.execute("INSERT INTO bot_activity (id, bot_id, action, detail_json, created_at) VALUES (?, ?, ?, ?, ?)", (str(uuid.uuid4()), bot_id, action, json.dumps(detail), now))
        row = conn.execute("SELECT * FROM bot_sessions WHERE bot_id = ?", (bot_id,)).fetchone()
    event(None, None, "bot_heartbeat", {"bot_id": bot_id, "action": action})
    return row_dict(row) or {}


def list_bots() -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM bot_sessions ORDER BY last_seen DESC LIMIT 100").fetchall()
        policy_rows = conn.execute("SELECT * FROM bot_execution_policies").fetchall()
    policies = {str(row["bot_id"]): row_dict(row) or {} for row in policy_rows}
    now = datetime.now(timezone.utc)
    bots = []
    for row in rows:
        bot = row_dict(row) or {}
        seen = datetime.fromisoformat(str(bot["last_seen"]))
        seconds_since_checkin = max(0, int((now - seen).total_seconds()))
        bot["seconds_since_checkin"] = seconds_since_checkin
        bot["presence"] = "active" if seconds_since_checkin <= 300 else "idle"
        bot["execution_policy"] = policies.get(bot["bot_id"], {"bot_id": bot["bot_id"], "mode": "approval_required", "updated_by": "local_default", "updated_at": None, "is_default": True})
        bots.append(bot)
    return {"bots": bots, "summary": {"total_known": len(bots), "active_now": sum(bot["presence"] == "active" for bot in bots), "activity_rule": "active means a recorded check-in within the last 5 minutes"}}


def list_bot_activity() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM bot_activity ORDER BY created_at DESC LIMIT 80").fetchall()
    return [row_dict(row) or {} for row in rows]


def execution_policy(bot_id: str) -> dict[str, Any]:
    bot_id = valid_bot_id(bot_id)
    with db() as conn:
        row = conn.execute("SELECT * FROM bot_execution_policies WHERE bot_id = ?", (bot_id,)).fetchone()
    if row:
        return row_dict(row) or {}
    return {"bot_id": bot_id, "mode": "approval_required", "updated_by": "local_default", "updated_at": None, "is_default": True}


def set_execution_policy(body: dict[str, Any]) -> dict[str, Any]:
    bot_id = valid_bot_id(body.get("bot_id"))
    mode = str(body.get("mode", "")).strip()
    if mode not in EXECUTION_MODES:
        raise ValueError("mode must be auto_local or approval_required.")
    updated_by = str(body.get("updated_by", bot_id)).strip()[:80] or bot_id
    now = utc_now()
    with db() as conn:
        conn.execute("""INSERT INTO bot_execution_policies (bot_id, mode, updated_by, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(bot_id) DO UPDATE SET mode = excluded.mode, updated_by = excluded.updated_by, updated_at = excluded.updated_at""", (bot_id, mode, updated_by, now))
        row = conn.execute("SELECT * FROM bot_execution_policies WHERE bot_id = ?", (bot_id,)).fetchone()
    policy = row_dict(row) or {}
    event(None, None, "bot_execution_policy_set", {"bot_id": bot_id, "mode": mode, "updated_by": updated_by})
    record_bot_heartbeat({"bot_id": bot_id, "display_name": body.get("display_name", bot_id), "action": "execution_policy_set", "detail": {"mode": mode}})
    return policy


def ensure_execution_policy(bot_id: str, mode: Any = None) -> dict[str, Any]:
    current = execution_policy(bot_id)
    if current.get("is_default"):
        return set_execution_policy({"bot_id": bot_id, "mode": str(mode or "auto_local"), "updated_by": bot_id})
    if mode is not None:
        return set_execution_policy({"bot_id": bot_id, "mode": mode, "updated_by": bot_id})
    return current


def bot_auto_executes(body: dict[str, Any]) -> tuple[bool, dict[str, Any] | None]:
    bot_id = str(body.get("bot_id", "")).strip()
    if not bot_id:
        return False, None
    policy = execution_policy(bot_id)
    return policy.get("mode") == "auto_local", policy


def artifact_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    value = dict(row)
    value["payload"] = json.loads(value.pop("payload_json"))
    return value


def artifact_payload(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("artifact payload must be a JSON object.")
    raw = json.dumps(value, ensure_ascii=False)
    if len(raw) > 30_000:
        raise ValueError("artifact payload is too large.")
    return value


def save_artifact(project_id: str | None, kind: str, title: Any, payload: Any, created_by: Any = "local_user") -> dict[str, Any]:
    if kind not in ARTIFACT_TYPES:
        raise ValueError("Unsupported project artifact type.")
    if project_id and not get_project(project_id):
        raise ValueError("Project not found.")
    artifact_id, now = str(uuid.uuid4()), utc_now()
    safe_title = str(title or kind.replace("_", " ")).strip()[:160] or kind.replace("_", " ")
    safe_actor = str(created_by or "local_user").strip()[:80] or "local_user"
    safe_payload = artifact_payload(payload)
    with db() as conn:
        conn.execute("""INSERT INTO project_artifacts (id, project_id, type, title, payload_json, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""", (artifact_id, project_id, kind, safe_title, json.dumps(safe_payload), safe_actor, now, now))
        row = conn.execute("SELECT * FROM project_artifacts WHERE id = ?", (artifact_id,)).fetchone()
    event(project_id, None, "artifact_saved", {"artifact_id": artifact_id, "type": kind, "title": safe_title, "created_by": safe_actor})
    return artifact_dict(row) or {}


def list_artifacts(project_id: str | None = None, kind: str | None = None) -> list[dict[str, Any]]:
    clauses, params = [], []
    if project_id is not None:
        clauses.append("project_id = ?"); params.append(project_id)
    if kind is not None:
        clauses.append("type = ?"); params.append(kind)
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    with db() as conn:
        rows = conn.execute(f"SELECT * FROM project_artifacts{where} ORDER BY updated_at DESC LIMIT 160", tuple(params)).fetchall()
    return [artifact_dict(row) or {} for row in rows]


def update_artifact(artifact_id: str, body: dict[str, Any]) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM project_artifacts WHERE id = ?", (artifact_id,)).fetchone()
        current = artifact_dict(row)
        if not current:
            raise ValueError("Artifact not found.")
        title = str(body.get("title", current["title"])).strip()[:160] or current["title"]
        current_payload = current["payload"]
        change = artifact_payload(body.get("payload", {}))
        payload = {**current_payload, **change}
        now = utc_now()
        conn.execute("UPDATE project_artifacts SET title = ?, payload_json = ?, updated_at = ? WHERE id = ?", (title, json.dumps(payload), now, artifact_id))
        updated = conn.execute("SELECT * FROM project_artifacts WHERE id = ?", (artifact_id,)).fetchone()
    event(current["project_id"], None, "artifact_updated", {"artifact_id": artifact_id, "type": current["type"]})
    return artifact_dict(updated) or {}


def build_cut_map(project_id: str, body: dict[str, Any]) -> dict[str, Any]:
    if not get_project(project_id):
        raise ValueError("Project not found.")
    raw_segments = body.get("segments")
    if not isinstance(raw_segments, list) or not raw_segments:
        raise ValueError("segments must contain timestamped transcript entries.")
    if len(raw_segments) > 500:
        raise ValueError("A cut map may contain up to 500 transcript entries.")
    segments, suggestions, previous_end = [], [], 0.0
    filler = {"um", "uh", "erm", "hmm", "음", "어", "저기"}
    for index, raw in enumerate(raw_segments):
        if not isinstance(raw, dict):
            raise ValueError("Each transcript segment must be an object.")
        try:
            start, end = float(raw.get("start")), float(raw.get("end"))
        except (TypeError, ValueError) as exc:
            raise ValueError("Transcript start and end must be numbers.") from exc
        text = str(raw.get("text", "")).strip()[:280]
        if start < 0 or end <= start or not text:
            raise ValueError("Each transcript segment needs a non-negative range and text.")
        segment = {"index": index + 1, "start": round(start, 3), "end": round(end, 3), "text": text}
        segments.append(segment)
        gap = start - previous_end
        if index and gap >= .4:
            suggestions.append({"kind": "silence_gap", "start": round(previous_end, 3), "end": round(start, 3), "action": "review_or_remove", "reason": f"{gap:.2f}s silence between speech segments"})
        normalized = re.sub(r"[^\w가-힣 ]", "", text.lower()).strip()
        if normalized in filler:
            suggestions.append({"kind": "filler", "start": round(start, 3), "end": round(end, 3), "action": "remove", "reason": f"Detected filler phrase: {text}"})
        previous_end = max(previous_end, end)
    payload = {"segments": segments, "suggestions": suggestions, "summary": {"segment_count": len(segments), "suggested_reviews": len(suggestions), "source": "bot_or_user_supplied_transcript", "rule": "Suggestions do not modify the EDL until a bot or person creates an approved project."}}
    return save_artifact(project_id, "cut_map", body.get("title", "Transcript cut map"), payload, body.get("created_by", "grok_bot"))


def probe_media(path: Path) -> dict[str, Any]:
    report: dict[str, Any] = {"path": str(path), "exists": path.exists(), "extension": path.suffix.lower(), "size_bytes": path.stat().st_size if path.exists() else None, "duration_seconds": None, "width": None, "height": None, "fps": None, "video_codec": None, "audio_codec": None, "has_audio": None, "silence_ranges": [], "black_ranges": [], "analysis": []}
    if not path.exists():
        report["analysis"].append("Source file is missing from the local workspace.")
        return report
    ffprobe = shutil.which("ffprobe")
    if ffprobe:
        try:
            result = subprocess.run([ffprobe, "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate", "-of", "json", str(path)], capture_output=True, text=True, timeout=25, check=True)
            data = json.loads(result.stdout)
            report["duration_seconds"] = round(float(data.get("format", {}).get("duration", 0)), 3) or None
            for stream in data.get("streams", []):
                if stream.get("codec_type") == "video":
                    report["width"], report["height"], report["video_codec"] = stream.get("width"), stream.get("height"), stream.get("codec_name")
                    frame_rate = str(stream.get("r_frame_rate", "0/1"))
                    numerator, denominator = frame_rate.split("/", 1)
                    report["fps"] = round(float(numerator) / max(float(denominator), 1), 3)
                elif stream.get("codec_type") == "audio":
                    report["has_audio"], report["audio_codec"] = True, stream.get("codec_name")
            if report["has_audio"] is None:
                report["has_audio"] = False
            report["analysis"].append("Media metadata read with local ffprobe.")
        except (OSError, subprocess.SubprocessError, ValueError, json.JSONDecodeError) as exc:
            report["analysis"].append(f"Metadata probe was unavailable: {exc}")
    else:
        report["analysis"].append("ffprobe is not installed, so detailed media metadata is unavailable.")
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg and report["has_audio"]:
        try:
            result = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path), "-af", "silencedetect=noise=-35dB:d=0.5", "-f", "null", "-"], capture_output=True, text=True, timeout=90)
            starts = re.findall(r"silence_start: ([0-9.]+)", result.stderr)
            ends = re.findall(r"silence_end: ([0-9.]+)", result.stderr)
            report["silence_ranges"] = [{"start": float(start), "end": float(end)} for start, end in zip(starts[:20], ends[:20])]
            report["analysis"].append("Silence scan completed locally.")
        except (OSError, subprocess.SubprocessError):
            report["analysis"].append("Silence scan could not complete.")
    if ffmpeg:
        try:
            result = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path), "-vf", "blackdetect=d=0.3:pix_th=0.10", "-an", "-f", "null", "-"], capture_output=True, text=True, timeout=90)
            ranges = re.findall(r"black_start:([0-9.]+) black_end:([0-9.]+)", result.stderr)
            report["black_ranges"] = [{"start": float(start), "end": float(end)} for start, end in ranges[:20]]
            report["analysis"].append("Black-frame scan completed locally.")
        except (OSError, subprocess.SubprocessError):
            report["analysis"].append("Black-frame scan could not complete.")
    return report


def inspect_project_media(project_id: str, body: dict[str, Any]) -> dict[str, Any]:
    project = get_project(project_id)
    if not project:
        raise ValueError("Project not found.")
    report = probe_media(Path(project["source_path"]))
    return save_artifact(project_id, "media_inspection", body.get("title", "Media preflight"), report, body.get("created_by", "local_inspector"))


def quality_report(project_id: str, stage: str, body: dict[str, Any]) -> dict[str, Any]:
    project = get_project(project_id)
    if not project:
        raise ValueError("Project not found.")
    if stage not in {"pre_render", "post_render", "publish"}:
        raise ValueError("Unsupported quality-check stage.")
    timeline = project.get("timeline_json", {}) if isinstance(project.get("timeline_json"), dict) else {}
    clips = timeline.get("clips", []) if isinstance(timeline.get("clips"), list) else []
    checks: list[dict[str, str]] = []
    source = Path(project["source_path"]); output = Path(project["output_path"])
    checks.append({"level": "pass" if source.exists() else "error", "rule": "source_file", "detail": "Source file is available." if source.exists() else "Source file is missing from the local workspace."})
    checks.append({"level": "pass" if clips else "error", "rule": "timeline", "detail": f"{len(clips)} EDL clip(s) are ready." if clips else "No EDL clips are available."})
    invalid_clips = [clip for clip in clips if not isinstance(clip, dict) or float(clip.get("end", 0)) <= float(clip.get("start", 0))]
    checks.append({"level": "pass" if not invalid_clips else "error", "rule": "clip_ranges", "detail": "All clip ranges have positive duration." if not invalid_clips else f"{len(invalid_clips)} clip range(s) need correction."})
    total_duration = round(sum(max(0, float(clip.get("end", 0)) - float(clip.get("start", 0))) for clip in clips if isinstance(clip, dict)), 3)
    checks.append({"level": "pass" if 3 <= total_duration <= 90 else "warning", "rule": "duration", "detail": f"Estimated edit duration: {total_duration}s."})
    settings = timeline.get("render_settings", {}) if isinstance(timeline.get("render_settings"), dict) else {}
    checks.append({"level": "pass" if settings.get("captions_enabled", True) else "warning", "rule": "captions", "detail": "Captions are enabled." if settings.get("captions_enabled", True) else "Captions are disabled; confirm this is intentional."})
    checks.append({"level": "pass" if output.suffix.lower() == ".mp4" else "warning", "rule": "output_format", "detail": "MP4 output is selected." if output.suffix.lower() == ".mp4" else "MP4 is recommended for local Reel export."})
    if stage == "post_render":
        checks.append({"level": "pass" if output.exists() else "error", "rule": "render_output", "detail": "Rendered output exists." if output.exists() else "No rendered output exists yet."})
    if stage == "publish":
        checks.append({"level": "pass" if len(project.get("caption", "")) <= 2200 else "error", "rule": "caption_length", "detail": f"Caption length: {len(project.get('caption', ''))}/2200."})
    passed = not any(check["level"] == "error" for check in checks)
    payload = {"stage": stage, "passed": passed, "checks": checks, "estimated_duration_seconds": total_duration, "created_from": "local EDL and workspace files", "note": "A report identifies issues; it never bypasses approval or starts a render."}
    kind = "preflight_report" if stage == "publish" else "quality_report"
    return save_artifact(project_id, kind, body.get("title", f"{stage.replace('_', ' ')} quality report"), payload, body.get("created_by", "local_qa"))


def project_operations(project_id: str) -> dict[str, Any]:
    project = get_project(project_id)
    if not project:
        raise ValueError("Project not found.")
    jobs = list_jobs(project_id)
    return {"project": project, "jobs": jobs, "artifacts": list_artifacts(project_id), "failed_jobs": [job for job in jobs if job.get("status") == "failed"]}


def _relative_workspace_path(value: str) -> str:
    try:
        return str(Path(value).resolve().relative_to(WORKSPACE_DIR))
    except ValueError:
        return value


def export_project_bundle(project_id: str) -> dict[str, Any]:
    project = get_project(project_id)
    if not project:
        raise ValueError("Project not found.")
    jobs = list_jobs(project_id)
    artifacts = list_artifacts(project_id)
    return {
        "schema": PROJECT_BUNDLE_SCHEMA,
        "exported_at": utc_now(),
        "project": {
            "title": project["title"],
            "source_path": _relative_workspace_path(project["source_path"]),
            "output_path": _relative_workspace_path(project["output_path"]),
            "timeline": project["timeline_json"],
            "caption": project["caption"],
        },
        "jobs": [{
            "kind": job["kind"], "status": job["status"], "approved": bool(job["approved"]),
            "payload": job.get("payload_json") or {}, "result": job.get("result_json"), "error_text": job.get("error_text"),
            "created_at": job["created_at"], "updated_at": job["updated_at"],
        } for job in jobs],
        "artifacts": [{
            "type": artifact["type"], "title": artifact["title"], "payload": artifact["payload"],
            "created_by": artifact["created_by"], "created_at": artifact["created_at"], "updated_at": artifact["updated_at"],
        } for artifact in artifacts],
    }


def import_project_bundle(body: dict[str, Any]) -> dict[str, Any]:
    bundle = body.get("bundle")
    if not isinstance(bundle, dict):
        raise ValueError("bundle must be a JSON object.")
    if bundle.get("schema") != PROJECT_BUNDLE_SCHEMA:
        raise ValueError(f"Unsupported bundle schema. Expected {PROJECT_BUNDLE_SCHEMA}.")
    project_data = bundle.get("project")
    if not isinstance(project_data, dict):
        raise ValueError("bundle.project must be a JSON object.")
    project = new_project({
        "title": f"{project_data.get('title', 'Untitled video project')} (imported)",
        "source_path": project_data.get("source_path"),
        "output_path": project_data.get("output_path", "outputs/final-video.mp4"),
        "timeline": project_data.get("timeline", {}),
        "caption": project_data.get("caption", ""),
    })
    imported_jobs = []
    for job_data in bundle.get("jobs") if isinstance(bundle.get("jobs"), list) else []:
        if not isinstance(job_data, dict) or job_data.get("kind") not in {"render", "instagram_publish"}:
            continue
        payload = job_data.get("payload") if isinstance(job_data.get("payload"), dict) else {}
        job = create_job(project["id"], job_data["kind"], payload, bool(job_data.get("approved")))
        if job_data.get("status") in {"succeeded", "failed"}:
            result = job_data.get("result") if isinstance(job_data.get("result"), dict) else None
            job = update_job(job["id"], status=job_data["status"], result=result, error=job_data.get("error_text"))
        imported_jobs.append(job)
    imported_artifacts = []
    for artifact_data in bundle.get("artifacts") if isinstance(bundle.get("artifacts"), list) else []:
        if not isinstance(artifact_data, dict) or artifact_data.get("type") not in ARTIFACT_TYPES:
            continue
        payload = artifact_data.get("payload") if isinstance(artifact_data.get("payload"), dict) else {}
        imported_artifacts.append(save_artifact(project["id"], artifact_data["type"], artifact_data.get("title"), payload, artifact_data.get("created_by", "bundle_import")))
    event(project["id"], None, "project_bundle_imported", {"jobs": len(imported_jobs), "artifacts": len(imported_artifacts)})
    return {"project": project, "jobs": imported_jobs, "artifacts": imported_artifacts}


def bot_entry_manifest() -> dict[str, Any]:
    return {
        "schema": BOT_ENTRY_SCHEMA,
        "scope": "Same workstation and 127.0.0.1 only.",
        "entry_endpoint": "POST /api/bot-entry",
        "entry_body": {
            "bot_id": "local-editor-bot",
            "display_name": "Local Editor Bot",
            "purpose": "edit_video",
            "task": "Prepare a transcript-first local edit plan.",
            "execution_mode": "auto_local | approval_required",
        },
        "first_requests": ["GET /api/bot-guide", "GET /api/projects", "GET /api/jobs", "GET /api/edit-method", "GET /api/bots/{bot_id}/execution-policy"],
        "keep_alive": "POST /api/bots/heartbeat at each meaningful state change and at least once every five minutes while active.",
        "execution_policy": "On first entry, a bot receives auto_local for local project, inspection, planning, and rendering work. The bot can change its own policy to approval_required. Instagram upload is queued manually or run immediately with auto_upload.",
        "approval_boundary": "auto_local controls local rendering. Instagram upload can be queued manually or run immediately when auto_upload is enabled for that job.",
        "credential_rule": "If LOCAL_STUDIO_TOKEN is enabled, receive it from the bot runtime configuration. Never read .env, SQLite, or browser storage for a token.",
    }


def terminal_contract() -> dict[str, Any]:
    return {
        "schema": "local-video-workspace.terminal-cli/v1",
        "scope": "Same workstation and loopback HTTP only.",
        "api_base_url": "http://127.0.0.1:7214",
        "browser_site_base_url": SITE_BASE_URL,
        "browser_rule": "Port 7214 is the CLI and JSON API only. Open or capture browser pages at http://localhost:3000; never append /production or other browser paths to port 7214.",
        "clone_cli_path": "local_studio/grok_crew.py",
        "clone_bootstrap": "python local_studio/grok_crew.py contract",
        "download": "GET /downloads/grok-crew.py",
        "bootstrap": "python grok-crew.py contract",
        "auth": "Set LOCAL_STUDIO_TOKEN in the bot terminal only when Local Studio token protection is enabled.",
        "commands": {
            "start": ["health", "contract", "guide", "site --page production", "entry", "policy get|set", "heartbeat", "bots list|activity|entries"],
            "editing": ["projects list|get|create", "method get|set", "ops show|inspect|cut-map|quality|artifact|update", "brand list|save"],
            "delivery": ["jobs list|render [auto local or human approved]|instagram|run|cancel", "render, instagram, and run accept --wait to poll until the job finishes; renders execute in the background and report progress via GET /api/jobs/{id}"],
        },
        "execution_policy": {"auto_local": "The connected bot can queue and run its own local render work automatically.", "approval_required": "The bot records a request and requires --human-approved for local render work.", "instagram": "Instagram upload can run immediately when auto_upload is enabled, or remain queued for manual execution."},
        "browser_pages": {
            "studio": f"{SITE_BASE_URL}/",
            "edit": f"{SITE_BASE_URL}/edit",
            "cut": f"{SITE_BASE_URL}/cut",
            "production": f"{SITE_BASE_URL}/production",
            "operations": f"{SITE_BASE_URL}/operations",
            "bot_check": f"{SITE_BASE_URL}/bots",
            "bot_guide": f"{SITE_BASE_URL}/bot-guide",
            "terminal": f"{SITE_BASE_URL}/terminal",
            "library": f"{SITE_BASE_URL}/library",
            "agent_desk": f"{SITE_BASE_URL}/agent",
            "local_desk": f"{SITE_BASE_URL}/connect",
            "packet": f"{SITE_BASE_URL}/packet",
            "gate_board": f"{SITE_BASE_URL}/gates",
            "export": f"{SITE_BASE_URL}/export",
            "privacy": f"{SITE_BASE_URL}/privacy",
        },
    }


def list_bot_entries() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("""SELECT e.*, s.last_seen FROM bot_entries e
            LEFT JOIN bot_sessions s ON s.bot_id = e.bot_id
            ORDER BY e.joined_at DESC LIMIT 80""").fetchall()
    now = datetime.now(timezone.utc)
    entries = []
    for row in rows:
        entry = dict(row)
        last_seen = entry.pop("last_seen", None)
        if last_seen:
            seconds = max(0, int((now - datetime.fromisoformat(str(last_seen))).total_seconds()))
            entry["presence"] = "active" if seconds <= 300 else "idle"
            entry["seconds_since_checkin"] = seconds
        else:
            entry["presence"] = "idle"
            entry["seconds_since_checkin"] = None
        entries.append(entry)
    return entries


def enter_bot_workspace(body: dict[str, Any]) -> dict[str, Any]:
    bot_id = valid_bot_id(body.get("bot_id"))
    display_name = str(body.get("display_name", bot_id)).strip()[:120] or bot_id
    purpose = str(body.get("purpose", "edit_video")).strip()[:120] or "edit_video"
    task = str(body.get("task", "")).strip()[:320]
    entry_id, now = str(uuid.uuid4()), utc_now()
    with db() as conn:
        conn.execute("""INSERT INTO bot_entries (id, bot_id, display_name, purpose, task, joined_at)
            VALUES (?, ?, ?, ?, ?, ?)""", (entry_id, bot_id, display_name, purpose, task, now))
    policy = ensure_execution_policy(bot_id, body.get("execution_mode"))
    bot = record_bot_heartbeat({"bot_id": bot_id, "display_name": display_name, "action": "entered_local_studio", "detail": {"entry_id": entry_id, "purpose": purpose, "task": task, "execution_mode": policy["mode"], "next": "read local bot guide"}})
    event(None, None, "bot_entered", {"entry_id": entry_id, "bot_id": bot_id, "purpose": purpose, "task": task, "execution_mode": policy["mode"]})
    return {"entry": {"id": entry_id, "bot_id": bot_id, "display_name": display_name, "purpose": purpose, "task": task, "joined_at": now}, "bot": bot, "execution_policy": policy, "next_requests": bot_entry_manifest()["first_requests"], "execution_policy_note": bot_entry_manifest()["execution_policy"]}


def bot_guide(language: str = "en") -> dict[str, Any]:
    try:
        path = BOT_GUIDE_KO_PATH if language == "ko" else BOT_GUIDE_PATH
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Local bot guide is unavailable or invalid JSON.") from exc
    if not isinstance(value, dict):
        raise RuntimeError("Local bot guide must be a JSON object.")
    return value


def current_edit_method() -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM edit_method WHERE id = 'current'").fetchone()
    if not row:
        return {"method": DEFAULT_EDIT_METHOD.copy(), "updated_by": "local_default", "updated_at": None, "is_default": True}
    value = dict(row)
    return {"method": json.loads(value["method_json"]), "updated_by": value["updated_by"], "updated_at": value["updated_at"], "is_default": False}


def validated_edit_method(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("method must be a JSON object.")
    unknown = set(value) - (set(DEFAULT_EDIT_METHOD) - {"schema"})
    if unknown:
        raise ValueError(f"Unsupported edit-method field: {sorted(unknown)[0]}")
    method = {**DEFAULT_EDIT_METHOD, **value}
    choices = {
        "hook_strategy": {"payoff_first", "question_first", "chronological"},
        "pacing": {"tight", "balanced", "deliberate"},
        "filler_policy": {"remove", "review", "keep"},
        "caption_mode": {"burn_in", "off"},
        "reframe_anchor": {"left", "center", "right"},
        "look": {"natural", "punchy", "mono", "night"},
        "audio_policy": {"preserve", "normalize", "mute"},
        "quality": {"compact", "balanced", "high"},
    }
    for field, allowed in choices.items():
        if method[field] not in allowed:
            raise ValueError(f"{field} must be one of: {', '.join(sorted(allowed))}.")
    if method["fps"] not in {24, 30, 60}:
        raise ValueError("fps must be 24, 30, or 60.")
    try:
        method["speed"] = float(method["speed"])
    except (TypeError, ValueError) as exc:
        raise ValueError("speed must be a number between 0.5 and 2.0.") from exc
    if not .5 <= method["speed"] <= 2.0:
        raise ValueError("speed must be a number between 0.5 and 2.0.")
    return method


def set_edit_method(body: dict[str, Any]) -> dict[str, Any]:
    bot_id = str(body.get("bot_id", "")).strip()
    if not bot_id:
        raise ValueError("bot_id is required when a bot configures an edit method.")
    method = validated_edit_method(body.get("method"))
    now = utc_now()
    with db() as conn:
        conn.execute("""INSERT INTO edit_method (id, method_json, updated_by, updated_at) VALUES ('current', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET method_json = excluded.method_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at""", (json.dumps(method), bot_id[:80], now))
    record_bot_heartbeat({"bot_id": bot_id, "display_name": body.get("display_name", bot_id), "action": "edit_method_configured", "detail": {"method": method, "next": "await human application or review"}})
    event(None, None, "edit_method_configured", {"bot_id": bot_id, "method": method})
    return current_edit_method()


def create_job(project_id: str, kind: str, payload: dict[str, Any], approved: bool) -> dict[str, Any]:
    if kind not in {"render", "instagram_publish"}:
        raise ValueError("Unsupported job kind.")
    if not get_project(project_id):
        raise ValueError("Project not found.")
    job_id = str(uuid.uuid4())
    now = utc_now()
    with db() as conn:
        conn.execute("INSERT INTO jobs (id, project_id, kind, status, approved, payload_json, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?, ?, ?)", (job_id, project_id, kind, int(approved), json.dumps(payload), now, now))
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    event(project_id, job_id, "job_queued", {"kind": kind, "approved": approved})
    return row_dict(row) or {}


def update_job(job_id: str, *, status: str, result: dict[str, Any] | None = None, error: str | None = None, progress: int | None = None) -> dict[str, Any]:
    with db() as conn:
        if progress is None:
            conn.execute("UPDATE jobs SET status = ?, result_json = ?, error_text = ?, updated_at = ? WHERE id = ?", (status, json.dumps(result) if result is not None else None, error, utc_now(), job_id))
        else:
            conn.execute("UPDATE jobs SET status = ?, result_json = ?, error_text = ?, progress = ?, updated_at = ? WHERE id = ?", (status, json.dumps(result) if result is not None else None, error, max(0, min(100, int(progress))), utc_now(), job_id))
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    return row_dict(row) or {}


def update_job_progress(job_id: str, progress: int) -> None:
    with db() as conn:
        conn.execute("UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ? AND status = 'running'", (max(0, min(100, int(progress))), utc_now(), job_id))


def job_cancel_requested(job_id: str) -> bool:
    with db() as conn:
        row = conn.execute("SELECT cancel_requested FROM jobs WHERE id = ?", (job_id,)).fetchone()
    return bool(row and row["cancel_requested"])


def request_job_cancel(job_id: str) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            raise ValueError("Job not found.")
        conn.execute("UPDATE jobs SET cancel_requested = 1, updated_at = ? WHERE id = ?", (utc_now(), job_id))
        updated = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    return row_dict(updated) or {}


def render_moviepy(project: dict[str, Any], progress_cb: Callable[[int], None] | None = None, should_cancel: Callable[[], bool] | None = None) -> dict[str, Any]:
    try:
        from moviepy import AudioFileClip, CompositeAudioClip, CompositeVideoClip, TextClip, VideoFileClip, afx, concatenate_videoclips, vfx
    except ImportError as exc:
        raise RuntimeError("MoviePy is not installed. Install local_studio/requirements.txt first.") from exc
    timeline = project["timeline_json"]
    raw_settings = timeline.get("render_settings", {})
    settings = raw_settings if isinstance(raw_settings, dict) else {}

    def bounded(name: str, default: float, minimum: float, maximum: float) -> float:
        try:
            return min(max(float(settings.get(name, default)), minimum), maximum)
        except (TypeError, ValueError):
            return default

    def enabled(name: str, default: bool = False) -> bool:
        value = settings.get(name, default)
        return value if isinstance(value, bool) else default

    fps = int(bounded("fps", 30, 24, 60))
    if fps not in {24, 30, 60}:
        fps = 30
    quality = str(settings.get("quality", "balanced"))
    bitrate = {"compact": "3500k", "balanced": "6000k", "high": "9000k"}.get(quality, "6000k")
    crop_anchor = str(settings.get("crop_anchor", "center"))
    if crop_anchor not in {"left", "center", "right"}:
        crop_anchor = "center"
    speed = bounded("speed", 1, .5, 2)
    volume = bounded("volume", 100, 0, 200) / 100
    fade_in, fade_out = bounded("fade_in", .08, 0, 2), bounded("fade_out", .08, 0, 2)
    look = str(settings.get("look", "natural"))
    if look not in {"natural", "punchy", "mono", "night"}:
        look = "natural"
    brightness, contrast, gamma = bounded("brightness", 0, -40, 40), bounded("contrast", 0, -40, 55), bounded("gamma", 1, .65, 1.55)
    platform = str(settings.get("platform", "reels_tiktok_shorts"))
    dims = PLATFORM_PRESETS.get(platform, PLATFORM_PRESETS["reels_tiktok_shorts"])
    target_w, target_h = int(dims["width"]), int(dims["height"])
    captions_enabled = enabled("captions_enabled", True)
    caption_color = str(settings.get("caption_color", "#FFFFFF"))
    if not (caption_color.startswith("#") and len(caption_color) in {4, 7, 9}):
        caption_color = "#FFFFFF"
    caption_size = int(bounded("caption_size", 78, 38, 110))
    caption_y = int(bounded("caption_y", 74, 48, 84) * target_h / 100)
    caption_stroke = int(bounded("caption_stroke", 3, 0, 8))
    caption_bg = enabled("caption_bg", False)
    caption_bg_color = str(settings.get("caption_bg_color", "#000000"))
    if not (caption_bg_color.startswith("#") and len(caption_bg_color) in {4, 7, 9}):
        caption_bg_color = "#000000"
    font_path = caption_font()
    if captions_enabled and not font_path:
        raise RuntimeError("No usable local font was found for captions. Set LOCAL_STUDIO_FONT to a .ttf/.otf file path, install a system font, or disable captions for this render.")
    source = Path(project["source_path"])
    output = Path(project["output_path"])
    if not source.exists():
        raise RuntimeError(f"Source file does not exist: {source}")
    output.parent.mkdir(parents=True, exist_ok=True)
    clips_data = timeline.get("clips", [])
    cuts = []
    total_entries = max(len(clips_data), 1)
    with VideoFileClip(str(source)) as source_clip:
        for position, entry in enumerate(clips_data):
            if should_cancel and should_cancel():
                raise RuntimeError("Render cancelled.")
            if not entry.get("keep", True):
                continue
            start, end = float(entry["in"]), float(entry["out"])
            if end <= start or start < 0 or end > source_clip.duration + .05:
                continue
            cut = source_clip.subclipped(start, end)
            effects = []
            if speed != 1:
                effects.append(vfx.MultiplySpeed(speed))
            if look == "punchy":
                effects.append(vfx.LumContrast(lum=4, contrast=24))
            elif look == "night":
                effects.append(vfx.LumContrast(lum=11, contrast=-8))
            elif look == "mono":
                effects.append(vfx.BlackAndWhite())
            if brightness or contrast:
                effects.append(vfx.LumContrast(lum=brightness, contrast=contrast))
            if gamma != 1:
                effects.append(vfx.GammaCorrection(gamma))
            if enabled("mirror"):
                effects.append(vfx.MirrorX())
            if fade_in:
                effects.append(vfx.FadeIn(fade_in))
            if fade_out:
                effects.append(vfx.FadeOut(fade_out))
            if effects:
                cut = cut.with_effects(effects)
            if cut.h < target_h:
                cut = cut.resized(height=target_h)
            if cut.w < target_w:
                cut = cut.resized(width=target_w)
            half_w = target_w / 2
            x_center = half_w if crop_anchor == "left" else cut.w - half_w if crop_anchor == "right" else cut.w / 2
            cut = cut.cropped(x_center=x_center, y_center=cut.h / 2, width=target_w, height=target_h)
            if cut.audio:
                if enabled("mute_audio"):
                    cut = cut.without_audio()
                else:
                    audio_effects = [afx.AudioFadeIn(fade_in), afx.AudioFadeOut(fade_out)]
                    if enabled("normalize_audio"):
                        audio_effects.insert(0, afx.AudioNormalize())
                    if volume != 1:
                        audio_effects.append(afx.MultiplyVolume(volume))
                    cut = cut.with_audio(cut.audio.with_effects(audio_effects))
            caption = str(entry.get("caption", "")).strip()
            word_timings = entry.get("word_timings")
            caption_layers = []
            if captions_enabled and isinstance(word_timings, list) and word_timings:
                for word_entry in word_timings[:200]:
                    if not isinstance(word_entry, dict):
                        continue
                    word_text = str(word_entry.get("text", "")).strip()
                    try:
                        word_start, word_end = float(word_entry.get("start")), float(word_entry.get("end"))
                    except (TypeError, ValueError):
                        continue
                    if not word_text or word_end <= word_start or word_start < 0 or word_start > cut.duration:
                        continue
                    word_duration = min(word_end, cut.duration) - word_start
                    if word_duration <= 0:
                        continue
                    word_clip = TextClip(font=font_path, text=word_text, font_size=caption_size, color=caption_color, bg_color=caption_bg_color if caption_bg else None, stroke_color="black", stroke_width=caption_stroke, size=(int(target_w * 0.85), None), method="caption").with_start(word_start).with_duration(word_duration).with_position(("center", caption_y))
                    caption_layers.append(word_clip)
            elif caption and captions_enabled:
                caption_layers.append(TextClip(font=font_path, text=caption, font_size=caption_size, color=caption_color, bg_color=caption_bg_color if caption_bg else None, stroke_color="black", stroke_width=caption_stroke, size=(int(target_w * 0.85), None), method="caption").with_duration(cut.duration).with_position(("center", caption_y)))
            if caption_layers:
                cut = CompositeVideoClip([cut, *caption_layers], size=(target_w, target_h))
            cuts.append(cut)
            if progress_cb:
                progress_cb(min(90, int(90 * (position + 1) / total_entries)))
        if not cuts:
            raise RuntimeError("No valid kept clips are available to render.")
        if should_cancel and should_cancel():
            raise RuntimeError("Render cancelled.")
        final = concatenate_videoclips(cuts, method="compose")
        music_value = str(settings.get("music_track", "")).strip()
        if music_value:
            music_path = workspace_path(music_value)
            if not music_path.exists():
                raise RuntimeError(f"Music track does not exist: {music_path}")
            music_gain = bounded("music_volume", 30, 0, 100) / 100
            with AudioFileClip(str(music_path)) as music_clip:
                music = music_clip.with_effects([afx.MultiplyVolume(music_gain)])
                music = music.with_effects([afx.AudioLoop(duration=final.duration)]) if enabled("music_loop", True) else music.subclipped(0, min(music.duration, final.duration))
                final = final.with_audio(CompositeAudioClip([final.audio, music]) if final.audio else music)
        has_audio = bool(final.audio)
        if progress_cb:
            progress_cb(92)
        final.write_videofile(str(output), fps=fps, codec="libx264", audio_codec="aac", bitrate=bitrate, threads=4, logger=None)
        final.close()
    if progress_cb:
        progress_cb(100)
    return {"output_path": str(output), "format": "mp4", "video": "H.264", "audio": "AAC" if has_audio else "none", "width": target_w, "height": target_h, "platform": platform, "fps": fps, "bitrate": bitrate, "render_settings": {"crop_anchor": crop_anchor, "speed": speed, "look": look, "captions_enabled": captions_enabled, "quality": quality}}


def instagram_publish(project: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    try:
        import requests
    except ImportError as exc:
        raise RuntimeError("Requests is not installed. Install local_studio/requirements.txt first.") from exc
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN", "").strip()
    user_id = os.getenv("INSTAGRAM_USER_ID", "").strip()
    version = os.getenv("INSTAGRAM_API_VERSION", "").strip()
    if not token or not user_id or not version:
        raise RuntimeError("Instagram credentials are not configured locally. Set INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID, and INSTAGRAM_API_VERSION in local_studio/.env.")
    media_path = require_path(payload.get("render_path", project["output_path"]), "render_path")
    if not media_path.exists():
        raise RuntimeError(f"Approved render does not exist: {media_path}")
    if media_path.stat().st_size > 1024 * 1024 * 1024:
        raise RuntimeError("Instagram Reel file exceeds the 1 GB local upload limit.")
    if media_path.suffix.lower() not in {".mp4", ".mov", ".mkv", ".avi"}:
        raise RuntimeError("Instagram upload expects a supported local video format.")
    caption = str(payload.get("caption", project.get("caption", "")))[:2200]
    api = f"https://graph.instagram.com/{version}/{user_id}"
    container = requests.post(f"{api}/media", data={"media_type": "REELS", "upload_type": "resumable", "caption": caption, "share_to_feed": str(bool(payload.get("share_to_feed", False))).lower()}, headers={"Authorization": f"Bearer {token}"}, timeout=45)
    container.raise_for_status()
    container_data = container.json()
    container_id, upload_uri = container_data.get("id"), container_data.get("uri")
    if not container_id or not upload_uri:
        raise RuntimeError("Instagram did not return a resumable upload container URI.")
    with media_path.open("rb") as media:
        upload = requests.post(upload_uri, headers={"Authorization": f"OAuth {token}", "offset": "0", "file_size": str(media_path.stat().st_size), "Content-Type": "application/octet-stream"}, data=media, timeout=900)
        upload.raise_for_status()
    deadline = time.time() + 90
    status_data: dict[str, Any] = {}
    while time.time() < deadline:
        status = requests.get(f"https://graph.instagram.com/{version}/{container_id}", params={"fields": "status_code,status"}, headers={"Authorization": f"Bearer {token}"}, timeout=30)
        status.raise_for_status(); status_data = status.json()
        if status_data.get("status_code") == "FINISHED":
            break
        if status_data.get("status_code") in {"ERROR", "EXPIRED"}:
            raise RuntimeError(f"Instagram container failed: {status_data}")
        time.sleep(3)
    else:
        raise RuntimeError("Instagram processing did not finish within 90 seconds.")
    published = requests.post(f"{api}/media_publish", data={"creation_id": container_id}, headers={"Authorization": f"Bearer {token}"}, timeout=45)
    published.raise_for_status()
    return {"container_id": container_id, "container_status": status_data, "instagram_media_id": published.json().get("id"), "source_path": str(media_path)}


def _validate_runnable(job: dict[str, Any]) -> dict[str, Any]:
    if job["kind"] == "render" and not job["approved"]:
        raise ValueError("Job has no recorded human approval.")
    if job["status"] not in {"queued", "failed"}:
        raise ValueError("Only queued or failed jobs can run.")
    project = get_project(job["project_id"])
    if not project:
        raise ValueError("Project no longer exists.")
    return project


def execute_job(job_id: str) -> dict[str, Any]:
    job = get_job(job_id)
    if not job:
        raise ValueError("Job not found.")
    project = _validate_runnable(job)
    update_job(job_id, status="running", progress=0)
    event(project["id"], job_id, "job_started", {"kind": job["kind"]})
    try:
        if job["kind"] == "render":
            result = render_moviepy(project, progress_cb=lambda pct: update_job_progress(job_id, pct), should_cancel=lambda: job_cancel_requested(job_id))
        else:
            result = instagram_publish(project, job["payload_json"])
        final = update_job(job_id, status="succeeded", result=result, progress=100)
        event(project["id"], job_id, "job_succeeded", result)
        return final
    except Exception as exc:  # noqa: BLE001
        final = update_job(job_id, status="failed", error=str(exc))
        event(project["id"], job_id, "job_failed", {"error": str(exc)})
        return final


def start_job(job_id: str, *, wait: bool) -> dict[str, Any]:
    job = get_job(job_id)
    if not job:
        raise ValueError("Job not found.")
    _validate_runnable(job)
    future: Future = RENDER_EXECUTOR.submit(execute_job, job_id)
    if wait:
        return future.result()
    return get_job(job_id) or job


class StudioHandler(BaseHTTPRequestHandler):
    server_version = "LocalVideoStudio/1.0"

    def _json(self, status: int, payload: Any) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Content-Length", str(len(raw)))
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin); self.send_header("Vary", "Origin")
        self.end_headers(); self.wfile.write(raw)

    def _download(self, path: Path, filename: str) -> None:
        if not path.is_file():
            raise RuntimeError("Local terminal CLI download is unavailable.")
        raw = path.read_bytes()
        self.send_response(HTTPStatus.OK); self.send_header("Content-Type", "text/x-python; charset=utf-8"); self.send_header("Content-Length", str(len(raw)))
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin); self.send_header("Vary", "Origin")
        self.end_headers(); self.wfile.write(raw)

    def _redirect_to_browser_page(self, path: str) -> None:
        self.send_response(HTTPStatus.FOUND)
        self.send_header("Location", f"{SITE_BASE_URL}{path}")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def _body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length > 8_000_000:
            raise ValueError("Request body is too large.")
        value = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        if not isinstance(value, dict):
            raise ValueError("JSON object required.")
        return value

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        return origin is None or origin in ALLOWED_ORIGINS

    def _token_ok(self) -> bool:
        expected = os.getenv("LOCAL_STUDIO_TOKEN", "").strip()
        return not expected or self.headers.get("Authorization") == f"Bearer {expected}"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if not self._origin_allowed():
            self._json(403, {"error": "Cross-origin requests are not allowed."}); return
        try:
            path = urlparse(self.path).path.rstrip("/") or "/"
            if path not in PUBLIC_GET_PATHS and path not in BROWSER_PAGE_PATHS and not self._token_ok():
                self._json(401, {"error": "Invalid local studio token."}); return
            if path in BROWSER_PAGE_PATHS:
                self._redirect_to_browser_page(path)
            elif path == "/health":
                instagram_ready = bool(os.getenv("INSTAGRAM_ACCESS_TOKEN") and os.getenv("INSTAGRAM_USER_ID") and os.getenv("INSTAGRAM_API_VERSION"))
                self._json(200, {"service": "Local Video Studio", "status": "ready", "bind": "127.0.0.1", "workspace": str(WORKSPACE_DIR), "database": str(DB_PATH), "moviepy_installed": self._moviepy_ready(), "instagram_publish_enabled": instagram_ready, "credentials_configured": instagram_ready, "bots": list_bots()["summary"]})
            elif path == "/api/projects":
                self._json(200, {"projects": list_projects()})
            elif path == "/api/jobs":
                self._json(200, {"jobs": list_jobs()})
            elif path.startswith("/api/jobs/"):
                job = get_job(path.rsplit("/", 1)[-1])
                self._json(200, {"job": job} if job else {"error": "Job not found"})
            elif path.startswith("/api/bots/") and path.endswith("/execution-policy"):
                self._json(200, {"execution_policy": execution_policy(path.split("/")[3])})
            elif path == "/api/bots":
                self._json(200, list_bots())
            elif path == "/api/bot-activity":
                self._json(200, {"activity": list_bot_activity()})
            elif path == "/api/bot-guide":
                language = "ko" if "lang=ko" in urlparse(self.path).query else "en"
                self._json(200, bot_guide(language))
            elif path == "/api/bot-entry":
                self._json(200, bot_entry_manifest())
            elif path == "/api/terminal-contract":
                self._json(200, terminal_contract())
            elif path == "/downloads/grok-crew.py":
                self._download(TERMINAL_CLI_PATH, "grok-crew.py")
            elif path == "/api/bot-entries":
                self._json(200, {"entries": list_bot_entries()})
            elif path == "/api/edit-method":
                self._json(200, current_edit_method())
            elif path == "/api/presets":
                self._json(200, {"quality_presets": QUALITY_PRESETS, "caption_layout_presets": CAPTION_LAYOUT_PRESETS, "platform_presets": PLATFORM_PRESETS})
            elif path == "/api/brand-kits":
                self._json(200, {"brand_kits": list_artifacts(None, "brand_kit")})
            elif path.startswith("/api/projects/") and path.endswith("/operations"):
                self._json(200, project_operations(path.split("/")[3]))
            elif path.startswith("/api/projects/") and path.endswith("/export"):
                self._json(200, {"bundle": export_project_bundle(path.split("/")[3])})
            elif path.startswith("/api/projects/"):
                project = get_project(path.rsplit("/", 1)[-1])
                self._json(200, {"project": project, "jobs": list_jobs(project["id"])} if project else {"error": "Project not found"})
            else:
                self._json(404, {"error": "Not found"})
        except Exception as exc:  # noqa: BLE001
            self._json(500, {"error": str(exc)})

    def do_POST(self) -> None:  # noqa: N802
        if not self._origin_allowed():
            self._json(403, {"error": "Cross-origin requests are not allowed."}); return
        if not self._token_ok():
            self._json(401, {"error": "Invalid local studio token."}); return
        try:
            path = urlparse(self.path).path.rstrip("/"); body = self._body()
            if path == "/api/projects":
                self._json(201, {"project": new_project(body)})
            elif path == "/api/projects/import":
                self._json(201, import_project_bundle(body))
            elif path == "/api/bots/heartbeat":
                self._json(201, {"bot": record_bot_heartbeat(body)})
            elif path == "/api/bots/execution-policy":
                self._json(200, {"execution_policy": set_execution_policy(body)})
            elif path == "/api/bot-entry":
                self._json(201, enter_bot_workspace(body))
            elif path == "/api/edit-method":
                self._json(200, {"edit_method": set_edit_method(body)})
            elif path == "/api/brand-kits":
                self._json(201, {"brand_kit": save_artifact(None, "brand_kit", body.get("title", body.get("name", "Brand kit")), body.get("payload", body), body.get("created_by", "local_user"))})
            elif path.startswith("/api/artifacts/") and path.endswith("/update"):
                self._json(200, {"artifact": update_artifact(path.split("/")[3], body)})
            elif path.startswith("/api/projects/") and path.endswith("/cut-map"):
                self._json(201, {"cut_map": build_cut_map(path.split("/")[3], body)})
            elif path.startswith("/api/projects/") and path.endswith("/inspect"):
                self._json(201, {"inspection": inspect_project_media(path.split("/")[3], body)})
            elif path.startswith("/api/projects/") and path.endswith("/quality-check"):
                self._json(201, {"quality_report": quality_report(path.split("/")[3], str(body.get("stage", "pre_render")), body)})
            elif path.startswith("/api/projects/") and path.endswith("/artifacts"):
                project_id, kind = path.split("/")[3], str(body.get("type", ""))
                if kind not in {"audio_plan", "bot_task", "edit_variant", "overlay_slots", "performance_note", "project_memory"}:
                    raise ValueError("Use the dedicated endpoint for this project artifact type.")
                self._json(201, {"artifact": save_artifact(project_id, kind, body.get("title"), body.get("payload", {}), body.get("created_by", "local_user"))})
            elif path.startswith("/api/projects/") and path.endswith("/render"):
                project_id = path.split("/")[3]
                auto_local, policy = bot_auto_executes(body)
                human_approved = bool(body.get("approved"))
                if not human_approved and not auto_local:
                    raise ValueError("This bot requires human approval before a local render. Set its execution policy to auto_local or send approved: true.")
                authorization = "bot_auto_local" if auto_local and not human_approved else "human_approved"
                job = create_job(project_id, "render", {
                    "requested_by": body.get("requested_by", "local_user"),
                    "bot_id": body.get("bot_id"),
                    "execution_authorization": authorization,
                }, human_approved or auto_local)
                auto_run = auto_local and bool(body.get("run_immediately", True))
                if auto_run:
                    job = start_job(job["id"], wait=bool(body.get("wait", False)))
                self._json(201, {"job": job, "execution_policy": policy, "auto_run": auto_run})
            elif path.startswith("/api/projects/") and path.endswith("/instagram"):
                project_id = path.split("/")[3]
                auto_upload = bool(body.get("auto_upload", False))
                job = create_job(project_id, "instagram_publish", {"render_path": body.get("render_path"), "caption": body.get("caption", ""), "share_to_feed": bool(body.get("share_to_feed", False)), "requested_by": body.get("requested_by", "local_user"), "auto_upload": auto_upload}, True)
                if auto_upload:
                    job = start_job(job["id"], wait=bool(body.get("wait", False)))
                self._json(201, {"job": job, "auto_upload": auto_upload})
            elif path.startswith("/api/jobs/") and path.endswith("/cancel"):
                self._json(200, {"job": request_job_cancel(path.split("/")[3])})
            elif path.startswith("/api/jobs/") and path.endswith("/run"):
                job_id = path.split("/")[3]; self._json(200, {"job": start_job(job_id, wait=bool(body.get("wait", False)))})
            else:
                self._json(404, {"error": "Not found"})
        except ValueError as exc:
            self._json(400, {"error": str(exc)})
        except Exception as exc:  # noqa: BLE001
            self._json(500, {"error": str(exc)})

    @staticmethod
    def _moviepy_ready() -> bool:
        try:
            import moviepy  # noqa: F401
            return True
        except ImportError:
            return False

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[{utc_now()}] {self.address_string()} {fmt % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Local Video Studio on loopback only.")
    parser.add_argument("--port", type=int, default=7214)
    args = parser.parse_args(); load_dotenv(); init_db()
    with db() as conn:
        conn.execute("UPDATE jobs SET status = 'failed', error_text = ?, updated_at = ? WHERE status = 'running'", ("Interrupted by an unclean Local Studio shutdown.", utc_now()))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), StudioHandler)
    print(f"Local Video Studio listening at http://127.0.0.1:{args.port}")
    print(f"Workspace: {WORKSPACE_DIR}")
    print("Instagram upload runs when a queued job is started or auto_upload is enabled.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nLocal Studio stopped.")
    finally:
        RENDER_EXECUTOR.shutdown(wait=False)
        server.server_close()


if __name__ == "__main__":
    main()
