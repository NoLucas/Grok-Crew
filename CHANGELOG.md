# Changelog

All notable changes to Grok Crew are documented here.

## Unreleased

### Added

- A public-ready README with quick start, workflow, use cases, roadmap, and local workspace preview.
- Contribution guide, issue templates, and maintainer launch checklist.
- Portable project bundle export/import (`GET /api/projects/{id}/export`, `POST /api/projects/import`, `grok_crew.py bundle export|import`, and an Operations Center card) covering a project's EDL, job history, and artifacts. Source/output media is not included.
- Quality, caption-layout, and platform presets via `GET /api/presets`, selectable in Production's Finish Rack. Platform presets add Feed square (1:1) and Landscape/X (16:9) alongside the existing Reels/TikTok/Shorts (9:16) output.
- Caption background panels (`caption_bg`/`caption_bg_color`) and optional per-clip word-level captions (`word_timings`) for sequential word-by-word reveal instead of one static line.
- Background music mixing (`music_track`, `music_volume`, `music_loop`) mixed under the source audio.
- Renders and Instagram publishes now run on a background worker: starting a job returns immediately, `GET /api/jobs/{id}` reports live progress and supports `wait: true` to block until done, and `POST /api/jobs/{id}/cancel` requests cancellation. A job left `running` after an unclean shutdown is reconciled to `failed` on the next start.
- `local_studio/handoff_watcher.py` lets a remote or cloud-hosted bot that cannot reach this PC's loopback address hand off a finished edit through a dedicated git repository instead. It polls the repository, copies media into the local workspace, and applies the package through the existing `/api/projects/import` and job endpoints — no server changes and no open port. See `local_studio/handoff-guide.json` (or `handoff-guide.ko.json`) for the package format handed to that bot.

### Changed

- Bot Guide now maps every workspace page and explains 18 bot-usable production functions.
- Same-PC bot CLI can print URLs for every workspace page.
- Rendering fails fast with a clear error when no local font can be found for captions, instead of silently skipping them.

### Fixed

- Local Studio now requires the configured `LOCAL_STUDIO_TOKEN` on GET requests as well as POST requests (previously only writes were gated), and rejects any request whose browser `Origin` header is outside `http://localhost:3000` / `http://127.0.0.1:3000`, closing a local cross-site request forgery gap that let an open browser tab drive the service.
- `npm run local` no longer fails with `spawn EINVAL` on Windows when starting the browser dev server — spawning a `.cmd` file (`npm.cmd`) now sets `shell: true`, which recent Node.js versions require on Windows.

## 0.1.0 — Initial local workspace

- Local project, bot, operations, render, and optional Instagram delivery workflow.
- Korean and English browser workspace and machine-readable bot guide.
