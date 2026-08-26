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
    with pytest.raises(ValueError):
        rename_workspace_file("inputs/handoff/pkg-bad/clip.mp4", "CON.mp4")
    renamed = rename_workspace_file("inputs/handoff/pkg-bad/clip.mp4", "foo..bar.mp4")
    assert renamed["name"] == "foo..bar.mp4"
    assert (folder / "foo..bar.mp4").exists()


def test_source_stays_protected_after_project_is_trashed(studio):
    from desktop_domain import PATCH_SCHEMA, TimelinePatchError, apply_timeline_patch, workspace_v2
    from handoff_folders import delete_handoff_file, describe_package_folder, workspace_handoff_folders

    folder = config.WORKSPACE_DIR / "inputs" / "handoff" / "pkg-keep"
    folder.mkdir(parents=True)
    (folder / "source.mp4").write_bytes(b"src")
    (folder / "broll.mp4").write_bytes(b"brl")
    project = studio.new_project({
        "title": "Keep source",
        "source_path": "inputs/handoff/pkg-keep/source.mp4",
        "output_path": "outputs/final-video.mp4",
        "timeline": {"clips": [{"in": 0, "out": 2, "keep": True, "caption": ""}]},
    })
    trash_project(project["id"])
    assert studio.get_project(project["id"]) is None
    with pytest.raises(ValueError, match="trash"):
        rename_project(project["id"], "Nope")
    with pytest.raises(ValueError, match="trash"):
        trash_project(project["id"])
    with pytest.raises(ValueError, match="source"):
        delete_handoff_file("inputs/handoff/pkg-keep/source.mp4")
    with pytest.raises(ValueError, match="source"):
        rename_workspace_file("inputs/handoff/pkg-keep/source.mp4", "renamed.mp4")
    listed = workspace_handoff_folders()
    package = next(item for item in listed["folders"] if item["id"] == "pkg-keep")
    roles = {item["name"]: item["role"] for item in package["files"]}
    assert roles["source.mp4"] == "source"
    assert package["project_id"] is None
    described = describe_package_folder("pkg-keep")
    assert any(item["name"] == "source.mp4" and item["role"] == "source" for item in described["files"])
    with pytest.raises(TimelinePatchError, match="trash"):
        apply_timeline_patch(project["id"], {
            "schema": PATCH_SCHEMA,
            "base_revision": 1,
            "origin": "human",
            "operations": [{"op": "set_settings", "changes": {"fps": 24}}],
        })
    workspace = workspace_v2()
    assert all(item["id"] != project["id"] for item in workspace["projects"])


def test_restore_rejects_path_escape_and_keeps_the_file(studio):
    from db import db

    folder = config.WORKSPACE_DIR / "inputs" / "handoff" / "pkg-escape"
    folder.mkdir(parents=True)
    (folder / "clip.mp4").write_bytes(b"clip")
    item = trash_workspace_file("inputs/handoff/pkg-escape/clip.mp4")
    trash_abs = config.WORKSPACE_DIR / item["trash_path"]
    assert trash_abs.is_file()
    with db() as conn:
        conn.execute(
            "UPDATE trash_items SET original_path = ? WHERE id = ?",
            ("inputs/handoff/pkg-escape/../../../secret.mp4", item["id"]),
        )
    with pytest.raises(ValueError, match="not allowed|only files"):
        restore_trash_item(item["id"])
    assert trash_abs.is_file()
    with db() as conn:
        conn.execute(
            "UPDATE trash_items SET original_path = ?, trash_path = ? WHERE id = ?",
            ("inputs/handoff/pkg-escape/clip.mp4", "../secret.mp4", item["id"]),
        )
    with pytest.raises(ValueError, match="not allowed|leaves"):
        restore_trash_item(item["id"])
    assert trash_abs.is_file()


def test_workspace_survives_corrupt_purge_dates(studio):
    from desktop_domain import workspace_v2
    from db import db

    folder = config.WORKSPACE_DIR / "inputs" / "handoff" / "pkg-date"
    folder.mkdir(parents=True)
    (folder / "clip.mp4").write_bytes(b"clip")
    item = trash_workspace_file("inputs/handoff/pkg-date/clip.mp4")
    with db() as conn:
        conn.execute("UPDATE trash_items SET purge_after = ? WHERE id = ?", ("not-a-date", item["id"]))
    listed = workspace_v2()
    assert any(row["id"] == item["id"] for row in listed["trash"]["items"])
    purge_expired_trash()
    assert any(row["id"] == item["id"] for row in list_trash()["items"])


def test_symlink_package_cannot_delete_other_workspace_files(studio):
    from handoff_folders import delete_handoff_file

    outputs = config.WORKSPACE_DIR / "outputs"
    outputs.mkdir(parents=True, exist_ok=True)
    secret = outputs / "secret.mp4"
    secret.write_bytes(b"keep-me")
    handoff = config.WORKSPACE_DIR / "inputs" / "handoff"
    handoff.mkdir(parents=True, exist_ok=True)
    link = handoff / "pkg-link"
    link.symlink_to(outputs, target_is_directory=True)
    with pytest.raises(ValueError, match="leaves|not allowed|only files"):
        delete_handoff_file("inputs/handoff/pkg-link/secret.mp4")
    assert secret.exists()


def test_materials_restore_puts_the_clip_back_in_the_manifest(studio, tmp_path):
    from edit_spec import create_spec
    from handoff_folders import delete_handoff_file, describe_materials_folder
    from handoff_materials import MATERIALS_SCHEMA, apply_materials_folder
    import json

    record = create_spec({
        "title": "Crew reel",
        "goal": "Collect then cut",
        "language": "en",
        "crew": True,
    })
    incoming = tmp_path / "drop"
    incoming.mkdir()
    (incoming / "keep.mp4").write_bytes(b"keep")
    (incoming / "drop.mp4").write_bytes(b"drop")
    (incoming / "manifest.json").write_text(
        '{"schema":"%s","edit_spec_id":"%s","agent":"Collector Agent","notes":"Two clips.","clips":[{"file":"keep.mp4","note":"Keep"},{"file":"drop.mp4","note":"Hook"}]}'
        % (MATERIALS_SCHEMA, record["id"]),
        encoding="utf-8",
    )
    assert apply_materials_folder(incoming, record["id"])["ok"] is True
    deleted = delete_handoff_file(f"handoff-materials/{record['id']}/drop.mp4")
    restore_trash_item(deleted["trash_id"])
    leftover = describe_materials_folder(record["id"])
    names = {item["name"] for item in leftover["files"]}
    assert names == {"keep.mp4", "drop.mp4"}
    manifest = json.loads(
        (config.WORKSPACE_DIR / "handoff-materials" / record["id"] / "manifest.json").read_text(encoding="utf-8")
    )
    notes = {item["file"]: item.get("note") for item in manifest["clips"]}
    assert notes["drop.mp4"] == "Hook"


def test_http_library_routes_reject_extra_path_segments(live_server):
    from tests.test_timeline_edit_api import post_status

    status, body = post_status(live_server, "/api/v2/trash/foo/bar/restore", {})
    assert status == 400
    assert "id" in body["error"] or "not allowed" in body["error"]
    status, body = post_status(live_server, "/api/v2/project-folders/fld_one/extra/delete", {})
    assert status == 400
