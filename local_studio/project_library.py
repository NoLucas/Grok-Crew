"""Project folders, rename, and a 30-day trash for projects and handoff files."""

from __future__ import annotations

import json
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import config
from config import utc_now
from db import db, event, row_dict

LIBRARY_SCHEMA = "grok-crew.project-library/v1"
TRASH_ROOT = Path(".trash")
PURGE_DAYS = 30
DUE_SOON_DAYS = 3
MAX_FOLDERS = 24
TITLE_MAX = 80
SOURCE_ACTIONS = {"keep", "trash", "delete"}
OWNED_MEDIA_ROOTS = {"inputs", "handoff-materials"}
OPEN_JOB_STATUSES = {"queued", "running"}
OPEN_CONTROL_STATUSES = {
    "queued", "claimed", "analyzing", "planning", "needs_input",
    "proposal_ready", "applied", "rendering", "rendered",
    "publish_waiting", "publishing", "cancel_requested",
    "pause_requested", "paused", "conflict",
}

PROJECT_PURGE_SQL = (
    "DELETE FROM runner_events WHERE control_job_id IN (SELECT id FROM control_jobs WHERE project_id = ?)",
    "DELETE FROM control_jobs WHERE project_id = ?",
    "DELETE FROM jobs WHERE project_id = ?",
    "DELETE FROM timeline_versions WHERE project_id = ?",
    "DELETE FROM timeline_history WHERE project_id = ?",
    "DELETE FROM media_proxies WHERE project_id = ?",
    "DELETE FROM publish_receipts WHERE project_id = ?",
    "DELETE FROM project_analysis WHERE project_id = ?",
    "DELETE FROM project_artifacts WHERE project_id = ?",
    "DELETE FROM events WHERE project_id = ?",
    "DELETE FROM projects WHERE id = ?",
)


def _parse_iso(value: str) -> datetime:
    text = str(value or "").strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    stamp = datetime.fromisoformat(text)
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp


def _purge_after(trashed_at: str) -> str:
    try:
        return (_parse_iso(trashed_at) + timedelta(days=PURGE_DAYS)).isoformat(timespec="seconds")
    except ValueError:
        return (_parse_iso(utc_now()) + timedelta(days=PURGE_DAYS)).isoformat(timespec="seconds")


def _expired(purge_after: str, now: datetime | None = None) -> bool:
    stamp = now or datetime.now(timezone.utc)
    try:
        return _parse_iso(purge_after) <= stamp
    except ValueError:
        return False


def _safe_title(title: str) -> str:
    text = " ".join(str(title or "").split())
    if not text:
        raise ValueError("title is required.")
    return text[:TITLE_MAX]


_WINDOWS_RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}


def _safe_id(value: str) -> str:
    text = str(value or "").strip()
    if not text or len(text) > 64 or "/" in text or "\\" in text or "\x00" in text or ".." in text:
        raise ValueError("id is not allowed.")
    return text


def _safe_file_name(name: str) -> str:
    text = str(name or "").strip().replace("\x00", "").rstrip(" .")
    if not text or text in {".", ".."} or "/" in text or "\\" in text or text.startswith("."):
        raise ValueError("file name is not allowed.")
    if Path(text).name != text:
        raise ValueError("file name is not allowed.")
    if Path(text).stem.upper() in _WINDOWS_RESERVED:
        raise ValueError("file name is not allowed.")
    return text[:120]


def _resolve_stored_trash(item_id: str, trash_rel: str) -> Path:
    item_id = _safe_id(item_id)
    rel = Path(str(trash_rel or "").replace("\\", "/"))
    if rel.is_absolute() or ".." in rel.parts or len(rel.parts) != 3:
        raise ValueError("path is not allowed.")
    if rel.parts[0] != TRASH_ROOT.as_posix() or rel.parts[1] != item_id:
        raise ValueError("path is not allowed.")
    name = rel.parts[2]
    if not name or name in {".", ".."} or "/" in name or "\\" in name or "\x00" in name:
        raise ValueError("path is not allowed.")
    workspace = config.WORKSPACE_DIR.resolve()
    trash_root = (workspace / TRASH_ROOT).resolve()
    if trash_root.parent != workspace:
        raise ValueError("path is not allowed.")
    expected = (trash_root / item_id).resolve()
    if expected.parent != trash_root:
        raise ValueError("path leaves the allowed root.")
    target = (expected / name).resolve()
    if target.parent != expected:
        raise ValueError("path leaves the allowed root.")
    return target


def _trash_dir() -> Path:
    workspace = config.WORKSPACE_DIR.resolve()
    folder = (workspace / TRASH_ROOT).resolve()
    if folder.parent != workspace:
        raise ValueError("trash leaves the workspace.")
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def ensure_library_schema(conn: Any) -> None:
    from db import _ensure_column

    _ensure_column(conn, "projects", "folder_id", "TEXT")
    _ensure_column(conn, "projects", "trashed_at", "TEXT")
    conn.execute(
        """CREATE TABLE IF NOT EXISTS project_folders (
            id TEXT PRIMARY KEY, title TEXT NOT NULL,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS trash_items (
            id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL,
            original_path TEXT, trash_path TEXT, payload_json TEXT NOT NULL,
            trashed_at TEXT NOT NULL, purge_after TEXT NOT NULL
        )"""
    )


def list_project_folders() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM project_folders ORDER BY sort_order ASC, title ASC").fetchall()
    return [row_dict(row) or {} for row in rows]


def create_project_folder(title: str) -> dict[str, Any]:
    name = _safe_title(title)
    with db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM project_folders").fetchone()[0]
        if int(count) >= MAX_FOLDERS:
            raise ValueError(f"at most {MAX_FOLDERS} folders.")
        now = utc_now()
        folder_id = f"fld_{uuid.uuid4().hex[:12]}"
        conn.execute(
            "INSERT INTO project_folders (id, title, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?)",
            (folder_id, name, now, now, int(count)),
        )
        row = conn.execute("SELECT * FROM project_folders WHERE id = ?", (folder_id,)).fetchone()
    event(None, None, "project_folder_created", {"id": folder_id, "title": name})
    return row_dict(row) or {}


def rename_project_folder(folder_id: str, title: str) -> dict[str, Any]:
    folder_id = _safe_id(folder_id)
    name = _safe_title(title)
    with db() as conn:
        exists = conn.execute("SELECT id FROM project_folders WHERE id = ?", (folder_id,)).fetchone()
        if not exists:
            raise ValueError("folder not found.")
        conn.execute(
            "UPDATE project_folders SET title = ?, updated_at = ? WHERE id = ?",
            (name, utc_now(), folder_id),
        )
        row = conn.execute("SELECT * FROM project_folders WHERE id = ?", (folder_id,)).fetchone()
    return row_dict(row) or {}


def delete_project_folder(folder_id: str) -> dict[str, Any]:
    folder_id = _safe_id(folder_id)
    with db() as conn:
        row = conn.execute("SELECT * FROM project_folders WHERE id = ?", (folder_id,)).fetchone()
        if not row:
            raise ValueError("folder not found.")
        folder = row_dict(row) or {}
        project_ids = [
            str(item["id"])
            for item in conn.execute(
                "SELECT id FROM projects WHERE folder_id = ? AND trashed_at IS NULL",
                (folder_id,),
            ).fetchall()
        ]
        conn.execute("UPDATE projects SET folder_id = NULL WHERE folder_id = ?", (folder_id,))
        conn.execute("DELETE FROM project_folders WHERE id = ?", (folder_id,))
    event(None, None, "project_folder_deleted", {"id": folder_id, "project_count": len(project_ids)})
    return {
        "ok": True,
        "id": folder_id,
        "title": folder.get("title"),
        "sort_order": folder.get("sort_order") or 0,
        "project_ids": project_ids,
    }


def undelete_project_folder(
    folder_id: str,
    title: str,
    project_ids: list[Any] | None = None,
    sort_order: int = 0,
) -> dict[str, Any]:
    wanted_id = _safe_id(folder_id)
    name = _safe_title(title)
    ids = [str(item).strip() for item in (project_ids or []) if str(item or "").strip()]
    with db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM project_folders").fetchone()[0]
        if int(count) >= MAX_FOLDERS:
            raise ValueError(f"at most {MAX_FOLDERS} folders.")
        exists = conn.execute("SELECT id FROM project_folders WHERE id = ?", (wanted_id,)).fetchone()
        next_id = f"fld_{uuid.uuid4().hex[:12]}" if exists else wanted_id
        now = utc_now()
        conn.execute(
            "INSERT INTO project_folders (id, title, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?)",
            (next_id, name, now, now, max(0, int(sort_order or 0))),
        )
        restored = 0
        for project_id in ids:
            try:
                _require_live_project(conn, project_id)
            except ValueError:
                continue
            conn.execute(
                "UPDATE projects SET folder_id = ?, updated_at = ? WHERE id = ?",
                (next_id, now, project_id),
            )
            restored += 1
        row = conn.execute("SELECT * FROM project_folders WHERE id = ?", (next_id,)).fetchone()
    event(None, None, "project_folder_undeleted", {"id": next_id, "restored": restored})
    return row_dict(row) or {}


def _require_live_project(conn: Any, project_id: str, *, allow_trashed: bool = False) -> Any:
    project_id = _safe_id(project_id)
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        raise ValueError("project not found.")
    if row["trashed_at"] and not allow_trashed:
        raise ValueError("project is in the trash.")
    return row


def rename_project(project_id: str, title: str) -> dict[str, Any]:
    name = _safe_title(title)
    with db() as conn:
        _require_live_project(conn, project_id)
        conn.execute(
            "UPDATE projects SET title = ?, updated_at = ? WHERE id = ?",
            (name, utc_now(), project_id),
        )
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    event(project_id, None, "project_renamed", {"title": name})
    return row_dict(row) or {}


def move_project(project_id: str, folder_id: str | None) -> dict[str, Any]:
    target = _safe_id(str(folder_id)) if str(folder_id or "").strip() else None
    with db() as conn:
        _require_live_project(conn, project_id)
        if target:
            folder = conn.execute("SELECT id FROM project_folders WHERE id = ?", (target,)).fetchone()
            if not folder:
                raise ValueError("folder not found.")
        conn.execute(
            "UPDATE projects SET folder_id = ?, updated_at = ? WHERE id = ?",
            (target, utc_now(), project_id),
        )
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    event(project_id, None, "project_moved", {"folder_id": target})
    return row_dict(row) or {}


def _stop_project_work(project_id: str) -> dict[str, int]:
    from desktop_domain import control_control_job, list_control_jobs, resolve_control_conflict
    from studio_server import list_jobs, request_job_cancel, update_job

    stopped = {"jobs": 0, "control_jobs": 0}
    for job in list_jobs(project_id):
        status = str(job.get("status") or "")
        if status not in OPEN_JOB_STATUSES:
            continue
        try:
            if status == "queued":
                update_job(str(job["id"]), status="cancelled", error="project moved to trash")
            request_job_cancel(str(job["id"]))
            stopped["jobs"] += 1
        except Exception:
            continue
    for job in list_control_jobs(project_id):
        status = str(job.get("status") or "")
        if status not in OPEN_CONTROL_STATUSES:
            continue
        try:
            if status == "conflict":
                resolve_control_conflict(str(job["id"]), "discard")
            else:
                control_control_job(str(job["id"]), "cancel", "project_trashed")
            stopped["control_jobs"] += 1
        except Exception:
            continue
    return stopped


def trash_project(project_id: str) -> dict[str, Any]:
    now = utc_now()
    with db() as conn:
        row = _require_live_project(conn, project_id)
        if row["trashed_at"]:
            raise ValueError("project is already in the trash.")
        conn.execute(
            "UPDATE projects SET trashed_at = ?, updated_at = ? WHERE id = ?",
            (now, now, project_id),
        )
        next_row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    stopped = _stop_project_work(project_id)
    event(project_id, None, "project_trashed", {"trashed_at": now, **stopped})
    payload = row_dict(next_row) or {}
    payload["stopped"] = stopped
    return payload


def restore_project(project_id: str) -> dict[str, Any]:
    with db() as conn:
        row = _require_live_project(conn, project_id, allow_trashed=True)
        if not row["trashed_at"]:
            raise ValueError("project is not in the trash.")
        conn.execute(
            "UPDATE projects SET trashed_at = NULL, updated_at = ? WHERE id = ?",
            (utc_now(), project_id),
        )
        next_row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    event(project_id, None, "project_restored", {})
    return row_dict(next_row) or {}


def _purge_project_row(conn: Any, project_id: str) -> None:
    for statement in PROJECT_PURGE_SQL:
        conn.execute(statement, (project_id,))


def _owned_media_rel(source_path: str) -> str:
    raw = str(source_path or "").strip()
    if not raw:
        raise ValueError("path is required.")
    try:
        resolved = config.workspace_path(raw)
    except ValueError as exc:
        raise ValueError("path leaves the workspace.") from exc
    rel = resolved.relative_to(config.WORKSPACE_DIR.resolve()).as_posix()
    parts = Path(rel).parts
    if not parts or parts[0] not in OWNED_MEDIA_ROOTS or ".." in parts:
        raise ValueError("only files under inputs or handoff-materials can be used.")
    if any(part in {".", ".."} or part.startswith(".") for part in parts):
        raise ValueError("path is not allowed.")
    return rel


def resolve_owned_media_destination(rel_path: str) -> Path:
    rel = _owned_media_rel(rel_path)
    workspace = config.WORKSPACE_DIR.resolve()
    dest = (workspace / rel).resolve()
    if dest == workspace or workspace not in dest.parents:
        raise ValueError("path leaves the workspace.")
    return dest


def _source_file_exists(source_path: str) -> bool:
    try:
        return resolve_owned_media_destination(source_path).is_file()
    except ValueError:
        return False


def _trash_owned_media(rel_path: str) -> dict[str, Any]:
    from handoff_folders import parse_handoff_rel, _source_paths

    rel = _owned_media_rel(rel_path)
    try:
        parse_handoff_rel(rel)
        return trash_workspace_file(rel)
    except ValueError:
        pass
    target = resolve_owned_media_destination(rel)
    if not target.is_file():
        raise ValueError("file not found.")
    if target in _source_paths():
        raise ValueError("file is the project's source and cannot be deleted.")
    now = utc_now()
    item_id = f"trs_{uuid.uuid4().hex[:16]}"
    dest_dir = (_trash_dir() / item_id).resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = (dest_dir / target.name).resolve()
    if dest.parent != dest_dir:
        raise ValueError("path leaves the allowed root.")
    shutil.move(str(target), str(dest))
    with db() as conn:
        conn.execute(
            "INSERT INTO trash_items (id, kind, title, original_path, trash_path, payload_json, trashed_at, purge_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                item_id,
                "file",
                target.name,
                rel,
                f"{TRASH_ROOT.as_posix()}/{item_id}/{target.name}",
                json.dumps({"kind": "file", "original_path": rel, "name": target.name}),
                now,
                _purge_after(now),
            ),
        )
        row = conn.execute("SELECT * FROM trash_items WHERE id = ?", (item_id,)).fetchone()
    event(None, None, "file_trashed", {"path": rel, "id": item_id})
    return row_dict(row) or {}


def _dispose_project_source(source_path: str, action: str) -> dict[str, Any]:
    from handoff_folders import _source_paths

    if action == "keep":
        return {"source": "kept"}
    try:
        rel = _owned_media_rel(source_path)
        target = resolve_owned_media_destination(rel)
    except ValueError:
        return {"source": "skipped"}
    if not target.is_file():
        return {"source": "missing"}
    if target in _source_paths():
        return {"source": "in_use"}
    if action == "delete":
        target.unlink()
        return {"source": "deleted", "path": rel}
    item = _trash_owned_media(rel)
    return {"source": "trashed", "path": rel, "trash_id": item.get("id")}


def purge_project(project_id: str, source_action: str = "keep") -> dict[str, Any]:
    action = str(source_action or "keep").strip().lower()
    if action not in SOURCE_ACTIONS:
        raise ValueError("source action must be keep, trash, or delete.")
    with db() as conn:
        row = _require_live_project(conn, project_id, allow_trashed=True)
        if not row["trashed_at"]:
            raise ValueError("empty the trash or wait 30 days to delete a project for good.")
        source_path = str(row["source_path"] or "")
        _purge_project_row(conn, project_id)
    disposed = _dispose_project_source(source_path, action)
    event(None, None, "project_purged", {"id": project_id, "source_action": action, **disposed})
    return {"ok": True, "id": project_id, "purged": True, "source_action": action, **disposed}


def trash_workspace_file(rel_path: str) -> dict[str, Any]:
    from handoff_folders import MATERIALS_ROOT, _pop_clip_from_manifest, _resolve_handoff_file, _restore_clip_to_manifest, _source_paths

    target, parts = _resolve_handoff_file(rel_path)
    if target in _source_paths():
        raise ValueError("file is the project's source and cannot be deleted.")
    original = "/".join(parts)
    now = utc_now()
    item_id = f"trs_{uuid.uuid4().hex[:16]}"
    dest_dir = (_trash_dir() / item_id).resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = (dest_dir / target.name).resolve()
    if dest.parent != dest_dir:
        raise ValueError("path leaves the allowed root.")
    clip_meta = None
    moved = False
    try:
        shutil.move(str(target), str(dest))
        moved = True
        if parts[0] == "handoff-materials":
            clip_meta = _pop_clip_from_manifest(config.WORKSPACE_DIR / MATERIALS_ROOT / parts[1], target.name)
        payload = {
            "kind": "file",
            "original_path": original,
            "name": target.name,
            "parts": list(parts),
            "clip": clip_meta,
        }
        with db() as conn:
            conn.execute(
                "INSERT INTO trash_items (id, kind, title, original_path, trash_path, payload_json, trashed_at, purge_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    item_id,
                    "file",
                    target.name,
                    original,
                    f"{TRASH_ROOT.as_posix()}/{item_id}/{target.name}",
                    json.dumps(payload),
                    now,
                    _purge_after(now),
                ),
            )
            row = conn.execute("SELECT * FROM trash_items WHERE id = ?", (item_id,)).fetchone()
    except Exception:
        if moved and dest.is_file() and not target.exists():
            shutil.move(str(dest), str(target))
            if clip_meta is not None:
                _restore_clip_to_manifest(config.WORKSPACE_DIR / MATERIALS_ROOT / parts[1], target.name, clip_meta)
        raise
    event(None, None, "file_trashed", {"path": original, "id": item_id})
    return row_dict(row) or {}


def rename_workspace_file(rel_path: str, name: str) -> dict[str, Any]:
    from handoff_folders import MATERIALS_ROOT, _file_kind, _resolve_handoff_file, _source_paths

    target, parts = _resolve_handoff_file(rel_path)
    if target in _source_paths():
        raise ValueError("file is the project's source and cannot be renamed.")
    next_name = _safe_file_name(name)
    if _file_kind(Path(next_name)) is None:
        raise ValueError("file type is not allowed.")
    destination = target.with_name(next_name)
    if destination.exists():
        raise ValueError("a file with that name already exists.")
    if destination.parent != target.parent:
        raise ValueError("file name is not allowed.")
    target.rename(destination)
    if parts[0] == "handoff-materials":
        _rename_clip_in_manifest(config.WORKSPACE_DIR / MATERIALS_ROOT / parts[1], target.name, next_name)
    next_path = "/".join((*parts[:-1], next_name))
    event(None, None, "file_renamed", {"from": "/".join(parts), "to": next_path})
    return {"ok": True, "path": next_path, "name": next_name}


def _rename_clip_in_manifest(folder: Path, old_name: str, new_name: str) -> None:
    from handoff_materials import _read_manifest

    manifest = _read_manifest(folder)
    if not isinstance(manifest, dict):
        return
    clips = manifest.get("clips")
    if not isinstance(clips, list):
        return
    changed = False
    for raw in clips:
        if isinstance(raw, dict) and Path(str(raw.get("file") or "")).name.lower() == old_name.lower():
            raw["file"] = new_name
            changed = True
    if not changed:
        return
    (folder / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _restore_file_item(item: dict[str, Any]) -> dict[str, Any]:
    from handoff_folders import MATERIALS_ROOT, parse_handoff_rel, resolve_handoff_destination, _restore_clip_to_manifest

    original = str(item.get("original_path") or "")
    try:
        original_parts = parse_handoff_rel(original)
        dest = resolve_handoff_destination(original_parts)
        original = "/".join(original_parts)
    except ValueError:
        original_parts = Path(_owned_media_rel(original)).parts
        dest = resolve_owned_media_destination(original)
        original = "/".join(original_parts)
    trash_abs = _resolve_stored_trash(str(item.get("id") or ""), str(item.get("trash_path") or ""))
    if dest.exists():
        raise ValueError("the original path already has a file.")
    if not trash_abs.is_file():
        raise ValueError("trashed file is missing.")
    workspace = config.WORKSPACE_DIR.resolve()
    parent = dest.parent
    if not parent.exists():
        allowed_parents = {
            workspace,
            (workspace / "inputs").resolve(),
            (workspace / "inputs" / "handoff").resolve(),
            (workspace / "handoff-materials").resolve(),
        }
        if parent.parent not in allowed_parents:
            raise ValueError("original folder is missing.")
        parent.mkdir(exist_ok=True)
    shutil.move(str(trash_abs), str(dest))
    leftover = trash_abs.parent
    if leftover.is_dir() and not any(leftover.iterdir()):
        leftover.rmdir()
    payload = item.get("payload_json")
    clip_meta = None
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            payload = {}
    if isinstance(payload, dict):
        clip_meta = payload.get("clip") if isinstance(payload.get("clip"), dict) else None
    if original_parts and original_parts[0] == "handoff-materials":
        _restore_clip_to_manifest(config.WORKSPACE_DIR / MATERIALS_ROOT / original_parts[1], dest.name, clip_meta)
    with db() as conn:
        conn.execute("DELETE FROM trash_items WHERE id = ?", (item["id"],))
    event(None, None, "file_restored", {"path": original, "id": item["id"]})
    return {"ok": True, "id": item["id"], "path": original, "kind": "file"}


def _purge_file_item(item: dict[str, Any]) -> None:
    trash_rel = str(item.get("trash_path") or "")
    if trash_rel:
        try:
            trash_abs = _resolve_stored_trash(str(item.get("id") or ""), trash_rel)
        except ValueError:
            trash_abs = None
        if trash_abs is not None and trash_abs.is_file():
            trash_abs.unlink()
            leftover = trash_abs.parent
            if leftover.is_dir() and not any(leftover.iterdir()):
                leftover.rmdir()
    with db() as conn:
        conn.execute("DELETE FROM trash_items WHERE id = ?", (item["id"],))


def _file_trash_rows() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM trash_items WHERE kind = 'file' ORDER BY trashed_at DESC").fetchall()
    items = []
    for row in rows:
        item = row_dict(row) or {}
        items.append({
            "id": item["id"],
            "kind": "file",
            "title": item["title"],
            "original_path": item.get("original_path"),
            "trashed_at": item["trashed_at"],
            "purge_after": item["purge_after"],
        })
    return items


def _project_trash_rows() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            "SELECT id, title, source_path, trashed_at FROM projects WHERE trashed_at IS NOT NULL ORDER BY trashed_at DESC"
        ).fetchall()
    items = []
    for row in rows:
        item = row_dict(row) or {}
        source_path = str(item.get("source_path") or "")
        items.append({
            "id": item["id"],
            "kind": "project",
            "title": item["title"],
            "original_path": source_path or None,
            "has_source": _source_file_exists(source_path),
            "trashed_at": item["trashed_at"],
            "purge_after": _purge_after(item["trashed_at"]),
        })
    return items


def list_trash() -> dict[str, Any]:
    items = _project_trash_rows() + _file_trash_rows()
    items.sort(key=lambda item: str(item.get("trashed_at") or ""), reverse=True)
    now = datetime.now(timezone.utc)
    expired = 0
    due_soon = 0
    horizon = now + timedelta(days=DUE_SOON_DAYS)
    for item in items:
        stamp = str(item.get("purge_after") or "")
        if _expired(stamp, now):
            expired += 1
            continue
        try:
            if _parse_iso(stamp) <= horizon:
                due_soon += 1
        except ValueError:
            continue
    return {
        "schema": LIBRARY_SCHEMA,
        "purge_days": PURGE_DAYS,
        "due_soon_days": DUE_SOON_DAYS,
        "expired": expired,
        "due_soon": due_soon,
        "items": items,
    }


def restore_trash_item(item_id: str) -> dict[str, Any]:
    item_id = _safe_id(item_id)
    with db() as conn:
        project = conn.execute("SELECT id, trashed_at FROM projects WHERE id = ?", (item_id,)).fetchone()
        file_row = conn.execute("SELECT * FROM trash_items WHERE id = ?", (item_id,)).fetchone()
    if project and project["trashed_at"]:
        restored = restore_project(item_id)
        return {"ok": True, "kind": "project", "project": restored}
    if file_row:
        return _restore_file_item(row_dict(file_row) or {})
    raise ValueError("trash item not found.")


def purge_trash_item(item_id: str, source_action: str = "keep") -> dict[str, Any]:
    item_id = _safe_id(item_id)
    with db() as conn:
        project = conn.execute("SELECT id, trashed_at FROM projects WHERE id = ?", (item_id,)).fetchone()
        file_row = conn.execute("SELECT * FROM trash_items WHERE id = ?", (item_id,)).fetchone()
    if project and project["trashed_at"]:
        return purge_project(item_id, source_action=source_action)
    if file_row:
        _purge_file_item(row_dict(file_row) or {})
        return {"ok": True, "id": item_id, "purged": True, "kind": "file"}
    raise ValueError("trash item not found.")


def empty_trash() -> dict[str, Any]:
    listed = list_trash()
    count = 0
    errors = 0
    for item in listed["items"]:
        try:
            purge_trash_item(item["id"])
            count += 1
        except Exception:
            errors += 1
    return {"ok": errors == 0, "purged": count}


def purge_expired_trash() -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    try:
        listed = list_trash()
    except Exception:
        return {"ok": False, "purged": 0}
    count = 0
    for item in listed["items"]:
        try:
            if _expired(str(item.get("purge_after") or ""), now):
                purge_trash_item(str(item["id"]))
                count += 1
        except Exception:
            continue
    return {"ok": True, "purged": count}


def library_payload() -> dict[str, Any]:
    return {
        "schema": LIBRARY_SCHEMA,
        "folders": list_project_folders(),
        "trash": list_trash(),
    }
