"""Apply bot-owned handoff packages from a local inbox (and optional git).

Two doors, never mixed:

- Editor door: local_studio/workspace/handoff-inbox/editor/
- Collector door: local_studio/workspace/handoff-inbox/collector/

A remote bot never calls this PC. It pushes a folder. The operator (or this
sidecar, on the operator's click) copies media into the workspace and imports
the bundle through the existing local API.
"""

from __future__ import annotations

import json
import os
import shutil
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import config
from edit_spec import (
    COLLECTOR_DOOR,
    COLLECTOR_DOOR_ALIASES,
    EDITOR_DOOR,
    EDITOR_DOOR_ALIASES,
    attach_spec_project,
    door_folder,
    door_folder_aliases,
    get_spec,
    normalize_agent,
    normalize_door,
    resolve_sender,
)
from handoff_materials import find_materials_clip, materials_status
from handoff_outbox import outbox_status

BUNDLE_SCHEMA = "local-video-workspace.project-bundle/v1"
ALLOWED_MEDIA_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
MAX_MEDIA_BYTES = int(os.getenv("HANDOFF_MAX_MEDIA_BYTES", str(2 * 1024 ** 3)))
MAX_BUNDLE_BYTES = int(os.getenv("HANDOFF_MAX_BUNDLE_BYTES", str(4 * 1024 * 1024)))
DEFAULT_MAX_PACKAGES_PER_CYCLE = 5
RESERVED_INBOX_NAMES = {".git", ".processed", "editor", "collector", "grok", "agents", "agent"}
HANDOFF_MEDIA_PREFIX = Path("inputs") / "handoff"
_PULL_LOCK = threading.Lock()


def local_inbox_dir() -> Path:
    path = (config.WORKSPACE_DIR / "handoff-inbox").resolve()
    path.mkdir(parents=True, exist_ok=True)
    (path / ".processed").mkdir(parents=True, exist_ok=True)
    for folder in ("editor", "collector"):
        door_dir = path / folder
        door_dir.mkdir(parents=True, exist_ok=True)
        (door_dir / ".processed").mkdir(parents=True, exist_ok=True)
    return path


def door_inbox_dir(door: str) -> Path:
    normalized = normalize_door(door, required=True)
    path = (local_inbox_dir() / door_folder(normalized)).resolve()
    path.mkdir(parents=True, exist_ok=True)
    (path / ".processed").mkdir(parents=True, exist_ok=True)
    return path


def infer_package_door(project: dict[str, Any], folder: Path | None = None) -> str:
    raw = project.get("door")
    if raw not in (None, ""):
        return normalize_door(raw, required=True)
    created = str(project.get("created_by") or "").strip().lower().replace("_", "-")
    if created in EDITOR_DOOR_ALIASES:
        return EDITOR_DOOR
    if created:
        return COLLECTOR_DOOR
    if folder is not None:
        parent = folder.parent.name.lower()
        if parent in EDITOR_DOOR_ALIASES or parent in {EDITOR_DOOR, "grok"}:
            return EDITOR_DOOR
        if parent in COLLECTOR_DOOR_ALIASES or parent in {COLLECTOR_DOOR, "agents", "agent"}:
            return COLLECTOR_DOOR
    return EDITOR_DOOR


def media_relpaths(project: dict[str, Any]) -> list[str]:
    paths: list[str] = []
    seen: set[str] = set()

    def add(value: Any) -> None:
        text = str(value or "").strip()
        if not text:
            return
        key = Path(text).name.lower()
        if key in seen:
            return
        seen.add(key)
        paths.append(text)

    add(project.get("source_path"))
    timeline = project.get("timeline")
    if isinstance(timeline, dict):
        for asset in timeline.get("assets") or []:
            if isinstance(asset, dict):
                add(asset.get("path"))
    return paths


def copy_media(folder: Path, workspace: Path, relative_path: str) -> None:
    source = folder / Path(relative_path).name
    if not source.is_file():
        raise RuntimeError(f"Media file '{source.name}' referenced by the bundle was not found in the package.")
    if source.suffix.lower() not in ALLOWED_MEDIA_EXTENSIONS:
        raise RuntimeError(f"Media file '{source.name}' has an unsupported extension. Allowed: {', '.join(sorted(ALLOWED_MEDIA_EXTENSIONS))}.")
    size = source.stat().st_size
    if size > MAX_MEDIA_BYTES:
        raise RuntimeError(f"Media file '{source.name}' is {size} bytes, over the {MAX_MEDIA_BYTES}-byte handoff limit (set HANDOFF_MAX_MEDIA_BYTES to change it).")
    destination = resolve_handoff_media_destination(workspace, relative_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)


def resolve_handoff_media_destination(workspace: Path, relative_path: str) -> Path:
    text = str(relative_path or "").replace("\\", "/").lstrip("/")
    if not text or ".." in Path(text).parts:
        raise RuntimeError(f"Refusing to write outside the workspace: {relative_path}")
    root = workspace.resolve()
    destination = (root / text).resolve()
    if destination != root and root not in destination.parents:
        raise RuntimeError(f"Refusing to write outside the workspace: {relative_path}")
    allowed = (root / HANDOFF_MEDIA_PREFIX).resolve()
    if destination != allowed and allowed not in destination.parents:
        raise RuntimeError("Handoff media must land under inputs/handoff/.")
    return destination


def copy_package_media(folder: Path, workspace: Path, project: dict[str, Any]) -> list[str]:
    copied: list[str] = []
    for relative in media_relpaths(project):
        copy_media(folder, workspace, relative)
        copied.append(relative)
    if not copied:
        raise RuntimeError("The package must include a source video. The operator does not supply footage.")
    return copied


def _read_bundle(folder: Path) -> tuple[dict[str, Any] | None, str | None]:
    bundle_path = folder / "bundle.json"
    if not bundle_path.exists():
        return None, "no bundle.json"
    bundle_size = bundle_path.stat().st_size
    if bundle_size > MAX_BUNDLE_BYTES:
        return None, f"bundle.json is {bundle_size} bytes, over the {MAX_BUNDLE_BYTES}-byte limit"
    try:
        bundle = json.loads(bundle_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return None, f"invalid bundle.json ({exc})"
    if not isinstance(bundle, dict) or bundle.get("schema") != BUNDLE_SCHEMA:
        return None, f"bundle.json must use schema {BUNDLE_SCHEMA}"
    project = bundle.get("project")
    if not isinstance(project, dict) or not project.get("source_path"):
        return None, "bundle.project.source_path is required"
    return bundle, None


def apply_package_local(
    folder: Path,
    workspace: Path | None = None,
    *,
    expected_door: str | None = None,
) -> dict[str, Any]:
    """Copy bot media and import the bundle in-process. Does not open a port."""
    from studio_server import import_project_bundle

    workspace = (workspace or config.WORKSPACE_DIR).resolve()
    bundle, reason = _read_bundle(folder)
    if bundle is None:
        return {"ok": False, "folder": folder.name, "reason": reason}
    project = bundle["project"]
    try:
        package_door = infer_package_door(project, folder)
    except ValueError as exc:
        return {"ok": False, "folder": folder.name, "reason": str(exc), "door": None}
    if expected_door:
        wanted = normalize_door(expected_door, required=True)
        if package_door != wanted:
            return {
                "ok": False,
                "folder": folder.name,
                "reason": f"package belongs to the {package_door} door, not {wanted}",
                "door": package_door,
            }
    spec_id = str(project.get("edit_spec_id") or "").strip()
    spec_record = get_spec(spec_id) if spec_id else None
    spec_payload = spec_record.get("spec") if spec_record and isinstance(spec_record.get("spec"), dict) else {}
    if spec_record:
        spec_door = normalize_door(spec_record.get("door") or spec_payload.get("door"))
        if spec_payload.get("crew"):
            if package_door == COLLECTOR_DOOR:
                return {
                    "ok": False,
                    "folder": folder.name,
                    "reason": "the collector drops clips in handoff-materials, not a finished cut in the inbox",
                    "door": package_door,
                }
        elif spec_door != package_door:
            return {
                "ok": False,
                "folder": folder.name,
                "reason": f"edit_spec_id belongs to the {spec_door} door, not {package_door}",
                "door": package_door,
            }
    try:
        _door, sender = resolve_sender(
            {**project, "door": package_door},
            {"door": package_door, "agent": spec_record.get("agent") if spec_record else spec_payload.get("agent")},
        )
        sender = normalize_agent(sender, package_door)
    except ValueError as exc:
        return {"ok": False, "folder": folder.name, "reason": str(exc), "door": package_door}
    project["door"] = package_door
    project["created_by"] = sender
    project["agent"] = sender
    try:
        copied = copy_package_media(folder, workspace, project)
    except RuntimeError as exc:
        return {"ok": False, "folder": folder.name, "reason": str(exc), "door": package_door}
    try:
        imported = import_project_bundle({"bundle": bundle})
    except (RuntimeError, ValueError) as exc:
        return {"ok": False, "folder": folder.name, "reason": f"import failed ({exc})", "door": package_door}
    created = imported.get("project") if isinstance(imported.get("project"), dict) else {}
    if spec_id and created.get("id"):
        attach_spec_project(spec_id, str(created["id"]))
    return {
        "ok": True,
        "folder": folder.name,
        "project": created,
        "jobs": imported.get("jobs") if isinstance(imported.get("jobs"), list) else [],
        "copied": copied,
        "edit_spec_id": spec_id or None,
        "door": package_door,
        "agent": sender,
    }


def pending_inbox_folders(inbox: Path | None = None) -> list[Path]:
    root = inbox or local_inbox_dir()
    reserved = {".git", ".processed"}
    if root.name == "handoff-inbox":
        reserved |= RESERVED_INBOX_NAMES
    return [item for item in sorted(root.iterdir()) if item.is_dir() and item.name not in reserved]


def pending_inbox_media_for_door(door: str) -> list[Path]:
    """Loose finished cuts left in the door inbox (not a bundle folder)."""
    normalized = normalize_door(door, required=True)
    inbox = local_inbox_dir()
    roots = [inbox / alias for alias in door_folder_aliases(normalized)]
    if normalized == EDITOR_DOOR:
        roots.append(inbox)
    seen: set[str] = set()
    files: list[Path] = []
    for root in roots:
        if not root.is_dir():
            continue
        for item in sorted(root.iterdir()):
            if not item.is_file():
                continue
            suffix = item.suffix.lower()
            if suffix not in ALLOWED_MEDIA_EXTENSIONS and suffix != ".m4v":
                continue
            if item.name in seen:
                continue
            seen.add(item.name)
            files.append(item)
    return files


def wrap_loose_inbox_media(door: str) -> list[Path]:
    wrapped: list[Path] = []
    for media in pending_inbox_media_for_door(door):
        written = _write_cut_package(media, door=door, edit_spec_id=None, title=media.stem)
        dest = Path(written["path"])
        try:
            if media.resolve() != dest.resolve() and media.is_file():
                media.unlink()
        except OSError:
            pass
        wrapped.append(dest)
    return wrapped


def pending_inbox_folders_for_door(door: str) -> list[Path]:
    normalized = normalize_door(door, required=True)
    inbox = local_inbox_dir()
    seen: set[str] = set()
    folders: list[Path] = []
    for alias in door_folder_aliases(normalized):
        door_dir = inbox / alias
        if not door_dir.is_dir():
            continue
        for folder in pending_inbox_folders(door_dir):
            if folder.name in seen:
                continue
            seen.add(folder.name)
            folders.append(folder)
    if normalized == EDITOR_DOOR:
        for folder in pending_inbox_folders(inbox):
            if folder.name in seen:
                continue
            seen.add(folder.name)
            folders.append(folder)
    return folders


def _archive_folder(folder: Path, door: str) -> None:
    processed = door_inbox_dir(door) / ".processed" / folder.name
    if processed.exists():
        shutil.rmtree(processed)
    shutil.move(str(folder), str(processed))


def pull_local_inbox(
    *,
    door: str = EDITOR_DOOR,
    max_per_cycle: int = DEFAULT_MAX_PACKAGES_PER_CYCLE,
) -> dict[str, Any]:
    with _PULL_LOCK:
        return _pull_local_inbox_locked(door=door, max_per_cycle=max_per_cycle)


def _pull_local_inbox_locked(
    *,
    door: str,
    max_per_cycle: int,
) -> dict[str, Any]:
    normalized = normalize_door(door, required=True)
    wrap_loose_inbox_media(normalized)
    folders = pending_inbox_folders_for_door(normalized)
    selected = folders[: max(1, int(max_per_cycle))]
    results: list[dict[str, Any]] = []
    for folder in selected:
        result = apply_package_local(folder, expected_door=normalized)
        if result.get("ok"):
            _archive_folder(folder, normalized)
        results.append(result)
    return {
        "source": "local-inbox",
        "door": normalized,
        "inbox_dir": str(door_inbox_dir(normalized)),
        "pending": len(folders),
        "processed": results,
        "imported": [item for item in results if item.get("ok")],
        "skipped": [item for item in results if not item.get("ok")],
    }


def _utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")


def _safe_stem(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in (value or ""))
    return (cleaned.strip("-")[:24] or "cut")


def _resolve_drop_path(path: str) -> Path:
    text = str(path or "").strip()
    if not text or "\x00" in text:
        raise ValueError("파일이 없습니다.")
    raw = Path(text).expanduser()
    workspace = config.WORKSPACE_DIR.resolve()
    if not raw.is_absolute():
        if ".." in raw.parts:
            raise ValueError("이 작업 공간 밖의 상대 경로는 쓸 수 없습니다.")
        resolved = (workspace / raw).resolve()
        if resolved != workspace and workspace not in resolved.parents:
            raise ValueError("이 작업 공간 안의 파일만 고를 수 있습니다.")
        return resolved
    try:
        return raw.resolve()
    except OSError as exc:
        raise ValueError("경로를 열 수 없습니다.") from exc


def _write_cut_package(
    media: Path,
    *,
    door: str,
    edit_spec_id: str | None,
    title: str,
) -> dict[str, Any]:
    resolved_door = normalize_door(door, required=True)
    agent = normalize_agent(None, resolved_door)
    spec_id = str(edit_spec_id or "").strip() or None
    if spec_id:
        record = get_spec(spec_id)
        if record:
            title = str(record.get("title") or title)
            spec = record.get("spec") if isinstance(record.get("spec"), dict) else {}
            resolved_door = normalize_door(record.get("door") or spec.get("door") or resolved_door)
            agent = normalize_agent(record.get("agent") or spec.get("agent"), resolved_door)
    folder = door_inbox_dir(resolved_door) / f"drop-{_safe_stem(media.stem)}-{_utc_stamp()}"
    folder.mkdir(parents=True, exist_ok=False)
    media_name = media.name
    shutil.copy2(media, folder / media_name)
    bundle = {
        "schema": BUNDLE_SCHEMA,
        "project": {
            "title": title or media.stem,
            "source_path": f"inputs/handoff/{folder.name}/{media_name}",
            "output_path": f"outputs/handoff/{folder.name}.mp4",
            "timeline": {"clips": [{"in": 0, "out": 10, "keep": True, "caption": ""}]},
            "caption": "",
            "edit_spec_id": spec_id or "",
            "door": resolved_door,
            "created_by": agent,
            "agent": agent,
        },
        "jobs": [{"kind": "render", "approved": True, "payload": {}}],
        "artifacts": [],
    }
    (folder / "bundle.json").write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "kind": "media",
        "folder": folder.name,
        "path": str(folder),
        "edit_spec_id": spec_id,
        "door": resolved_door,
        "agent": agent,
        "inbox_dir": str(door_inbox_dir(resolved_door)),
    }


def accept_dropped_cut(
    path: str,
    *,
    door: str = EDITOR_DOOR,
    edit_spec_id: str | None = None,
) -> dict[str, Any]:
    """Accept a finished cut dropped from another PC. The person never types a path."""
    resolved = _resolve_drop_path(path)
    if not resolved.exists():
        raise ValueError("파일이 없습니다.")
    inbox = door_inbox_dir(door)
    inbox_resolved = inbox.resolve()
    if resolved == inbox_resolved or resolved == local_inbox_dir().resolve():
        raise ValueError("받을함 전체를 놓을 수는 없습니다.")
    if resolved.is_dir():
        if not (resolved / "bundle.json").is_file():
            raise ValueError("완성 폴더에는 bundle.json이 있어야 합니다.")
        if resolved.parent == inbox_resolved:
            return {
                "kind": "package",
                "folder": resolved.name,
                "path": str(resolved),
                "door": normalize_door(door, required=True),
                "already_in_inbox": True,
                "inbox_dir": str(inbox_resolved),
            }
        dest = inbox / resolved.name
        if dest.exists():
            dest = inbox / f"{resolved.name}-{_utc_stamp()}"
        shutil.copytree(resolved, dest)
        return {
            "kind": "package",
            "folder": dest.name,
            "path": str(dest),
            "door": normalize_door(door, required=True),
            "already_in_inbox": False,
            "inbox_dir": str(inbox_resolved),
        }
    suffix = resolved.suffix.lower()
    if suffix not in ALLOWED_MEDIA_EXTENSIONS and suffix != ".m4v":
        raise ValueError("영상 파일이나 완성 폴더만 놓을 수 있습니다.")
    if not resolved.is_file():
        raise ValueError("파일이 없습니다.")
    size = resolved.stat().st_size
    if size > MAX_MEDIA_BYTES:
        raise ValueError(f"파일이 {size}바이트로 너무 큽니다.")
    title = resolved.stem
    return _write_cut_package(resolved, door=door, edit_spec_id=edit_spec_id, title=title)


def accept_uploaded_cut(
    filename: str,
    data: bytes,
    *,
    door: str = EDITOR_DOOR,
    edit_spec_id: str | None = None,
) -> dict[str, Any]:
    name = Path(filename or "cut.mp4").name
    suffix = Path(name).suffix.lower()
    if suffix not in ALLOWED_MEDIA_EXTENSIONS and suffix != ".m4v":
        raise ValueError("영상 파일만 놓을 수 있습니다.")
    if len(data) > MAX_MEDIA_BYTES:
        raise ValueError("파일이 너무 큽니다.")
    staging = (config.WORKSPACE_DIR / "tmp-drops").resolve()
    staging.mkdir(parents=True, exist_ok=True)
    dest = staging / name
    if dest.exists():
        dest = staging / f"{dest.stem}-{_utc_stamp()}{dest.suffix}"
    dest.write_bytes(data)
    return accept_dropped_cut(str(dest), door=door, edit_spec_id=edit_spec_id)


def write_demo_package(spec_id: str | None = None, door: str | None = None) -> dict[str, Any]:
    """Build a local inbox package from the bundled sample, as if a bot sent it."""
    from first_run import find_bundled_sample, provision_sample_media, sample_manifest

    if not provision_sample_media():
        raise ValueError("The bundled sample clip is missing, so a demo package cannot be written.")
    sample = find_materials_clip(spec_id) if spec_id else None
    if sample is None:
        sample = find_bundled_sample()
    if sample is None:
        raise ValueError("The bundled sample clip is missing, so a demo package cannot be written.")
    title = "Bot-delivered cut"
    resolved_door = normalize_door(door) if door else EDITOR_DOOR
    agent = normalize_agent(None, resolved_door)
    if spec_id:
        record = get_spec(spec_id)
        if record:
            title = str(record.get("title") or title)
            spec = record.get("spec") if isinstance(record.get("spec"), dict) else {}
            resolved_door = normalize_door(record.get("door") or spec.get("door") or resolved_door)
            agent = normalize_agent(record.get("agent") or spec.get("agent"), resolved_door)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    folder = door_inbox_dir(resolved_door) / f"{stamp}-{resolved_door}-source"
    folder.mkdir(parents=True, exist_ok=False)
    shutil.copy2(sample, folder / "source.mp4")
    manifest = sample_manifest()
    bundle = {
        "schema": BUNDLE_SCHEMA,
        "project": {
            "title": title,
            "source_path": f"inputs/handoff/{folder.name}/source.mp4",
            "output_path": f"outputs/handoff/{folder.name}.mp4",
            "timeline": manifest.get("timeline") or {"clips": [{"in": 0, "out": 8, "keep": True, "caption": ""}]},
            "caption": str(manifest.get("caption") or ""),
            "edit_spec_id": spec_id or "",
            "door": resolved_door,
            "created_by": agent,
            "agent": agent,
        },
        "jobs": [{"kind": "render", "approved": True, "payload": {}}],
        "artifacts": [],
    }
    (folder / "bundle.json").write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "folder": folder.name,
        "path": str(folder),
        "edit_spec_id": spec_id or None,
        "door": resolved_door,
        "agent": agent,
        "inbox_dir": str(door_inbox_dir(resolved_door)),
    }


def _door_status(door: str) -> dict[str, Any]:
    pending = pending_inbox_folders_for_door(door)
    loose = pending_inbox_media_for_door(door)
    inbox = door_inbox_dir(door)
    return {
        "door": door,
        "inbox_dir": str(inbox),
        "pending_count": len(pending) + len(loose),
        "pending": [item.name for item in pending] + [item.name for item in loose],
    }


def handoff_status() -> dict[str, Any]:
    inbox = local_inbox_dir()
    editor = _door_status(EDITOR_DOOR)
    collector = _door_status(COLLECTOR_DOOR)
    remote = str(os.getenv("HANDOFF_REPO_REMOTE") or "").strip()
    return {
        "schema": "grok-crew.handoff-status/v1",
        "inbox_dir": str(inbox),
        "pending_count": editor["pending_count"] + collector["pending_count"],
        "pending": editor["pending"] + collector["pending"],
        "doors": {EDITOR_DOOR: editor, COLLECTOR_DOOR: collector},
        "outbox": outbox_status(),
        "materials": materials_status(),
        "git_configured": bool(remote),
        "git_remote_set": bool(remote),
        "source_owner": "bot",
        "note": (
            "A crew spec: collector reads outbox/collector and drops clips in handoff-materials. "
            "Editor reads outbox/editor, cuts those clips, and returns the cut to handoff-inbox/editor. "
            "An editor pull never imports the collector inbox. Leftover grok/ and agents/ folders are still read."
        ),
    }


def resolve_pull_door(payload: dict[str, Any]) -> str:
    spec_id = str(payload.get("edit_spec_id") or "").strip()
    requested = payload.get("door")
    spec_door = None
    if spec_id:
        record = get_spec(spec_id)
        if record:
            spec_door = normalize_door(record.get("door") or (record.get("spec") or {}).get("door"))
    if requested not in (None, ""):
        door = normalize_door(requested, required=True)
        if spec_door and spec_door != door:
            record = get_spec(spec_id) if spec_id else None
            spec = record.get("spec") if record and isinstance(record.get("spec"), dict) else {}
            if not spec.get("crew"):
                raise ValueError(f"That spec belongs to the {spec_door} door, not {door}.")
        return door
    return spec_door or EDITOR_DOOR


def pull_handoff(body: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = body if isinstance(body, dict) else {}
    demo = bool(payload.get("demo"))
    spec_id = str(payload.get("edit_spec_id") or "").strip() or None
    door = resolve_pull_door(payload)
    written = None
    record = get_spec(spec_id) if spec_id else None
    spec = record.get("spec") if record and isinstance(record.get("spec"), dict) else {}
    if demo and spec.get("crew") and door == COLLECTOR_DOOR:
        from handoff_materials import pull_materials

        return pull_materials({"demo": True, "edit_spec_id": spec_id})
    if demo:
        written = write_demo_package(spec_id, door=door)
    pulled = pull_local_inbox(door=door)
    if written:
        pulled["demo_package"] = written
    return pulled
