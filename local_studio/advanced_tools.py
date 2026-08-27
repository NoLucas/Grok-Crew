"""Machine-readable map of advanced-tool pages to live APIs.

Source of truth: advanced-tools.json (also imported by the browser hub).
Bots must read GET /api/v2/tools or GET /api/bot-guide instead of scraping HTML.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from config import ADVANCED_TOOLS_PATH

ADVANCED_TOOLS_SCHEMA = "grok-crew.advanced-tools/v1"
_LANGS = ("ko", "en", "zh", "ja")


def normalize_tools_language(language: str | None) -> str:
    raw = (language or "en").strip().lower()
    return raw if raw in _LANGS else "en"


def _pick(value: Any, language: str) -> Any:
    if isinstance(value, dict) and any(key in value for key in _LANGS):
        return value.get(language) or value.get("en") or next(iter(value.values()), "")
    if isinstance(value, list):
        return [_pick(item, language) for item in value]
    return value


@lru_cache(maxsize=1)
def load_advanced_tools_source() -> dict[str, Any]:
    path = Path(ADVANCED_TOOLS_PATH)
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Advanced tools catalog is unavailable or invalid JSON.") from exc
    if not isinstance(value, dict) or not isinstance(value.get("tools"), list):
        raise RuntimeError("Advanced tools catalog must be a JSON object with a tools array.")
    return value


def advanced_tools_catalog(language: str = "en") -> dict[str, Any]:
    lang = normalize_tools_language(language)
    source = load_advanced_tools_source()
    tools = []
    for raw in source["tools"]:
        if not isinstance(raw, dict):
            continue
        bot_api = raw.get("bot_api") if isinstance(raw.get("bot_api"), dict) else {}
        screen_live = bool(raw.get("screen_live", raw.get("live")))
        api_live = bool(raw.get("api_live"))
        tools.append(
            {
                "id": raw.get("id"),
                "url": raw.get("url"),
                "live": screen_live,
                "screen_live": screen_live,
                "api_live": api_live,
                "hub": raw.get("hub") or "more",
                "name": _pick(raw.get("name"), lang),
                "detail": _pick(raw.get("detail"), lang),
                "use_when": _pick(raw.get("use_when"), lang),
                "never": _pick(raw.get("never"), lang),
                "bot_api": {
                    "read": list(bot_api.get("read") or []),
                    "write": list(bot_api.get("write") or []),
                },
                "cli": list(raw.get("cli") or []),
            }
        )
    return {
        "schema": str(source.get("schema") or ADVANCED_TOOLS_SCHEMA),
        "same_pc_only": True,
        "rule": _pick(source.get("rule"), lang),
        "cli": str(source.get("cli") or "python local_studio/grok_crew.py tools [--lang ko]"),
        "never": _pick(source.get("never") or [], lang),
        "tools": tools,
    }
