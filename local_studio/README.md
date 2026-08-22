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

## Instagram guardrails

The service never stores Meta tokens in SQLite and only reads them from local process environment variables. It never calls Instagram unless a job has a recorded human approval, the server has been launched with `--allow-instagram-publish`, and the job runner is explicitly invoked. The publication client follows the resumable container → binary upload → status poll → publish sequence documented in Meta's sample.
