import config
import grok_crew


class FakeClient:
    def __init__(self, invite_error="", last_action="still_here"):
        self.calls = []
        self.invite_error = invite_error
        self.last_action = last_action

    def request(self, path, body=None):
        self.calls.append((path, body))
        if path == "/api/bots/next-invite" and self.invite_error:
            raise RuntimeError(self.invite_error)
        if path == "/api/bots/heartbeat":
            return {"bot": {"bot_id": body["bot_id"], "last_action": self.last_action}}
        return {"ok": True, "path": path}


def test_keep_once_enters_then_beats_then_reads_invite():
    client = FakeClient()
    grok_crew.keep_seat(client, "grok-planner", "Grok Bot 기획자", "plan_edit", interval=0, once=True)
    assert [path for path, _ in client.calls] == [
        "/api/bot-entry",
        "/api/bots/heartbeat",
        "/api/bots/next-invite",
    ]
    assert client.calls[0][1]["purpose"] == "plan_edit"
    assert client.calls[1][1]["action"] == "still_here"
    assert client.calls[2][1]["bot_id"] == "grok-planner"


def test_keep_once_survives_an_idle_invite():
    client = FakeClient(invite_error="Local Studio rejected the request: no invite")
    grok_crew.keep_seat(client, "grok-scraper", "Grok Bot 스크래핑", "collect", interval=0, once=True)
    assert client.calls[1][1]["action"] == "still_here"
    assert client.calls[-1][0] == "/api/bots/next-invite"


def test_keep_parser_is_a_same_pc_loop():
    parser = grok_crew.build_parser()
    args = parser.parse_args([
        "keep",
        "--bot-id",
        "grok-editor",
        "--display-name",
        "Grok Bot 편집자",
        "--purpose",
        "edit_video",
        "--once",
    ])
    assert args.group == "keep"
    assert args.once is True
    assert grok_crew.SEAT_KEEP_SECONDS == config.SEAT_KEEP_SECONDS == 60
    assert config.SEAT_ACTIVE_SECONDS == 300
    assert args.interval == grok_crew.SEAT_KEEP_SECONDS


def test_keep_stops_when_desk_sends_disconnected():
    client = FakeClient(last_action="disconnected")
    grok_crew.keep_seat(client, "grok-editor", "Grok Bot 편집자", "edit_video", interval=0, once=False)
    assert [path for path, _ in client.calls] == ["/api/bot-entry", "/api/bots/heartbeat"]
    assert grok_crew.heartbeat_last_action({"bot": {"last_action": "disconnected"}}) == "disconnected"
