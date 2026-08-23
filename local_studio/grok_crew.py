#!/usr/bin/env python3
"""Grok Crew CLI — a dependency-free local client for NOH Reel Forge."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


class LocalStudioClient:
    def __init__(self, server: str, token: str) -> None:
        parsed = urlparse(server)
        if parsed.scheme != "http" or parsed.hostname not in LOCAL_HOSTS:
            raise ValueError("Grok Crew CLI only connects to http://127.0.0.1 or http://localhost.")
        self.server = server.rstrip("/")
        self.token = token

    def request(self, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
        headers = {"Accept": "application/json"}
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        request = Request(f"{self.server}{path}", data=data, headers=headers, method="POST" if body is not None else "GET")
        try:
            with urlopen(request, timeout=120) as response:  # noqa: S310 - host is restricted above.
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8")).get("error", str(exc))
            except (json.JSONDecodeError, UnicodeDecodeError):
                detail = str(exc)
            raise RuntimeError(f"Local Studio rejected the request: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"Local Studio is unavailable at {self.server}: {exc.reason}") from exc


def print_json(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def read_json_file(value: str) -> dict[str, Any]:
    try:
        payload = json.loads(Path(value).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Could not read JSON file: {value}") from exc
    if not isinstance(payload, dict):
        raise ValueError("JSON input must be an object.")
    return payload


def request_body(value: str, *, wrap_segments: bool = False) -> dict[str, Any]:
    try:
        payload = json.loads(Path(value).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Could not read JSON file: {value}") from exc
    if wrap_segments and isinstance(payload, list):
        return {"segments": payload}
    if not isinstance(payload, dict):
        raise ValueError("JSON input must be an object, or a segment array for cut-map.")
    return payload


def require_human_approval(args: argparse.Namespace) -> None:
    if not args.human_approved:
        raise ValueError("This command requires --human-approved after a person has recorded approval.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Use every NOH Reel Forge Local Studio capability from a same-PC terminal.")
    parser.add_argument("--server", default=os.getenv("GROK_CREW_SERVER", "http://127.0.0.1:7214"), help="Local Studio URL; loopback only.")
    parser.add_argument("--token", default=os.getenv("LOCAL_STUDIO_TOKEN", ""), help="Optional Local Studio token. Prefer the LOCAL_STUDIO_TOKEN environment variable.")
    commands = parser.add_subparsers(dest="group", required=True)

    for name, help_text in (("health", "Read local service status."), ("contract", "Read terminal capability contract."), ("guide", "Read bot editing guide.")):
        commands.add_parser(name, help=help_text)

    entry = commands.add_parser("entry", help="Enter Local Studio and record the first bot heartbeat.")
    entry.add_argument("--bot-id", required=True); entry.add_argument("--display-name", required=True)
    entry.add_argument("--purpose", default="edit_video"); entry.add_argument("--task", default="Prepare a local edit plan.")

    heartbeat = commands.add_parser("heartbeat", help="Record an active bot state.")
    heartbeat.add_argument("--bot-id", required=True); heartbeat.add_argument("--display-name", required=True)
    heartbeat.add_argument("--action", required=True); heartbeat.add_argument("--detail-file")

    bots = commands.add_parser("bots", help="Read verified local bot presence and activity.")
    bots_sub = bots.add_subparsers(dest="command", required=True)
    bots_sub.add_parser("list", help="List bot presence.")
    bots_sub.add_parser("activity", help="List recent bot activity.")
    bots_sub.add_parser("entries", help="List local bot entry records.")

    projects = commands.add_parser("projects", help="Read or create local projects.")
    projects_sub = projects.add_subparsers(dest="command", required=True)
    projects_sub.add_parser("list", help="List projects.")
    project_get = projects_sub.add_parser("get", help="Read one project and its jobs."); project_get.add_argument("--project", required=True)
    project_create = projects_sub.add_parser("create", help="Create a project from a JSON payload."); project_create.add_argument("--file", required=True)

    jobs = commands.add_parser("jobs", help="Read and use approved render and publish queues.")
    jobs_sub = jobs.add_subparsers(dest="command", required=True)
    jobs_list = jobs_sub.add_parser("list", help="List all jobs."); jobs_list.add_argument("--project")
    render = jobs_sub.add_parser("render", help="Queue a render after recorded human approval."); render.add_argument("--project", required=True); render.add_argument("--human-approved", action="store_true"); render.add_argument("--requested-by", default="grok_bot")
    instagram = jobs_sub.add_parser("instagram", help="Queue Instagram publishing after recorded human approval."); instagram.add_argument("--project", required=True); instagram.add_argument("--file", required=True); instagram.add_argument("--human-approved", action="store_true")
    run = jobs_sub.add_parser("run", help="Run an already approved job."); run.add_argument("--job", required=True); run.add_argument("--human-approved", action="store_true"); run.add_argument("--publish-confirmation", default="")

    method = commands.add_parser("method", help="Read or set the shared bot edit method.")
    method_sub = method.add_subparsers(dest="command", required=True)
    method_sub.add_parser("get", help="Read active edit method.")
    method_set = method_sub.add_parser("set", help="Set an edit method from JSON."); method_set.add_argument("--file", required=True)

    ops = commands.add_parser("ops", help="Use the P0–P2 local operations center.")
    ops_sub = ops.add_subparsers(dest="command", required=True)
    ops_show = ops_sub.add_parser("show", help="Read project operations."); ops_show.add_argument("--project", required=True)
    ops_inspect = ops_sub.add_parser("inspect", help="Run local media inspection."); ops_inspect.add_argument("--project", required=True); ops_inspect.add_argument("--file")
    ops_cut = ops_sub.add_parser("cut-map", help="Save a timestamped transcript cut map."); ops_cut.add_argument("--project", required=True); ops_cut.add_argument("--file", required=True)
    ops_quality = ops_sub.add_parser("quality", help="Run pre-render, post-render, or publish QA."); ops_quality.add_argument("--project", required=True); ops_quality.add_argument("--stage", choices=("pre_render", "post_render", "publish"), default="pre_render")
    ops_artifact = ops_sub.add_parser("artifact", help="Save project memory, bot task, audio plan, variant, overlay plan, or performance note."); ops_artifact.add_argument("--project", required=True); ops_artifact.add_argument("--file", required=True)
    ops_update = ops_sub.add_parser("update", help="Update a saved task or plan artifact."); ops_update.add_argument("--artifact", required=True); ops_update.add_argument("--file", required=True)

    brand = commands.add_parser("brand", help="Read or save reusable local brand kits.")
    brand_sub = brand.add_subparsers(dest="command", required=True)
    brand_sub.add_parser("list", help="List brand kits.")
    brand_save = brand_sub.add_parser("save", help="Save a brand kit from JSON."); brand_save.add_argument("--file", required=True)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    client = LocalStudioClient(args.server, args.token)

    if args.group == "health":
        print_json(client.request("/health")); return
    if args.group == "contract":
        print_json(client.request("/api/terminal-contract")); return
    if args.group == "guide":
        print_json(client.request("/api/bot-guide")); return
    if args.group == "entry":
        print_json(client.request("/api/bot-entry", {"bot_id": args.bot_id, "display_name": args.display_name, "purpose": args.purpose, "task": args.task})); return
    if args.group == "heartbeat":
        detail = read_json_file(args.detail_file) if args.detail_file else {}
        print_json(client.request("/api/bots/heartbeat", {"bot_id": args.bot_id, "display_name": args.display_name, "action": args.action, "detail": detail})); return
    if args.group == "bots":
        paths = {"list": "/api/bots", "activity": "/api/bot-activity", "entries": "/api/bot-entries"}
        print_json(client.request(paths[args.command])); return

    if args.group == "projects":
        if args.command == "list": print_json(client.request("/api/projects"))
        elif args.command == "get": print_json(client.request(f"/api/projects/{args.project}"))
        else: print_json(client.request("/api/projects", read_json_file(args.file)))
        return

    if args.group == "jobs":
        if args.command == "list":
            print_json(client.request(f"/api/projects/{args.project}" if args.project else "/api/jobs"))
        elif args.command == "render":
            require_human_approval(args); print_json(client.request(f"/api/projects/{args.project}/render", {"approved": True, "requested_by": args.requested_by}))
        elif args.command == "instagram":
            require_human_approval(args); payload = read_json_file(args.file); payload["approved"] = True; print_json(client.request(f"/api/projects/{args.project}/instagram", payload))
        else:
            require_human_approval(args); payload = {"confirmation": args.publish_confirmation} if args.publish_confirmation else {}; print_json(client.request(f"/api/jobs/{args.job}/run", payload))
        return

    if args.group == "method":
        print_json(client.request("/api/edit-method" if args.command == "get" else "/api/edit-method", None if args.command == "get" else read_json_file(args.file))); return

    if args.group == "ops":
        if args.command == "show": print_json(client.request(f"/api/projects/{args.project}/operations"))
        elif args.command == "inspect": print_json(client.request(f"/api/projects/{args.project}/inspect", request_body(args.file) if args.file else {}))
        elif args.command == "cut-map": print_json(client.request(f"/api/projects/{args.project}/cut-map", request_body(args.file, wrap_segments=True)))
        elif args.command == "quality": print_json(client.request(f"/api/projects/{args.project}/quality-check", {"stage": args.stage}))
        elif args.command == "artifact": print_json(client.request(f"/api/projects/{args.project}/artifacts", request_body(args.file)))
        else: print_json(client.request(f"/api/artifacts/{args.artifact}/update", request_body(args.file)))
        return

    if args.group == "brand":
        print_json(client.request("/api/brand-kits" if args.command == "list" else "/api/brand-kits", None if args.command == "list" else read_json_file(args.file)))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(2)
