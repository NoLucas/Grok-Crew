# NOH Local Studio

This companion service is a private, local production node for Reel Forge. It binds to `127.0.0.1` only and stores project and job metadata in `local_studio/data/studio.db`. Source and output media stay under `local_studio/workspace/`.

## What it does

- Stores projects, render jobs, approval records, and event history in local SQLite.
- Uses MoviePy locally to render approved EDLs into 1080×1920 H.264/AAC MP4 files.
- Lets local agents use a narrow, approval-gated job contract.
- Can use Meta's resumable upload workflow to publish an approved render to Instagram when the owner explicitly enables publishing and provides local credentials.

## Start

1. In PowerShell, run `./run.ps1`. It creates the local virtual environment and installs the two local libraries.
2. Copy `.env.example` to `.env` only if you want token protection or Instagram publishing.
3. Run `./run.ps1` again whenever you need the service.
4. Or run `.venv\Scripts\python studio_server.py --port 7214` directly.
5. To allow actual Instagram publication, start with `--allow-instagram-publish`. Without this switch, publish jobs can be created but cannot run.

The browser app is at `http://localhost:3000/production`. Create or queue jobs there, or use `bot-contract.json` from a local agent with the same workstation access.

## Bot status and automation

Open `http://localhost:3000/bots` to see which local bots have actually checked in, their last action, and their recent activity. A bot is marked **active** only after it records a check-in within the last five minutes; a browser tab or an assumed bot is never counted as active.

Open `http://localhost:3000/bot-guide` for the bot-facing editing manual. A local bot starts by reading `GET /api/bot-entry`, then sends `POST /api/bot-entry` with its id, display name, purpose, and task. This creates an auditable local entry and the first heartbeat; it does not grant render or publish approval.

Local agents can record a check-in with `POST /api/bots/heartbeat`. Supply a `bot_id`, `display_name`, `action`, and optional `detail` object. If `LOCAL_STUDIO_TOKEN` is configured, the agent must receive that token through its own runtime configuration; it must not read `.env` or SQLite to obtain it. The browser’s Bot Check page includes a copy-ready request example.

## Operations center

Open `http://localhost:3000/operations` after creating a project in Production. It keeps the project’s transcript cut map, local media inspection, pre/post-render quality reports, bot task board, edit memory, audio plan, A/B variants, overlay slots, brand kits, publish preflight, failure notes, and performance notes in SQLite.

Bots can read `GET /api/projects/{id}/operations`. They can create a timestamped transcript cut map, request a local media inspection, record quality reports, and save planning artifacts. These records are non-destructive: they never change the EDL, render a file, or publish without the existing human approvals.

## Terminal CLI for Grok bots

Any Grok bot runtime that runs in a terminal on this same PC can download the dependency-free local CLI from `GET /downloads/grok-crew.py`. The Terminal page at `http://localhost:3000/terminal` includes copy-ready download and first-entry commands.

The CLI covers bot entry and heartbeat, projects, edit methods, P0–P2 operations, brand kits, and approved job queues. It refuses non-loopback URLs. If token protection is enabled, supply `LOCAL_STUDIO_TOKEN` only through that bot terminal's environment. It requires `--human-approved` for render, Instagram queue, and job-run commands; the server still enforces its own approval and publication checks.

## Instagram guardrails

The service never stores Meta tokens in SQLite and only reads them from local process environment variables. It never calls Instagram unless a job has a recorded human approval, the server has been launched with `--allow-instagram-publish`, and the job runner is explicitly invoked. The publication client follows the resumable container → binary upload → status poll → publish sequence documented in Meta's sample.
