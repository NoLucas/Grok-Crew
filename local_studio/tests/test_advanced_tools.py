import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest

from advanced_tools import (
    ADVANCED_TOOLS_SCHEMA,
    advanced_tools_catalog,
    assign_advanced_tools,
    default_assigned_ids,
)
from studio_server import bot_entry_manifest, bot_guide


def test_catalog_lists_live_production_and_bot_check(studio):
    catalog = advanced_tools_catalog("ko")
    assert catalog["schema"] == ADVANCED_TOOLS_SCHEMA
    assert catalog["same_pc_only"] is True
    assert catalog["operator"] == "bot"
    assert catalog["human_may_specify"] is True
    by_id = {tool["id"]: tool for tool in catalog["tools"]}
    assert by_id["production"]["live"] is True
    assert by_id["production"]["screen_live"] is True
    assert by_id["production"]["api_live"] is True
    assert by_id["production"]["operator"] == "bot"
    assert by_id["bots"]["live"] is True
    assert by_id["edit"]["live"] is False
    assert by_id["operations"]["live"] is False
    assert by_id["operations"]["screen_live"] is False
    assert by_id["operations"]["api_live"] is True
    assert by_id["operations"]["hub"] == "featured"
    assert by_id["agent"]["api_live"] is False
    assert by_id["agent"]["hub"] == "more"
    assert {tool["id"] for tool in catalog["tools"] if tool["hub"] == "featured"} == {
        "production",
        "bots",
        "cut",
        "operations",
        "bot-guide",
    }
    assert "POST /api/projects/{id}/render" in by_id["production"]["bot_api"]["write"]
    assert "GET /api/v2/tools" in by_id["hub"]["bot_api"]["read"]
    assert "POST /api/v2/tools" in by_id["hub"]["bot_api"]["write"]
    assert "HTML" in catalog["rule"] or "긁" in catalog["rule"]
    assert "production" in catalog["assigned"]
    assert "agent" not in catalog["assigned"]
    assert "지정: production" in catalog["bot_instruction"] or "Assigned: production" in catalog["bot_instruction"]


def test_catalog_localizes_korean_and_falls_back():
    korean = advanced_tools_catalog("ko")
    english = advanced_tools_catalog("en")
    unknown = advanced_tools_catalog("xx")
    assert korean["tools"][0]["name"] == "고급 도구 목록"
    assert english["tools"][0]["name"] == "Advanced tools index"
    assert unknown["tools"][0]["name"] == english["tools"][0]["name"]


def test_bot_guide_embeds_the_catalog():
    guide = bot_guide("ko")
    assert guide["advanced_tools"]["schema"] == ADVANCED_TOOLS_SCHEMA
    assert guide["advanced_tools"]["tools"][0]["url"] == "/tools"
    assert "GET /api/v2/tools" in bot_entry_manifest()["first_requests"]


def test_tools_catalog_is_public(live_server):
    with urlopen(Request(f"{live_server}/api/v2/tools?lang=ko"), timeout=10) as response:
        payload = response.read().decode("utf-8")
    assert ADVANCED_TOOLS_SCHEMA in payload
    assert "/production" in payload
    assert "POST /api/projects/{id}/render" in payload


def test_tools_catalog_stays_open_when_token_is_set(live_server, monkeypatch):
    monkeypatch.setenv("LOCAL_STUDIO_TOKEN", "secret-token")
    with urlopen(Request(f"{live_server}/api/v2/tools?lang=en"), timeout=10) as response:
        assert response.status == 200


def test_bot_guide_http_includes_advanced_tools(live_server):
    with urlopen(Request(f"{live_server}/api/bot-guide?lang=ko"), timeout=10) as response:
        body = json.loads(response.read().decode("utf-8"))
    assert body["advanced_tools"]["schema"] == ADVANCED_TOOLS_SCHEMA
    ids = {tool["id"] for tool in body["advanced_tools"]["tools"]}
    assert {"hub", "production", "bots", "operations"} <= ids
    assert body["advanced_tools"]["operator"] == "bot"
    assert "production" in body["advanced_tools"]["assigned"]


def test_default_assignment_is_every_live_api(studio):
    catalog = advanced_tools_catalog("en")
    assert set(catalog["assigned"]) == set(default_assigned_ids())
    assert "production" in catalog["assigned"]
    assert "operations" in catalog["assigned"]
    assert "agent" not in catalog["assigned"]
    assert catalog["bot_instruction"].startswith("Use only the assigned advanced tools.")


def test_human_can_narrow_which_tools_the_bot_uses(studio):
    catalog = assign_advanced_tools({"ids": ["production", "operations"], "lang": "ko"})
    assert catalog["assigned"] == ["production", "operations"]
    by_id = {tool["id"]: tool for tool in catalog["tools"]}
    assert by_id["production"]["assigned"] is True
    assert by_id["operations"]["assigned"] is True
    assert by_id["bots"]["assigned"] is False
    assert "지정: production, operations" in catalog["bot_instruction"]
    cleared = assign_advanced_tools({"ids": [], "lang": "ko"})
    assert cleared["assigned"] == []
    assert "지정된 것이 없습니다" in cleared["bot_instruction"]


def test_unknown_tool_id_is_rejected(studio):
    with pytest.raises(ValueError, match="Unknown advanced tool"):
        assign_advanced_tools({"ids": ["production", "not-a-tool"]})


def test_assign_tools_over_http(live_server):
    request = Request(
        f"{live_server}/api/v2/tools",
        data=json.dumps({"ids": ["production"], "lang": "en"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=10) as response:
        body = json.loads(response.read().decode("utf-8"))
    assert body["assigned"] == ["production"]
    by_id = {tool["id"]: tool for tool in body["tools"]}
    assert by_id["production"]["assigned"] is True
    assert by_id["bots"]["assigned"] is False
    with urlopen(Request(f"{live_server}/api/v2/tools?lang=en"), timeout=10) as response:
        again = json.loads(response.read().decode("utf-8"))
    assert again["assigned"] == ["production"]


def test_assign_unknown_tool_over_http(live_server):
    request = Request(
        f"{live_server}/api/v2/tools",
        data=json.dumps({"ids": ["nope"]}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with pytest.raises(HTTPError) as caught:
        urlopen(request, timeout=10)
    assert caught.value.code == 400
