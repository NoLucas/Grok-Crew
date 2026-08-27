from urllib.request import Request, urlopen

from advanced_tools import ADVANCED_TOOLS_SCHEMA, advanced_tools_catalog
from studio_server import bot_entry_manifest, bot_guide


def test_catalog_lists_live_production_and_bot_check():
    catalog = advanced_tools_catalog("ko")
    assert catalog["schema"] == ADVANCED_TOOLS_SCHEMA
    assert catalog["same_pc_only"] is True
    by_id = {tool["id"]: tool for tool in catalog["tools"]}
    assert by_id["production"]["live"] is True
    assert by_id["production"]["screen_live"] is True
    assert by_id["production"]["api_live"] is True
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
    assert "HTML" in catalog["rule"] or "긁" in catalog["rule"]


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
        import json
        body = json.loads(response.read().decode("utf-8"))
    assert body["advanced_tools"]["schema"] == ADVANCED_TOOLS_SCHEMA
    ids = {tool["id"] for tool in body["advanced_tools"]["tools"]}
    assert {"hub", "production", "bots", "operations"} <= ids
