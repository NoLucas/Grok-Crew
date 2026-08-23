# Grok Crew

<p align="right"><strong>English</strong> · <a href="README.ko.md">한국어</a></p>

**Turn rough short-form footage into a bot-ready edit plan, a local MP4, and an optional Instagram upload—without sending the project, media, or bot history to a cloud backend.**

<p>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-127.0.0.1-1d1d1b?style=flat-square">
  <img alt="Node 22 or newer" src="https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square">
  <img alt="Python 3.10 or newer" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square">
  <img alt="Runs on your computer" src="https://img.shields.io/badge/runs-on%20your%20computer-f4c400?style=flat-square">
</p>

![Grok Crew production workspace](public/readme/production-workspace.png)

## Watch it work

[![Watch the 21-second Grok Crew workflow demo](public/demo/grok-crew-workflow.gif)](public/demo/grok-crew-workflow.mp4)

*The preview plays directly in this README. Click it to open the full MP4.*

## Why Grok Crew?

Short-form editing breaks down when the creative brief, bot instructions, cut decisions, render jobs, and delivery status live in different tools. Grok Crew makes that handoff visible and repeatable on one computer:

```text
rough footage → transcript cut map → bot edit method → local MP4 → queue or auto-upload
```

It is a **local production desk for people and same-PC bots**, not a cloud video editor and not a remote bot service.

## Start in under five minutes

### What you need

- Node.js 22 or newer
- Python 3.10 or newer
- A local clone of this repository

### Run it

```sh
git clone https://github.com/NoLucas/JIN-Reel-forge.git grok-crew
cd grok-crew
npm run local
```

The first run installs browser and local-render dependencies, creates a private Python environment, and starts Local Studio. Then open [http://localhost:3000/production](http://localhost:3000/production).

Nothing needs a cloud account or provider API key. Stop with `Ctrl+C`; running the command again resumes the same local workspace.

### Give a local bot its first task

Run these commands from the cloned folder in the bot's terminal:

```sh
python local_studio/grok_crew.py contract
python local_studio/grok_crew.py entry --bot-id editor-01 --display-name "Editor 01" --purpose edit_video --task "Prepare a transcript-first short-form edit plan." --execution-mode auto_local
```

Then open [Bot Check](http://localhost:3000/bots). The bot appears only after it has actually checked in.

## The first useful workflow

1. Open **Production** and create a project using media under `local_studio/workspace/inputs`.
2. Let the bot read the [Bot Guide](http://localhost:3000/bot-guide), set its edit method, and save a transcript cut map.
3. Use **Operations Center** to inspect media, save project memory, compare A/B edits, and run quality checks.
4. Render locally. A bot can use `auto_local`, or choose a human-approval gate for its own renders.
5. Add an Instagram job. Turn on **Auto-upload** to start immediately, or leave it in the local queue for direct execution later.

## What it does

| Instead of | Grok Crew gives you |
| --- | --- |
| A bot that edits from a vague prompt | A structured local guide, edit method, project memory, and visible task board |
| Guessing where silences, retakes, and filler are | Transcript-first cut maps and media preflight reports |
| Discovering problems after export | Pre-render, post-render, and delivery quality reports |
| Losing editing context between bot runs | Local SQLite project memory, job history, and bot heartbeat records |
| A publish action with unclear status | A local MP4 render queue and optional per-job Instagram auto-upload |

### Built-in production tools

- Project setup, local source/output paths, and render settings
- Transcript cut maps for word- and phrase-led editing
- Reframing, captions, speed, FPS, look, audio policy, and quality choices
- Media inspection for orientation, FPS, duration, audio, black frames, and silence
- Quality checks before render, after render, and before delivery
- Project memory, bot task board, audio plan, A/B variants, brand kits, and overlay slots
- Failure notes and performance notes for the next edit
- Bot Check with real entry, heartbeat, edit, render, and upload progress
- Korean and English interfaces plus a machine-readable bot guide

## For bots: browser or terminal

Every clone includes a dependency-free local CLI. It only accepts loopback addresses.

```sh
# Read the complete machine-readable manual
python local_studio/grok_crew.py guide

# Print a browser page for any workspace tool
python local_studio/grok_crew.py site --page operations
python local_studio/grok_crew.py site --page export

# Check actual bot presence and work history
python local_studio/grok_crew.py bots list
python local_studio/grok_crew.py bots activity
```

Available pages include `studio`, `edit`, `cut`, `production`, `operations`, `bots`, `guide`, `terminal`, `library`, `agent`, `connect`, `packet`, `gates`, `export`, and `privacy`.

See [the local bot manual](local_studio/README.md) for the full command set, or open [Bot Guide](http://localhost:3000/bot-guide?lang=en) after starting the workspace.

## Privacy and optional Instagram delivery

The browser workspace runs at `localhost:3000`; Local Studio binds to `127.0.0.1:7214`. Source media, renders, SQLite records, and bot histories remain under `local_studio/` on the current computer.

Instagram delivery is optional. It needs the owner's locally configured Meta credentials and a supported local MP4. A job can stay queued or start immediately with `--auto-upload`; credentials are never stored in SQLite or exposed to a bot through this project.

## Cloud bot handoff (for a bot that isn't on this PC)

Local Studio still never accepts a connection from another machine — that does not change for a bot running in a cloud sandbox or a different computer. Instead, such a bot hands off a finished edit through a dedicated git repository, and `local_studio/handoff_watcher.py` (running on the owner's own PC) polls that repository and applies the handoff through the same local API a same-PC bot already uses. See [the local bot manual](local_studio/README.md) for setup, and `local_studio/handoff-guide.json` (or `handoff-guide.ko.json`) for the exact package format to hand that bot.

## Use cases

- A creator turns a talking-head recording into a tight vertical Reel without losing the edit reasoning.
- A small content team lets multiple local bots split research, cut planning, QA, and packaging while seeing ownership and status.
- A developer tests a video-editing agent locally before deciding whether any workflow should leave the device.
- A cloud-hosted bot without loopback access to the owner's PC produces the media and edit plan, then hands it off through a dedicated git repository instead of any direct connection.

## Roadmap

- [x] Local project desk, bot entry, task memory, rendering, and optional Instagram delivery
- [x] Transcript cut maps, media preflight, render QA, A/B variants, audio plans, overlays, and brand kits
- [x] Korean/English bot guide and browser-page map
- [x] Import/export portable project bundles
- [x] More local render presets and caption layouts
- [x] Cloud bot handoff through a dedicated git repository, with loopback still closed to the network
- [ ] Community-maintained example edit packs

## Feedback and contributions

Found a rough edge or have an editing workflow worth preserving? Please start with [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports, feature requests, small focused pull requests, and reproducible local job failures are especially useful.

This repository is source-available under the [Business Source License 1.1](LICENSE) (`BUSL-1.1`), not a permissive open-source license. You may use, copy, and modify it for personal, educational, or internal business purposes, including running it locally to produce and publish your own content — see the license's Additional Use Grant for the exact terms. Offering it, or a derivative of it, to third parties as a hosted or competing commercial product requires a separate license from the copyright holder. It converts to the MIT License on 2030-08-23.

## Maintainer launch checklist

The repository includes a practical [launch checklist](docs/LAUNCH.md), [announcement kit](docs/ANNOUNCEMENT.md), and [changelog](CHANGELOG.md). Before announcing it, add GitHub topics and publish a tagged first release.
