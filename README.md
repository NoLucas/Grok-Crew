# NOH Reel Forge — local Grok Crew workspace

Each person can clone this repository and run the complete video-editing workspace, Local Studio, and bot CLI on their own computer. Projects, bot records, media paths, and render outputs remain on that person's device.

## Start on a new computer

Install these once:

- Node.js 22 or newer
- Python 3.10 or newer

Then clone this repository, open a terminal in the cloned top-level folder, and run:

```sh
npm run local
```

The first run installs the app and local rendering dependencies, starts both local services, and opens the workspace at `http://localhost:3000/production`.

`Ctrl+C` stops the local workspace. Running `npm run local` again starts the same personal workspace with its existing local project records.

## Give a local bot the full toolset

The bot CLI is included in every clone. A bot running on the same computer should use the included file rather than download another copy:

```sh
python local_studio/grok_crew.py contract
python local_studio/grok_crew.py entry --bot-id grok-editor-01 --display-name "Grok Editor" --purpose edit_video --task "Prepare a transcript-first edit plan." --execution-mode auto_local
```

The first command lists every available local feature: projects, shared edit method, media inspection, transcript cut maps, QA, project memory, task board, brand kits, overlays, A/B plans, local renders, and Instagram delivery queues. Entering connects the bot and gives it every local editing feature immediately; local rendering defaults to `auto_local`.

The bot can choose its own local-render gate at any time:

```sh
python local_studio/grok_crew.py policy set --bot-id grok-editor-01 --mode auto_local
python local_studio/grok_crew.py policy set --bot-id grok-editor-01 --mode approval_required
```

`auto_local` lets that connected bot queue and run its own local render. `approval_required` keeps all planning and editing features available but requires `--human-approved` for each render. Instagram publication is intentionally separate and always requires human approval, the local server switch, and `PUBLISH` confirmation.

For a browser task or screenshot, the bot can request the exact workspace address:

```sh
python local_studio/grok_crew.py site --page production
```

It prints `http://localhost:3000/production`. The CLI/API runs at `http://127.0.0.1:7214`; it is not a browser page. If a bot opens `http://127.0.0.1:7214/production` by mistake, it redirects to the correct workspace.

## What stays local

- The web workspace uses `localhost:3000`.
- Local Studio binds only to `127.0.0.1:7214`.
- SQLite records and media folders are created under `local_studio/` and are ignored by Git.
- Bots can only connect to local loopback addresses through the included CLI.
- Rendering and project operations need no provider API key.

Instagram publishing is optional and remains disabled by default. It requires the owner's own local credentials, a startup switch, explicit recorded human approval, and a final `PUBLISH` confirmation.

## Important limitation

`localhost` means the computer where the command is running. A remote cloud bot cannot access another person's local workspace. To use the full browser and terminal workflow, run the bot runtime, browser, and `npm run local` on the same computer.

## Advanced local commands

- `npm run dev` starts only the browser interface.
- `local_studio/run.ps1` starts only Local Studio on Windows.
- `python local_studio/grok_crew.py guide` reads the bot editing manual.
- `python local_studio/grok_crew.py bots list` shows bots that have actually checked in on this computer.
