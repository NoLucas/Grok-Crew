# Grok Crew

<p align="center"><strong>English</strong> &nbsp;·&nbsp; <a href="README.ko.md">한국어</a> &nbsp;·&nbsp; <a href="README.zh.md">简体中文</a> &nbsp;·&nbsp; <a href="README.ja.md">日本語</a></p>

**Turn rough short-form footage into a bot-ready edit plan, a local MP4, and an optional Instagram upload—without sending the project, media, or bot history to a cloud backend.**

<p>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-127.0.0.1-1d1d1b?style=flat-square">
  <img alt="Node 22 or newer" src="https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square">
  <img alt="Python 3.10 or newer" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square">
  <img alt="Runs on your computer" src="https://img.shields.io/badge/runs-on%20your%20computer-f4c400?style=flat-square">
</p>

## Watch it work

[![Watch the 20-second Grok Crew workflow demo](public/demo/grok-crew-workflow.gif)](public/demo/grok-crew-workflow.mp4)

*The preview plays directly in this README. Click it to open the full MP4.*

## Run it locally

```sh
git clone https://github.com/NoLucas/Grok-Crew.git grok-crew
cd grok-crew
npm run local
```

Open [Production](http://localhost:3000/production) when the setup finishes. The first run installs the local browser and renderer dependencies, creates a private Python environment, and prepares a bundled sample input — no cloud account or provider API key is required.

> **License:** Grok Crew is source-available under [BUSL-1.1](LICENSE), not an open-source project. See the [license](LICENSE) for the exact use rights.

### Render a real sample immediately

Keep `npm run local` running. In a second terminal from this repository, run `npm run sample`. It creates a real two-cut project, records a local sample-bot check-in, and renders `local_studio/workspace/outputs/grok-crew-sample-render.mp4`. It does **not** create an Instagram job. See [sample-project](sample-project/README.md) for the portable project payload.

## Tell a Grok bot what to do

Start Grok Crew with `npm run local`, then send this to a bot that is running on the **same PC**:

```text
Use Grok Crew on this PC to turn inputs/source.mp4 into a vertical 9:16 social edit.
Keep the strongest lines, add captions, and render outputs/final.mp4. Do not upload it.
First read the local Bot Guide if you need details. When finished, report the changes
you made and the output path.
```

Name the source, format, editing goal, delivery path, and upload preference. The bot reads the local guide, checks in, records its work, and returns the local file. A bot on another computer or in a cloud sandbox cannot open this PC's loopback workspace directly; use the [cloud bot handoff](#cloud-bot-handoff-for-a-bot-that-isnt-on-this-pc) for that case.

## Why Grok Crew?

Short-form editing breaks down when the creative brief, bot instructions, cut decisions, render jobs, and delivery status live in different tools. Grok Crew makes that handoff visible and repeatable on one computer:

```text
rough footage → transcript cut map → bot edit method → local MP4 → queue or auto-upload
```

It is a **local production desk for people and same-PC bots**, not a cloud video editor and not a remote bot service.

## First-run details

### What you need

- Node.js 22 or newer
- Python 3.10 or newer
- A local clone of this repository

`npm run local` starts the browser workspace at `localhost:3000` and Local Studio at `127.0.0.1:7214`. Stop with `Ctrl+C`; running the same command later resumes the local workspace.

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

## What works now vs. planning and preview

| Actually runs on this computer | Planning, preview, or non-destructive work |
| --- | --- |
| **Production** creates a Local Studio project and renders a real local MP4. An Instagram job can run only with the owner’s local Meta credentials. | **Studio, Edit Lab, Cut Log, Agent Desk, Connect, Packet, Gates, Export, and Library** help draft, preview, package, or move a plan. They do not cut source media, start a render, or upload anything. |
| **Bot Check** records real bot entries, heartbeats, policies, and job activity in local SQLite. The same-PC terminal CLI creates projects and runs jobs through the same local service. | **Operations Center** can save cut maps, memory, task assignments, A/B variants, audio/overlay plans, brand kits, and quality reports; these are local and useful, but non-destructive until a project is rendered in Production. |
| **Operations Center** also performs local media inspection and pre-/post-render quality checks. | **Bot Guide, Terminal, and Privacy** are local instructions and status views; they do not themselves change media. |

## Pages at a glance

The browser workspace at `localhost:3000` is split into these local pages. The live-action boundary above is deliberate: planning never silently changes a source file or publishes a post.

- `/` Studio — see the current project's mood and concept at a glance
- `/edit` Edit Lab — frame, motion, typography, timing, and caption preview (local-only, does not affect the real render)
- `/cut` Cut Log — mark kept/dropped segments from the transcript (does not cut the actual file)
- **`/production` Production — create a project, set the source→output path, configure the Finish Rack, queue renders, and send to Instagram. This is the only page where a real local render or publish actually happens.**
- `/operations` Operations Center — media inspection, quality reports, project memory, the task board, A/B variants, audio/overlay plans, and brand kits
- **`/bots` Bot Check — bot entry, heartbeat, and execution policy (`auto_local` vs. approval required). This is the only page where real bot activity is recorded.**
- `/terminal` Terminal — CLI/API instructions for a bot on this same PC
- `/bot-guide` Bot Guide — the machine-readable editing rules, workflow, and boundaries for bots
- `/library` Library — local reference material
- `/agent` Agent Desk — brief, rules, task list, and handoff notes
- `/connect` Connect — export/import an offline snapshot for a manual handoff (no server call)
- `/packet` Packet — a single-piece brief and caption packet
- `/gates` Gates — a pre-publish readiness checkpoint
- `/export` Export — resolution, caption packet, and final delivery details
- `/privacy` Privacy — the "only on this PC" boundary and a local-data reset

### A real example

A bot drove this end to end with the CLI only, no browser clicks: it created a project in Production (`inputs/source.mp4` → `outputs/final-video.mp4`), set the Finish Rack to 9:16, 30fps, compact quality, center reframe, captions on, and muted audio, entered through Bot Check with an `auto_local` execution policy, then rendered two joined clips — 0–4s ("ONE ASK") and 5–9s ("SIX LINES") — into an 8-second local MP4. Cut Log, the edit method, Operations, and the actual Instagram upload are the parts a person still clicks through directly in the browser.

### Instructing a bot in plain language

You don't need to know the API to direct a bot — plain instructions are enough, because the bot reads the [Bot Guide](http://localhost:3000/bot-guide?lang=en) and turns them into the right local calls itself. A real exchange looked like this:

> **You:** Use the site to do a quick edit and give me the finished clip.
>
> **Bot:** I'll edit it in Local Studio and keep it short — no Instagram upload. Checking the source file first... found the project format... rendering two clips now, 8 seconds total.
>
> **Bot:** Cut to 8 seconds, two clips, in Local Studio. Nothing was uploaded to Instagram.
> - 0–4s: ONE ASK
> - 4–8s: SIX LINES
> - 1080×1920, muted, captions on

[![Watch the full plain-language bot workflow](public/demo/bot-plain-language-en-v2.gif)](public/demo/bot-plain-language-en-v2.mp4)

Ask it what it actually used, and it can explain exactly which local functions it touched — in this case, Production to create and render the project and Bot Check to enter with an `auto_local` policy, without ever opening a browser page or touching Cut Log, Operations, or Instagram.

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
- [ ] Bundle an open-license caption font so rendering doesn't depend on finding a system font
- [ ] Surface render concurrency as a documented setting instead of a silent single-worker default
- [ ] Make the local CORS/Origin allow-list configurable instead of hardcoding port 3000
- [ ] Publish delivery beyond Instagram (TikTok, YouTube Shorts)
- [ ] Automated test suite for the render pipeline and app
- [ ] Automatic music ducking under dialogue instead of a flat volume mix
- [ ] GitHub Actions CI for lint/build/Python checks on every PR
- [ ] Extend the live browser UI and bot guide to Chinese/Japanese to match the README translations
- [ ] Harden the cloud bot handoff channel (media size cap, bundle size cap, max packages per cycle)

## Feedback and contributions

Found a rough edge or have an editing workflow worth preserving? Please start with [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports, feature requests, small focused pull requests, and reproducible local job failures are especially useful.

This repository is source-available under the [Business Source License 1.1](LICENSE) (`BUSL-1.1`), not a permissive open-source license. You may use, copy, and modify it for personal, educational, or internal business purposes, including running it locally to produce and publish your own content — see the license's Additional Use Grant for the exact terms. Offering it, or a derivative of it, to third parties as a hosted or competing commercial product requires a separate license from the copyright holder. It converts to the MIT License on 2030-08-23.

## Maintainer launch checklist

The repository includes a practical [launch checklist](docs/LAUNCH.md), [announcement kit](docs/ANNOUNCEMENT.md), and [changelog](CHANGELOG.md). Before announcing it, add GitHub topics and publish a tagged first release.
