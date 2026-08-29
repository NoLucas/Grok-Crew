"""One active local TTS voice model. First-run download; Next defaults to Kokoro-82M."""

from __future__ import annotations

import json
import os
import shutil
import threading
from pathlib import Path
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import config

SCHEMA = "grok-crew.voice-model/v1"
DEFAULT_MODEL_ID = "kokoro-82m"
MODEL_IDS = ("kokoro-82m", "step-audio-editx", "zonos-v0.1")
HF_RESOLVE = "https://huggingface.co/{repo}/resolve/main/{name}"

CATALOG: dict[str, dict[str, Any]] = {
    "kokoro-82m": {
        "label": "Kokoro-82M",
        "repo": "hexgrad/Kokoro-82M",
        "license": "Apache-2.0",
        "files": ("config.json",),
        "weight_files": ("kokoro-v1_0.pth",),
        "fallbacks": ("kokoro-v1.0.pth",),
        "accents": ("en-us", "en-gb", "zh", "ja"),
    },
    "step-audio-editx": {
        "label": "Step Audio EditX",
        "repo": "stepfun-ai/Step-Audio-EditX",
        "license": "Apache-2.0",
        "files": ("README.md",),
        "weight_files": (),
        "fallbacks": ("config.json",),
        "accents": ("en-us", "en-gb", "zh", "ja"),
    },
    "zonos-v0.1": {
        "label": "Zonos-v0.1",
        "repo": "Zyphra/Zonos-v0.1-transformer",
        "license": "Apache-2.0",
        "files": ("config.json",),
        "weight_files": ("model.safetensors",),
        "fallbacks": ("README.md",),
        "accents": ("en-us", "en-gb", "zh", "ja"),
    },
}

_lock = threading.Lock()
_progress: dict[str, Any] = {
    "model_id": None,
    "status": "idle",
    "received_bytes": 0,
    "total_bytes": 0,
    "file": "",
    "error": "",
}
_thread: threading.Thread | None = None
_cancel = threading.Event()


def reset_voice_models() -> None:
    """Test helper. Stops a download and clears in-memory progress."""
    global _thread
    _cancel.set()
    existing = _thread
    if existing and existing.is_alive() and existing is not threading.current_thread():
        existing.join(timeout=2)
    _thread = None
    _cancel.clear()
    _set_progress(model_id=None, status="idle", received_bytes=0, total_bytes=0, file="", error="")


def models_root() -> Path:
    return (config.WORKSPACE_DIR / "voice-models").resolve()


def active_path() -> Path:
    return models_root() / "active.json"


def model_dir(model_id: str) -> Path:
    return models_root() / resolve_model_id(model_id)


def resolve_model_id(value: Any = None) -> str:
    raw = str(value or "").strip().lower()
    return raw if raw in MODEL_IDS else DEFAULT_MODEL_ID


def accents_for_model(value: Any = None) -> tuple[str, ...]:
    """Languages the installed/chosen model can actually speak. Set in the exe catalog."""
    item = CATALOG[resolve_model_id(value)]
    raw = item.get("accents") or CATALOG[DEFAULT_MODEL_ID]["accents"]
    return tuple(str(accent) for accent in raw)


def _want_weights() -> bool:
    return os.getenv("GROK_CREW_VOICE_WEIGHTS", "1").strip() not in {"0", "false", "no"}


def _read_active() -> dict[str, Any]:
    path = active_path()
    if not path.is_file():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_active(payload: dict[str, Any]) -> None:
    root = models_root()
    root.mkdir(parents=True, exist_ok=True)
    active_path().write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _set_progress(**fields: Any) -> None:
    with _lock:
        _progress.update(fields)


def _copy_progress() -> dict[str, Any]:
    with _lock:
        return dict(_progress)


def _dir_bytes(path: Path) -> int:
    if not path.is_dir():
        return 0
    total = 0
    for child in path.rglob("*"):
        if child.is_file():
            total += child.stat().st_size
    return total


def _remove_other_models(keep: str) -> None:
    root = models_root()
    if not root.is_dir():
        return
    keep_id = resolve_model_id(keep)
    for child in root.iterdir():
        if child.name in {"active.json"}:
            continue
        if child.name == keep_id:
            continue
        if child.is_dir():
            shutil.rmtree(child, ignore_errors=True)


def _stream_to_path(url: str, dest: Path, fetch: Callable[[str], bytes] | None) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if fetch is not None:
        data = fetch(url)
        dest.write_bytes(data)
        _set_progress(received_bytes=len(data), total_bytes=len(data), file=dest.name)
        return len(data)
    request = Request(url, headers={"User-Agent": "GrokCrew-Desktop/1.0"})
    with urlopen(request, timeout=120) as response:
        total = int(response.headers.get("Content-Length") or 0)
        received = 0
        tmp = dest.with_suffix(dest.suffix + ".part")
        with tmp.open("wb") as handle:
            while True:
                if _cancel.is_set():
                    raise RuntimeError("Voice model download cancelled.")
                chunk = response.read(1024 * 256)
                if not chunk:
                    break
                handle.write(chunk)
                received += len(chunk)
                _set_progress(received_bytes=received, total_bytes=total or received, file=dest.name)
        tmp.replace(dest)
        return received


def _try_file(model_id: str, name: str, fetch: Callable[[str], bytes] | None) -> int:
    item = CATALOG[model_id]
    url = HF_RESOLVE.format(repo=item["repo"], name=name)
    target = model_dir(model_id) / Path(name).name
    _set_progress(status="running", model_id=model_id, file=name, error="")
    try:
        return _stream_to_path(url, target, fetch)
    except (HTTPError, URLError, TimeoutError, RuntimeError, OSError):
        if target.exists():
            target.unlink(missing_ok=True)
        raise


def _download_one(model_id: str, fetch: Callable[[str], bytes] | None) -> None:
    item = CATALOG[model_id]
    dest_root = model_dir(model_id)
    dest_root.mkdir(parents=True, exist_ok=True)
    saved = 0
    last_error = ""
    required = list(item["files"])
    if _want_weights():
        required.extend(item["weight_files"])
    for name in required:
        if _cancel.is_set():
            raise RuntimeError("Voice model download cancelled.")
        try:
            saved += _try_file(model_id, name, fetch)
            last_error = ""
        except (HTTPError, URLError, TimeoutError, RuntimeError, OSError) as exc:
            last_error = str(exc)
    if saved <= 0:
        for name in item.get("fallbacks") or ():
            if _cancel.is_set():
                raise RuntimeError("Voice model download cancelled.")
            try:
                saved += _try_file(model_id, name, fetch)
                last_error = ""
                break
            except (HTTPError, URLError, TimeoutError, RuntimeError, OSError) as exc:
                last_error = str(exc)
    receipt = dest_root / "chosen.json"
    receipt.write_text(
        json.dumps(
            {
                "schema": SCHEMA,
                "id": model_id,
                "label": item["label"],
                "repo": item["repo"],
                "bytes": saved,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    if saved <= 0 and last_error:
        raise RuntimeError(last_error)
    _set_progress(status="ready", model_id=model_id, received_bytes=saved, total_bytes=saved or 1, error="", file="chosen.json")


def _run_download(model_id: str, fetch: Callable[[str], bytes] | None) -> None:
    try:
        _download_one(model_id, fetch)
        current = _read_active()
        current.update({"schema": SCHEMA, "active": model_id, "chosen": True, "error": ""})
        _write_active(current)
    except Exception as exc:  # noqa: BLE001
        _set_progress(status="failed", model_id=model_id, error=str(exc)[:400])
        current = _read_active()
        current.update({"schema": SCHEMA, "active": model_id, "chosen": True, "error": str(exc)[:400]})
        _write_active(current)


def select_voice_model(body: dict[str, Any] | None = None, *, fetch: Callable[[str], bytes] | None = None, wait: bool = False) -> dict[str, Any]:
    """Keep one model. Empty/unknown id becomes Kokoro-82M. Downloads that model only."""
    global _thread
    payload = body if isinstance(body, dict) else {}
    model_id = resolve_model_id(payload.get("model_id") or payload.get("id"))
    _cancel.set()
    existing = _thread
    if existing and existing.is_alive() and existing is not threading.current_thread():
        existing.join(timeout=2)
    _cancel.clear()
    _remove_other_models(model_id)
    _write_active({"schema": SCHEMA, "active": model_id, "chosen": True, "error": ""})
    _set_progress(model_id=model_id, status="queued", received_bytes=0, total_bytes=0, file="", error="")
    if wait:
        _run_download(model_id, fetch)
        return status()
    _thread = threading.Thread(target=_run_download, args=(model_id, fetch), daemon=True)
    _thread.start()
    return status()


def status() -> dict[str, Any]:
    stored = _read_active()
    active = resolve_model_id(stored.get("active")) if stored.get("chosen") or stored.get("active") else None
    download = _copy_progress()
    models = []
    for model_id, item in CATALOG.items():
        folder = model_dir(model_id)
        installed = (folder / "chosen.json").is_file() or any(folder.glob("config.json")) or any(folder.glob("README.md"))
        models.append(
            {
                "id": model_id,
                "label": item["label"],
                "repo": item["repo"],
                "license": item["license"],
                "accents": list(accents_for_model(model_id)),
                "installed": installed,
                "active": active == model_id,
                "bytes": _dir_bytes(folder) if folder.is_dir() else 0,
            }
        )
    chosen_id = active or DEFAULT_MODEL_ID
    return {
        "schema": SCHEMA,
        "default": DEFAULT_MODEL_ID,
        "active": active,
        "chosen": bool(stored.get("chosen") or active),
        "one_active": True,
        "accents": list(accents_for_model(chosen_id)),
        "error": str(stored.get("error") or download.get("error") or ""),
        "download": download,
        "models": models,
    }
