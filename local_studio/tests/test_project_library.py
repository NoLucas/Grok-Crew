"""Project folders, rename, and 30-day trash."""

from datetime import datetime, timedelta, timezone
from pathlib import Path

import config
from project_library import (
    PURGE_DAYS,
    create_project_folder,
    delete_project_folder,
    empty_trash,
    list_project_folders,
    list_trash,
    move_project,
    purge_expired_trash,
    rename_project,
    rename_workspace_file,
    restore_trash_item,
    trash_project,
    trash_workspace_file,
)

import pytest


def _project(studio, title="Cut one"):
    (config.WORKSPACE_DIR / "inputs").mkdir(parents=True, exist_ok=True)
    source = config.WORKSPACE_DIR / "inputs" / "source.mp4"
    if not source.exists():
        source.write_bytes(b"src")
    return studio.new_project({
        "title": title,
        "source_path": "inputs/source.mp4",
        "output_path": "outputs/final-video.mp4",
        "timeline": {"clips": [{"in": 0, "out": 2, "keep": True, "caption": ""}]},
    })


def test_folder_create_rename_delete_and_move(studio):
    project = _project(studio, "Night vlog")
    folder = create_project_folder("릴스")
    assert folder["title"] == "릴스"
    assert any(item["id"] == folder["id"] for item in list_project_folders())
    moved = move_project(project["id"], folder["id"])
    assert moved["folder_id"] == folder["id"]
    renamed = rename_project(project["id"], "밤 브이로그")
    assert renamed["title"] == "밤 브이로그"
    delete_project_folder(folder["id"])
    assert list_project_folders() == []
    from db import db, row_dict
    with db() as conn:
        row = row_dict(conn.execute("SELECT * FROM projects WHERE id = ?", (project["id"],)).fetchone())
    assert row["folder_id"] is None


def test_project_trash_restore_and_hide_from_workspace(studio):
    from desktop_domain import workspace_v2

    project = _project(studio, "Temp cut")
    trash_project(project["id"])
    listed = workspace_v2()
    assert all(item["id"] != project["id"] for item in listed["projects"])
    assert any(item["id"] == project["id"] and item["kind"] == "project" for item in listed["trash"]["items"])
    restore_trash_item(project["id"])
    listed = workspace_v2()
    assert any(item["id"] == project["id"] for item in listed["projects"])
    assert listed["trash"]["items"] == []


def test_file_trash_rename_restore_and_30_day_purge(studio):
    folder = config.WORKSPACE_DIR / "inputs" / "handoff" / "pkg-lib"
    folder.mkdir(parents=True)
    (folder / "keep.mp4").write_bytes(b"keep")
    (folder / "cut.mp4").write_bytes(b"cut")
    renamed = rename_workspace_file("inputs/handoff/pkg-lib/cut.mp4", "hook.mp4")
    assert renamed["name"] == "hook.mp4"
    assert (folder / "hook.mp4").exists()
    item = trash_workspace_file("inputs/handoff/pkg-lib/hook.mp4")
    assert item["kind"] == "file"
    assert not (folder / "hook.mp4").exists()
    trash_abs = config.WORKSPACE_DIR / item["trash_path"]
    assert trash_abs.is_file()
    restore_trash_item(item["id"])
    assert (folder / "hook.mp4").exists()

    gone = trash_workspace_file("inputs/handoff/pkg-lib/hook.mp4")
    from db import db
    expired = (datetime.now(timezone.utc) - timedelta(days=PURGE_DAYS + 1)).isoformat(timespec="seconds")
    with db() as conn:
        conn.execute(
            "UPDATE trash_items SET trashed_at = ?, purge_after = ? WHERE id = ?",
            (expired, expired, gone["id"]),
        )
    purge_expired_trash()
    assert list_trash()["items"] == []
    assert not trash_abs.exists()


def test_empty_trash_purges_projects_and_files(studio):
    project = _project(studio, "Bin me")
    folder = config.WORKSPACE_DIR / "inputs" / "handoff" / "pkg-empty"
    folder.mkdir(parents=True)
    (folder / "clip.mp4").write_bytes(b"clip")
    trash_project(project["id"])
    trash_workspace_file("inputs/handoff/pkg-empty/clip.mp4")
    result = empty_trash()
    assert result["purged"] == 2
    assert list_trash()["items"] == []
    from db import db
    with db() as conn:
        assert conn.execute("SELECT id FROM projects WHERE id = ?", (project["id"],)).fetchone() is None


def test_rejects_bad_folder_and_file_names(studio):
    with pytest.raises(ValueError):
        create_project_folder("   ")
    with pytest.raises(ValueError):
        move_project("missing", None)
    folder = config.WORKSPACE_DIR / "inputs" / "handoff" / "pkg-bad"
    folder.mkdir(parents=True)
    (folder / "clip.mp4").write_bytes(b"clip")
    with pytest.raises(ValueError):
        rename_workspace_file("inputs/handoff/pkg-bad/clip.mp4", "../x.mp4")
    with pytest.raises(ValueError):
        rename_workspace_file("inputs/handoff/pkg-bad/clip.mp4", "notes.txt")
