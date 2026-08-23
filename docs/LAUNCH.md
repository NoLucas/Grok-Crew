# Grok Crew launch checklist

Use this before the first public GitHub release.

## Repository basics

- [x] The README uses the public GitHub clone URL.
- [x] Add a license (Business Source License 1.1 — source-available, not open source; converts to MIT on 2030-08-23).
- [ ] Add a concise repository description: `Local-first video editing workspace for people and same-PC bots.`
- [ ] Add relevant GitHub topics: `video-editing`, `local-first`, `moviepy`, `ai-agents`, `grok`, `reels`, `instagram`, `automation`.
- [ ] Create a `v0.1.0` release using the changelog notes.
- [ ] Review `npm audit` before release. Do not use a forced dependency upgrade without rebuilding and testing the workspace.

## First experience

- [ ] Run the Quick Start from a fresh clone on Windows, macOS, or Linux.
- [ ] Confirm the production preview image still matches the current interface.
- [ ] Confirm `python local_studio/grok_crew.py contract` works from a fresh terminal.
- [ ] Add one short example project or safe sample media only if you have rights to share it.

## Announcement

- [ ] Share the problem: short-form bot editing loses its context across prompts, export jobs, and delivery steps.
- [ ] Show the first win: local source → cut map → MP4 → optional upload.
- [ ] Explain the local-first boundary and optional Instagram setup honestly.
- [ ] Ask for one specific kind of feedback, such as caption workflow, cut-map design, or local render reliability.

## Community follow-through

- [ ] Reply to early issues with a reproduction status or next action.
- [ ] Tag duplicate requests and turn repeated feedback into a small roadmap item.
- [ ] Keep pull requests focused and update the changelog for user-visible behavior.
