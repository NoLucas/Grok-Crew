import json
from pathlib import Path
from urllib.request import Request, urlopen

import pytest

from edit_spec import create_spec
from handoff_inbox import accept_dropped_cut, accept_uploaded_cut, door_inbox_dir, pull_handoff


def _post(server: str, path: str, payload: dict) -> dict:
    request = Request(
        f"{server}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def test_accept_dropped_media_builds_inbox_package(studio, tmp_path):
    source = tmp_path / "hook.mp4"
    source.write_bytes(b"cut-bytes")
    result = accept_dropped_cut(str(source), door="editor")
    assert result["kind"] == "media"
    folder = Path(result["path"])
    assert (folder / "bundle.json").is_file()
    assert (folder / "hook.mp4").read_bytes() == b"cut-bytes"
    pulled = pull_handoff({"door": "editor"})
    imported = [item for item in pulled["imported"] if item.get("folder") == result["folder"]]
    assert imported
    assert imported[0]["ok"] is True


def test_accept_dropped_package_folder(studio, tmp_path):
    folder = tmp_path / "bot-cut"
    folder.mkdir()
    (folder / "source.mp4").write_bytes(b"pkg-bytes")
    (folder / "bundle.json").write_text(json.dumps({
        "schema": "local-video-workspace.project-bundle/v1",
        "project": {
            "title": "Dropped folder",
            "source_path": "inputs/handoff/bot-cut/source.mp4",
            "output_path": "outputs/handoff/bot-cut.mp4",
            "timeline": {"clips": [{"in": 0, "out": 4, "keep": True, "caption": ""}]},
        },
        "jobs": [{"kind": "render", "approved": True, "payload": {}}],
    }), encoding="utf-8")
    result = accept_dropped_cut(str(folder), door="editor")
    assert result["kind"] == "package"
    dest = Path(result["path"])
    assert dest.parent == door_inbox_dir("editor")
    assert (dest / "bundle.json").is_file()
    assert (dest / "source.mp4").read_bytes() == b"pkg-bytes"


def test_accept_drop_rejects_traversal_and_non_media(studio, tmp_path):
    with pytest.raises(ValueError, match="상대 경로"):
        accept_dropped_cut("../../etc/passwd")
    notes = tmp_path / "notes.txt"
    notes.write_text("no", encoding="utf-8")
    with pytest.raises(ValueError, match="영상"):
        accept_dropped_cut(str(notes))
    with pytest.raises(ValueError, match="없습니다"):
        accept_dropped_cut("")


def test_accept_uploaded_cut_writes_package(studio):
    record = create_spec({"title": "Upload cut", "goal": "From another PC", "language": "ko"})
    result = accept_uploaded_cut("other.mp4", b"upload-bytes", door="editor", edit_spec_id=record["id"])
    folder = Path(result["path"])
    assert (folder / "other.mp4").read_bytes() == b"upload-bytes"
    bundle = json.loads((folder / "bundle.json").read_text(encoding="utf-8"))
    assert bundle["project"]["edit_spec_id"] == record["id"]
    assert bundle["project"]["title"] == "Upload cut"


def test_http_accept_drop_and_file(live_server, tmp_path):
    source = tmp_path / "http-cut.mp4"
    source.write_bytes(b"http-bytes")
    dropped = _post(live_server, "/api/v2/handoff/accept-drop", {"path": str(source), "door": "editor"})
    assert dropped["kind"] == "media"
    request = Request(
        f"{live_server}/api/v2/handoff/accept-file?door=editor",
        data=b"file-bytes",
        headers={"Content-Type": "application/octet-stream", "X-Filename": "browser.mp4"},
        method="POST",
    )
    with urlopen(request) as response:
        uploaded = json.loads(response.read().decode("utf-8"))
    assert uploaded["kind"] == "media"
    assert Path(uploaded["path"], "browser.mp4").read_bytes() == b"file-bytes"
