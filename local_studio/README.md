# NOH Local Studio

This companion service is a private, local production node for Reel Forge. It binds to `127.0.0.1` only and stores project and job metadata in `local_studio/data/studio.db`. Source and output media stay under `local_studio/workspace/`.

## What it does

- Stores projects, render jobs, approval records, and event history in local SQLite.
- Uses MoviePy locally to render EDLs into 1080×1920 H.264/AAC MP4 files.
- Lets each local agent choose automatic local rendering or a human-approval gate, while keeping external publishing protected.
- Can use Meta's resumable upload workflow to publish an approved render to Instagram when the owner explicitly enables publishing and provides local credentials.

## Start

1. From the repository's top-level folder, run `npm run local`. It starts this service and the browser workspace together, creating the local virtual environment and installing the two local libraries on first use.
2. Copy `.env.example` to `.env` only if you want token protection or Instagram publishing.
3. For a Local Studio-only Windows session, run `./run.ps1` from this folder.
4. Or run `.venv\Scripts\python studio_server.py --port 7214` directly.
5. To allow actual Instagram publication, start with `--allow-instagram-publish`. Without this switch, publish jobs can be created but cannot run.

The browser app is at `http://localhost:3000/production`. Create or queue jobs there, or use `bot-contract.json` from a local agent with the same workstation access.

## Bot status and automation

Open `http://localhost:3000/bots` to see which local bots have actually checked in, their last action, and their recent activity. A bot is marked **active** only after it records a check-in within the last five minutes; a browser tab or an assumed bot is never counted as active.

Open `http://localhost:3000/bot-guide` for the bot-facing editing manual. A local bot starts by reading `GET /api/bot-entry`, then sends `POST /api/bot-entry` with its id, display name, purpose, and task. This creates an auditable local entry and the first heartbeat. A newly entered bot receives `auto_local` by default, which enables all local editing functions and its own local rendering; it may instead choose `approval_required`.

Read a bot's choice with `GET /api/bots/{bot_id}/execution-policy`, or record it with `POST /api/bots/execution-policy` using `mode=auto_local` or `mode=approval_required`. The Bot Check page shows the current choice beside each verified bot.

Local agents can record a check-in with `POST /api/bots/heartbeat`. Supply a `bot_id`, `display_name`, `action`, and optional `detail` object. If `LOCAL_STUDIO_TOKEN` is configured, the agent must receive that token through its own runtime configuration; it must not read `.env` or SQLite to obtain it. The browser’s Bot Check page includes a copy-ready request example.

## Operations center

Open `http://localhost:3000/operations` after creating a project in Production. It keeps the project’s transcript cut map, local media inspection, pre/post-render quality reports, bot task board, edit memory, audio plan, A/B variants, overlay slots, brand kits, publish preflight, failure notes, and performance notes in SQLite.

Bots can read `GET /api/projects/{id}/operations`. They can create a timestamped transcript cut map, request a local media inspection, record quality reports, and save planning artifacts. These records are non-destructive: they never change the EDL, render a file, or publish without the existing human approvals.

## Terminal CLI for Grok bots

Any Grok bot runtime that runs in a terminal on this same PC can use the dependency-free CLI already included in a Git clone: `python local_studio/grok_crew.py contract` from the repository's top-level folder. `GET /downloads/grok-crew.py` remains available only for a bot that cannot access the cloned folder. The Terminal page at `http://localhost:3000/terminal` includes copy-ready commands.

`http://127.0.0.1:7214` is the CLI and JSON API service, not the browser workspace. For a page a bot needs to open or capture, run `python grok-crew.py site --page production` (or `operations`, `bots`, `guide`, or `terminal`) and use the printed `http://localhost:3000/...` URL. Opening a known browser page on port 7214 now redirects to the correct browser workspace.

The CLI covers bot entry and heartbeat, execution policy, projects, edit methods, P0–P2 operations, brand kits, and job queues. It refuses non-loopback URLs. If token protection is enabled, supply `LOCAL_STUDIO_TOKEN` only through that bot terminal's environment. A connected bot can use `policy set --bot-id <id> --mode auto_local` to queue and run its own local renders, or choose `approval_required` to require `--human-approved` for rendering. Instagram queueing and publishing remain human-approved; the server also enforces the publication switch and `PUBLISH` confirmation.

## Instagram guardrails

The service never stores Meta tokens in SQLite and only reads them from local process environment variables. It never calls Instagram unless a job has a recorded human approval, the server has been launched with `--allow-instagram-publish`, and the job runner is explicitly invoked. The publication client follows the resumable container → binary upload → status poll → publish sequence documented in Meta's sample.
