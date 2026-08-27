"""Machine-readable map of advanced-tool pages to live APIs.

Source of truth: advanced-tools.json (also imported by the browser hub).
A person may specify which tools. Assigned tools are for the bot.
Bots must read GET /api/v2/tools or GET /api/bot-guide instead of scraping HTML.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import config
from config import ADVANCED_TOOLS_PATH

ADVANCED_TOOLS_SCHEMA = "grok-crew.advanced-tools/v1"
ASSIGNMENT_SCHEMA = "grok-crew.advanced-tools-assignment/v1"
TOOLS_API_BASE = "http://127.0.0.1:7214"
_LANGS = ("ko", "en", "zh", "ja")

_INSTRUCTION = {
    "ko": {
        "some": "고급 도구는 지정된 것만 쓰세요. GET {base}/api/v2/tools?lang=ko 를 읽고 assigned가 true이고 api_live가 true인 도구의 bot_api만 호출하세요. HTML을 긁거나 화면을 클릭하지 마세요. 지정: {ids}. 실행은 봇이 합니다. 사람은 지정만 합니다.",
        "none": "고급 도구는 지금은 지정된 것이 없습니다. GET {base}/api/v2/tools?lang=ko 를 읽고 assigned를 확인하세요. 지정될 때까지 고급 도구 write API를 치지 마세요. HTML을 긁지 마세요.",
    },
    "en": {
        "some": "Use only the assigned advanced tools. Read GET {base}/api/v2/tools?lang=en and call bot_api only for tools where assigned is true and api_live is true. Do not scrape or click the screens. Assigned: {ids}. The bot runs them. A person only specifies.",
        "none": "No advanced tools are assigned. Read GET {base}/api/v2/tools?lang=en and check assigned. Do not hit advanced-tool write APIs until something is assigned. Do not scrape HTML.",
    },
    "zh": {
        "some": "只使用已指定的高级工具。读取 GET {base}/api/v2/tools?lang=zh，只调用 assigned 为 true 且 api_live 为 true 的工具的 bot_api。不要抓取或点击页面。指定：{ids}。由机器人执行。人只负责指定。",
        "none": "现在没有指定的高级工具。读取 GET {base}/api/v2/tools?lang=zh 并查看 assigned。在指定之前不要打高级工具的 write API。不要抓 HTML。",
    },
    "ja": {
        "some": "指定された高度なツールだけを使ってください。GET {base}/api/v2/tools?lang=ja を読み、assigned が true で api_live が true のツールの bot_api だけを呼びます。HTML を掻いたり画面をクリックしたりしないでください。指定: {ids}。実行はボットです。人は指定だけします。",
        "none": "高度なツールは今指定がありません。GET {base}/api/v2/tools?lang=ja を読んで assigned を確認してください。指定されるまで高度なツールの write API を叩かないでください。HTML は掻きません。",
    },
}


def normalize_tools_language(language: str | None) -> str:
    raw = (language or "en").strip().lower()
    return raw if raw in _LANGS else "en"


def _pick(value: Any, language: str) -> Any:
    if isinstance(value, dict) and any(key in value for key in _LANGS):
        return value.get(language) or value.get("en") or next(iter(value.values()), "")
    if isinstance(value, list):
        return [_pick(item, language) for item in value]
    return value


def assignment_path() -> Path:
    return Path(config.WORKSPACE_DIR) / "advanced-tools-assignment.json"


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


def known_tool_ids() -> list[str]:
    ids: list[str] = []
    for raw in load_advanced_tools_source()["tools"]:
        if isinstance(raw, dict) and raw.get("id"):
            ids.append(str(raw["id"]))
    return ids


def default_assigned_ids() -> list[str]:
    ids: list[str] = []
    for raw in load_advanced_tools_source()["tools"]:
        if not isinstance(raw, dict) or not raw.get("id"):
            continue
        if bool(raw.get("api_live")):
            ids.append(str(raw["id"]))
    return ids


def load_advanced_tools_assignment() -> list[str]:
    path = assignment_path()
    known = set(known_tool_ids())
    if not path.is_file():
        return default_assigned_ids()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default_assigned_ids()
    ids = raw.get("ids") if isinstance(raw, dict) else None
    if not isinstance(ids, list):
        return default_assigned_ids()
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in ids:
        value = str(item).strip()
        if value in known and value not in seen:
            seen.add(value)
            cleaned.append(value)
    return cleaned


def bot_tools_instruction(language: str, assigned: list[str] | None = None) -> str:
    lang = normalize_tools_language(language)
    assigned_ids = list(assigned) if assigned is not None else load_advanced_tools_assignment()
    live = {str(raw["id"]) for raw in load_advanced_tools_source()["tools"] if isinstance(raw, dict) and raw.get("id") and bool(raw.get("api_live"))}
    usable = [tool_id for tool_id in assigned_ids if tool_id in live and tool_id != "hub"]
    template = _INSTRUCTION[lang]["some" if usable else "none"]
    return template.format(base=TOOLS_API_BASE, ids=", ".join(usable))


def assign_advanced_tools(body: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = body if isinstance(body, dict) else {}
    ids = payload.get("ids")
    if ids is None:
        ids = payload.get("assigned")
    if not isinstance(ids, list):
        raise ValueError("ids must be an array of tool ids.")
    known = set(known_tool_ids())
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in ids:
        value = str(item).strip()
        if not value:
            continue
        if value not in known:
            raise ValueError(f"Unknown advanced tool: {value}")
        if value not in seen:
            seen.add(value)
            cleaned.append(value)
    path = assignment_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "schema": ASSIGNMENT_SCHEMA,
        "operator": "bot",
        "human_may_specify": True,
        "ids": cleaned,
    }
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)
    return advanced_tools_catalog(str(payload.get("lang") or payload.get("language") or "en"))


def advanced_tools_catalog(language: str = "en") -> dict[str, Any]:
    lang = normalize_tools_language(language)
    source = load_advanced_tools_source()
    assigned = load_advanced_tools_assignment()
    assigned_set = set(assigned)
    tools = []
    for raw in source["tools"]:
        if not isinstance(raw, dict):
            continue
        bot_api = raw.get("bot_api") if isinstance(raw.get("bot_api"), dict) else {}
        screen_live = bool(raw.get("screen_live", raw.get("live")))
        api_live = bool(raw.get("api_live"))
        tool_id = raw.get("id")
        tools.append(
            {
                "id": tool_id,
                "url": raw.get("url"),
                "live": screen_live,
                "screen_live": screen_live,
                "api_live": api_live,
                "hub": raw.get("hub") or "more",
                "operator": "bot",
                "human_may_specify": True,
                "assigned": tool_id in assigned_set,
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
        "operator": "bot",
        "human_may_specify": True,
        "assigned": assigned,
        "bot_instruction": bot_tools_instruction(lang, assigned),
        "rule": _pick(source.get("rule"), lang),
        "cli": str(source.get("cli") or "python local_studio/grok_crew.py tools [--lang ko]"),
        "never": _pick(source.get("never") or [], lang),
        "tools": tools,
    }
