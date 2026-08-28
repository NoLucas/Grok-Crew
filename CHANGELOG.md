# Changelog

All notable changes to Grok Crew are documented here.

## Unreleased

- `/home` now opens on an English language gate (English / 한국어 / 中文 / 日本語). The browser language is not guessed, and a leftover localStorage choice does not skip the gate. Only `?lang=` skips it. The first screen is the mark plus native names — no explainer copy. The choice can be changed in the header.
- Removed a personal chatgpt.site host from the homepage allowlist. Extra origins come only from `GROK_CREW_PUBLIC_ORIGIN`.
- `POST /api/get` now rejects foreign `Origin` headers, rate-limits repeats, and only returns a GitHub https download URL. `/home` and the preview server send frame and content-type headers.
- Personal Cursor skills used to build the app are no longer in this repository. Guest bot skills stay in `public/bot-skills/`.
- Removed unused archive copies, the launch-post draft, the idea scrap, the leftover install-guide note, and the unused bot-pack text file. Bot zip instructions still come from `local_studio/bot_pack.py`. Hero art lives only at `public/hero.png`.
- The public homepage is back at `/home`. It shows v1.0.0, with Grok Bot, built-in skills, and a free Windows download that does not wait on email. `POST /api/get` accepts the live homepage origin for optional news. `/` stays the desk. The lock is `docs/HOMEPAGE.ko.md`.

## 1.0.0 - 2026-08-27

Local 1.0. Windows installer: `GrokCrew-Windows.exe` on the `v1.0.0` GitHub Release. Guest notes: `docs/RELEASE_NOTES.v1.0.md`.

### Since 0.2.1

Older Grok-Crew was a browser workspace. 1.0.0 is the PC window: attach a Grok Bot or Agent, paste, save on this PC. Free on this track. No account.

- Connect · Auto · Setup · Edit · Export share one composer: one job, then chips. Unused panels stay folded.
- Other-PC seats are **Grok Bot** and **Agent**, each as planner, scraper, and editor. Built-in skills live in `public/bot-skills/` and are pasted on connect (`planner` + `edit-plan`, `scraper` + `public-pick`, `editor` + `cut-to-plan`). The desk does not scrape.
- Connect only copies attach text. There is no reply-paste field. `127.0.0.1` stays closed to the bot.
- Captions, dubbing, and TTS stay off until the guest turns them on. First open does not block on a voice picker.
- Pair codes use `crypto.getRandomValues`. Stored bot rows must be a known kind, place, and status. GitHub token login failures no longer echo the raw error; the token is cleared.
- Advanced spec doors can be closed after they open. Export’s Post chip shows the real policy.
- Finished files stay on this PC. A GitHub inbox is optional. The public site track is closed; get the exe from the GitHub Release.
- When source and destination differ (Chinese clip → Korean cut), the planner writes both, the scraper keeps the named source, and the editor changes hook/captions/on-screen words only. Do not swap in a lookalike. Login walls stay closed.
- Role extras name a market (ko / en / zh / ja). The scraper picks public pages for that language. Login walls stay closed.
- The Connect row formerly labeled Runner is now **Grok 제작기** / Grok builder. It is this app’s Grok Build worker, not the Grok Bot chat.
- Auto records materials before a cut starts. Login-walled Instagram/TikTok stay off limits.
- The current track is free: one GitHub Release exe, no account, no card, no stamp.

The bullets below were already in the 1.0 desk and stay part of this tag.
- Auto is a staged composer, not a wall of cards. The first screen is one prompt plus three summary chips (pictures / where / sound). Those panes and TTS stay available, but they open only when asked. After Make, the desk swaps to a paste-and-wait stage; after a cut, it swaps to preview and save. Help, news, and “say it again” sit in folded details. No new `/api/v2` field.
- Auto captions, dubbing, and **TTS** stay **off** until the operator turns them on. Captions on runs VAD then whisper.cpp. Dubbing on uses operator audio only; if none, keep the original. TTS on uses one chosen model (Kokoro-82M if they only press Next; Step Audio EditX or Zonos-v0.1 have hardware warnings). TTS off never generates a voice. First open does not block on the voice picker. Additive `GET /api/v2/first-run` `voice_model` and `POST /api/v2/first-run/voice-model`.
- When source and destination differ (Chinese clip → Korean cut), the planner writes both, the scraper keeps the named source, and the editor changes hook/captions/on-screen words only. Do not swap in a lookalike Korean video. Login walls stay closed.
- Role extras now name a market (ko / en / zh / ja): planner writes country style, cut density, and effects; scraper picks public pages for that language, not Korea-only; editor follows that cut/effect density. Login walls stay closed. No new `/api/v2` field.
- Each Other-PC role now gets one extra skill on connect: planner `edit-plan`, scraper `public-pick`, editor `cut-to-plan`. Full text stays in `public/bot-skills/`. The desk still does not scrape. No new `/api/v2` field.
- Connect Other-PC seats sit in two groups, **Grok Bot** and **Agent**. Copying the connect text attaches that seat. There is no reply-paste field. Auto’s “tell the planner again” card no longer says this window does not know if they read it.
- Connect Other-PC seats are **Grok Bot** and **Agent**, each as planner, scraper, and editor. Built-in skills live in `public/bot-skills/` and are pasted on connect. Auto is a planner prompt (URL or how to edit); scrape can seed from that prompt; after a cut you can tell the planner again. The desk still does not scrape. No new `/api/v2` field.
- The Connect row formerly labeled Runner is now **Grok 제작기** / Grok builder. It is this app’s Grok Build worker, not AWS or GitHub Actions, and not the Grok Bot chat you paste into. Internal `runner_id` contracts stay.
- Connect Other-PC cards are **Grok Bot** and a custom agent only. Claude and Cursor brand rows are gone — those products do not offer a pairing API. Same-PC check-in stays. The suggested Grok reply is `GROK_CREW_OK <code> Grok Bot`.
- The public site track is closed. This repo no longer serves `/get`, does not rewrite `/` into a landing page, and does not let chatgpt.site call `POST /api/get`. Get the Windows file from the GitHub Release. The lock is `docs/HOMEPAGE.ko.md`.
- Auto now records the materials before a cut starts. You put videos or images, or you write what a scrape bot should fetch — or both. The scrape list stays on the spec as `collect_query` so the desk knows what will arrive. This app does not scrape; login-walled Instagram/TikTok stay off limits. Owned stills (png/jpg/webp) are allowed in the materials box. Four styles stay visible.
- Future-customer contact is optional: Auto shows a skippable **News later** email card. Today’s job never waits on it. GitHub downloads stay anonymous until the operator sets `NEXT_PUBLIC_GROK_CREW_NEWS_URL`. The lock is `docs/LEADS.ko.md`.
- The current track is free: one GitHub Release exe, no account, no card, no stamp. Paid install and a publisher stamp wait until money is collected. The lock is `docs/FREE.ko.md`.
- Other doors besides a stamp: keep the three pictures, an individual standard stamp, or (later, not this track) the Microsoft Store. Self-signed certs, a friend’s company stamp, and the open-source-only stamp stay closed.
- Signed install without a business: publisher is the person’s legal name. Azure/EV are out for a Korea individual for now. The open door is an individual standard stamp, or keep the three pictures.
- The signed-install plan now starts with a plain-language walkthrough of the blue Windows screen, the publisher stamp, and what the maintainer actually has to buy and lock away.
- Signed Windows install is the current track. The plan is `docs/SIGNED_INSTALL.ko.md`: publisher name and Azure Trusted Signing (or EV) stay outside the repo; the release job stays unsigned until those secrets exist; no server or P5 in this track.
- The locked build list is `docs/BUILD.ko.md`: keep the guest loop (open → connect → one line → paste → save on this PC). Do not add a company server or a new `/api/v2` for that loop. P5 stays a contract.
- Product stack inference is in `docs/STACK.ko.md`: today’s job and the cut stay on this PC (local SQLite + folders). A company server is only for later purchase proof or settings backup, and must never be the door to Start.
- Auto now tells the wait honestly: empty preview while waiting, elapsed time, “this window does not know if the bot read it,” a stay-on-screen save card, last-seen next to the name, recent title chips, a before-start job card, one header dot, same-line retry, replace-cut ask, and an OS ping only when the window is hidden. Own-file mode no longer uses the bot-wait copy. Same-PC bots still do not auto-read the invite.
- The titlebar is **Connect · Auto · Setup · Edit · Export**. After a bot is attached, **Auto** is the landing tab. Auto is one field for today’s line, one Start, five lights (connect → sent → working → cut → save), and a preview that stays in this tab. Hand-it-off and start-with-my-file are two modes inside Auto. Connect stays the only place to attach or remove a bot. Auto save is file-only; posting asks once more. Same-PC bots still need a person to paste the job; the bot does not read the invite by itself. `127.0.0.1` stays closed.
- The titlebar tab is **Connect**. Other-PC links (Grok Bot, your agent) sit at the top. A green light and **Connected** mark each live link, including Local Studio, GitHub, and the Grok builder. Same-PC check-in stays below. `GROK_CREW_OK <code> <name>` still does not open `127.0.0.1`. Setup, Edit, and Export stay off until a bot is attached or you open a file yourself.
- The Windows exe, installer, tray, and desk header use the shutter-play mark: interlocking warm blades around a play triangle, on a light tile.
- The first desk keeps four human steps and hides the rest. Invite text stays on the clipboard; the screen says paste it in the bot window. After copy, a wait strip shows last check and not-yet / arrived / failed. Sample no longer opens by itself. Install failure stays on the same page with three SmartScreen pictures; the bot zip stays under Other method. No-bot help sits next to copy, with a finished-file drop and no path typing. Hand-it-off and open-it-myself stay on two cards. More detail and Advanced tools grow only after the first cut arrives.
- Projects can be renamed, grouped into folders (drag or right-click), and moved to a trash that restores, empties, or auto-deletes after 30 days. Handoff files can be renamed or sent to the same trash.
- Setup can apply YouTube Shorts, Instagram Reels, TikTok, and other edit styles, and save the current knobs as a named local preset. Quality stays locked when a spec is open.
- The Setup style list includes Custom. Assigning a style and saving a named style are separate. The bot-lock note sits at the bottom of Editor Agent controls.
- Aspect ratio and captions are no longer locked when a spec or imported cut is open. Quality stays locked. Setup, briefs, invites, and bot/handoff guides say the same.
- The project list and the remote-bot column can be dragged a little wider or narrower. The center project pane stays usable. Widths persist.
- Helper copy under “values the bot must keep”, the status line, and Remote bot can be folded. Error and loading status stay visible.
- The bot-lock note can be dismissed with “don’t show again.” That choice stays on this computer.

### Already in this tag

- Desktop shows the saved folder after a bot drop: media under `inputs/handoff/` and clips in `handoff-materials/`, with previews. Listing stays inside those two roots.
- The folder board stays collapsed to one row until the operator opens it. The file list sits beside the preview. Right-click a file to preview, enlarge, reveal the original, or delete it. Source files stay locked.
- `POST /api/v2/handoff/files/delete` and `POST /api/v2/handoff/files/reveal` stay inside those two roots.
- When a spec or imported cut is open, quality stays locked to the operator value. Aspect and captions can be changed in Setup. The Setup tab explains why. Bots get the same lock in the brief, invite, and bot/handoff guides. Other knobs stay editable.

### Security

- Git inbound packages that fail import stay on disk. The watcher no longer marks them processed or `git rm`s the folder, so a bad `handoff.json` cannot wipe a delivery.
- Inbox `copy_media` now writes only under `inputs/handoff/`. A package cannot clobber `projects.json` or other workspace files through `destination`.
- `HANDOFF_REPO_REMOTE` and `HANDOFF_BRANCH` reject `-e`, `ext::`, `file:`, `?`, `#`, and other git-helper injection. Clone, fetch, and `git rm` use `--` before the operand.
- Concurrent inbox and materials pulls share a lock so two `/handoff/pull` requests cannot import the same package twice.
- `/api/projects/{id}/inspect-media`, `/quality-report`, local analysis, and queued render jobs resolve `source_path` through `require_path` so a tampered project row cannot read outside the workspace.
- Publish HTTP clients now refuse redirects and connect only to the IP checked during URL validation, so a 307 or DNS rebind cannot send the video to an internal address.
- CGNAT (`100.64.0.0/10`) and IPv4-mapped loopback addresses are treated as blocked upload targets.
- An empty `Origin` header is no longer treated as a missing Origin. Curl/Electron with no Origin stay allowed; `Origin: ` and `Origin: null` stay blocked.
- Publish receipts claim `running` atomically, so overlapping retries cannot double-post. Crash recovery marks leftovers `interrupted` and retry reports `possible_duplicate`.
- Publish error redaction also covers JSON secret fields such as `"access_token": "..."`.
- Workspace-relative paths always use `/`, including on Windows.
- Desktop only shows and retries receipts whose `project_id` matches the open project.
- GitHub release URL matching is case-insensitive for the `owner/repo` slug.
- Instagram, YouTube, and TikTok upload URLs are now https-only, host-allowlisted, and rejected when they resolve to a private or loopback address.
- Publish error text also redacts OAuth headers, refresh tokens, `ya29.` / `ghp_` / `github_pat_` / `sk-` secrets.
- Publish retry keeps only caption/privacy/render fields; client `approved` / `receipt_id` / extra keys are not forwarded into the publisher.
- GitHub update checks require an `owner/repo` slug; `openExternal` only opens that repo's `https://github.com/.../releases` pages, and new windows are limited to github.com.
- `INSTAGRAM_API_VERSION` / `INSTAGRAM_USER_ID` and Instagram container ids are constrained before they enter URL paths.
- Publish results store a workspace-relative `source_path` (filename only if the file is outside the workspace).
- Local Studio token compare is length-safe, so a short Authorization header returns 401 instead of leaking a digest-length error.
- GitHub device-flow verification URLs must be `https://github.com/login/device...` before the desktop opens them.
- Timeline assets, LUT files, and OTIO imports now reject paths outside the local workspace, so render/preview cannot read arbitrary files.
- Electron IPC normalizes Studio URLs before fetch, so `/api/../media` no longer bypasses the `/api` allowlist.
- Renderer navigation now compares origins instead of string prefixes, blocking `http://127.0.0.1:port@evil` style loads.
- IPC handlers require the main window as sender; preload fails closed without a runtime argument.
- `/health` hides workspace and database paths unless a configured token is presented.
- Unexpected handler exceptions return a generic 500 instead of internal strings; malformed `Range` headers return 416.
- Render-queue jobs now require the same human approval or `auto_local` gate as `/render`.
- The desktop UI no longer reads a Local Studio token from `localStorage`. Browser responses send a Content-Security-Policy.

### Fixed

- `find_outbox_folder` still finds a leftover `grok/{id}` folder when `editor/.processed/{id}` already exists.
- Desktop auto-pull retries after a failed first pull instead of treating the failure as done.
- Simple desk bot-zip download uses `window.grokCrew.apiBase` so packaged Electron does not hardcode `:7214`.
- Simple desk keeps the invite on screen after copy, falls back if the clipboard is blocked, and shows a drag-over drop zone.

### Added

- Cursor agent path verified on this desk: same-PC `POST /api/bot-entry` with `display_name: Cursor`, invite copy, and an editor-inbox package. Notes in `docs/CURSOR_AGENT.ko.md`.
- Door folders are now `handoff-outbox/editor`, `handoff-outbox/collector`, `handoff-inbox/editor`, and `handoff-inbox/collector`. Requests that still say `grok` or `agent` are accepted. Leftover `grok/` and `agents/` folders are still read.
- Short first desk. With no project open, the middle of the screen is a title, a drop zone, and **Copy this for the bot**. That save is one bot (`source_mode: bot`). Incoming grok-door cuts open on their own. `GET /api/v2/edit-specs/{id}/invite` is the paste. `GET /downloads/grok-crew-bot.zip` is the hidden other method. The Windows NSIS build is one-click for this account (`GrokCrew-Windows.exe`).
- Simple-path build order (`docs/SIMPLE_PATH.ko.md`): one Windows file, a short desk (title / drop / copy to one bot), auto-open the incoming cut. Bot zip and picture PDF stay behind that path (`docs/DOWNLOAD_SPLIT.ko.md`).
- Download split plan (`docs/DOWNLOAD_SPLIT.ko.md`): Windows desk file for the person, a bot zip that is not an installer, and a picture PDF if Windows blocks the file. The download page does not ask for administrator first.
- Crew role names are always `Editor Agent` and `Collector Agent`. Grok, Claude, and other brand aliases are not stored as the role. Desktop reads `crew_roster` from `/api/v2/workspace`.
- Style recipes, source mode, and licensed materials. Desktop picks `instagram_reel`, `tiktok_tight`, `youtube_short`, or `youtube_long` and fills length, aspect, hook, pacing, captions, look, and collect hints. Source mode is `own` (editor outbox only), `collect` (both outboxes), or `own_and_collect` (operator A-roll plus collector b-roll). Materials `manifest.json` stores `origin` and `license` (`operator` / `stock` / `public` / `unknown`); unknown licenses show on the desk. `GET /api/v2/style-recipes` lists the packs. This desk still does not scrape websites.
- Two-bot crew. One spec goes to both outboxes: the collector reads `handoff-outbox/collector` and drops clips in `handoff-materials`; the assigned editor reads `handoff-outbox/editor`, cuts those clips, and returns the package to `handoff-inbox/editor`. This desk does not scrape websites. A collector inbox package is rejected as a finished cut.
- Door-scoped outbox. Saving a spec writes `spec.json` and `brief.txt` to `handoff-outbox/editor/{id}` or `handoff-outbox/collector/{id}`. Optional git push uses `outbox/editor/` or `outbox/collector/` and never fails the save if `HANDOFF_REPO_REMOTE` is unset. Receiving a cut archives that spec to `.processed/`. Bots still must not call `127.0.0.1`.
- Two handoff doors. The operator writes a spec on the editor door or the collector door. Editor packages land in `handoff-inbox/editor`; collector packages land in `handoff-inbox/collector`. An editor pull never imports the other door. Runner pairing stays editor-only. Desktop shows the spec desk only when no project is open.
- Incoming packages store `handoff_door` plus a sender name from `bundle.project.created_by` (Grok, Claude, Codex, ChatGPT, Gemini, Cursor, or the written name). The project list and project bar show who delivered the cut.
- Desktop first screen stays local-first: Runner/GitHub controls stay collapsed until pairing, a live job, or the operator opens them. Opening a project lands on Edit (program monitor + timeline) instead of Setup.
- Unclaimed `queued` Grok jobs no longer force the Runner/GitHub inspector open. The collapsed desk shows a cancel control, and `POST /api/v2/control-jobs/cancel-unclaimed` (or cancel on a job with no `runner_id`) marks those jobs `cancelled` immediately so a leftover click cannot hold the first screen.
- Draft-proxy status for every Timeline v2 video sits under the program monitor (and still in the inspector), so the list stays visible when the Status drawer hides the right column under 1050px. Monitor actions show `ready/total`. Final render still uses originals.
- Program-monitor HTTP preview keeps an LRU of MoviePy composites (default 4 slots, `LOCAL_STUDIO_PREVIEW_CACHE_SLOTS`). Switching projects or revisions reuses a live clip instead of rebuilding. A newly ready B-roll proxy still changes the fingerprint. `write_videofile` and `preview_at()` without `project_id` stay one-shot so parity goldens stay 1:1 with the final MP4.
- `docs/ANNOUNCEMENT.md` holds the launch post draft (problem, first win, local-first boundary, one feedback ask). Posting it stays operator-owned. `npm audit` is clean on `vinext@1.0.0-beta.8`.
- Opening a Desktop project queues draft proxies for every Timeline v2 video (`POST .../proxies` with `ensure_all` or `asset_id: "*"`). The monitor toggle stays primary-focused; draft preview picks up ready B-roll proxies. Final render still uses originals only.
- Program monitor HTTP preview now defaults to a draft composite: max 540px wide, JPEG, cheaper audio RMS, and ready proxies when they exist. `GET .../preview?quality=full` and Python `preview_at()` stay 1:1 with the final MoviePy render.
- `GET /api/v2/launch` and `npm run launch:verify` now inventory operator-owned OAuth app and macOS signing env **names** (presence only, never values). `oauth_apps.ready` and `code_signing.ready` stay `false` even when those names are set — this repo still does not register apps or flip `electron-builder` notarize.
- First-run no longer needs a second terminal: Desktop can open the bundled sample project in one click (`POST /api/v2/first-run/sample`). `npm run local` and `npm run desktop` share the same Python + sample bootstrap, and later starts skip `pip` when `requirements.txt` is unchanged.

- P3 publish receipts: list recent Instagram/TikTok/YouTube attempts, retry a failed receipt with the same idempotency key, and mark receipts left `running` as failed on the next Local Studio start.
- Publish failures redact bearer/access tokens before they are stored or returned.
- `GET /api/v2/launch` reports local 1.0 gates versus external OAuth, code signing, and in-place auto-update.
- Packaged desktop can check GitHub releases and open the download URL. Unpackaged builds stay on the local tree; unsigned in-place install remains external.
- Desktop Export shows receipt status/retry, and the title bar reports local launch gates plus the current update policy.
- `npm run launch:verify` prints the local/external launch report.
- UI-01..UI-10 desktop quality: readable type scale, 8px spacing, first-project/version/receipt empty states, workspace loading and reconnect, focus-visible rings, narrow titlebar tabs, project/status drawers, and a visible command-bar message on small screens.
- Loopback preview ports such as `127.0.0.1:43123` can call Local Studio. Remote website origins stay blocked.

- P1-08 program-monitor composite preview now samples the same MoviePy timeline used for final output, so playhead frames, captions, timing, and audio RMS can be compared 1:1 with the rendered MP4.
- P2-01 compositing: per-clip blend modes, rectangle/ellipse masks with feather, and chroma key.
- P2-02 motion: speed-ramp easing, attach-to-tracker points, and a lightweight stabilize pass.
- P2-03 nested sequence assets and multicam camera switching.
- P2-04 lift/gamma/gain/saturation grade, `.cube` LUT, and waveform/parade scopes on the program monitor.
- P2-05 track EQ and compressor in the audio mixer.
- P2-06 CMX EDL / OTIO-shaped exchange and a desktop render queue.

- P1-02 track editing in the desktop timeline: persistent clip groups, track lock/mute/solo controls, marker add/remove, frame-based snapping, range and additive multi-selection, and atomic movement of a selected group.
- P1-03 persistent undo/redo history: every action creates a new immutable revision, redo survives restart, a divergent edit clears the redo branch, and the desktop exposes buttons plus standard keyboard shortcuts.
- P1-04 local proxy editing: generate and retry a lightweight H.264 proxy, monitor progress, switch preview between proxy and original, and keep final MoviePy renders pinned to the original asset.
- P1-05 clip keyframes for position, scale, rotation, crop, opacity, volume, and speed, with linear/hold interpolation, immutable timeline updates, precision-panel controls, and MoviePy render evaluation.
- P1-06 edit elements: add B-roll video, editable caption clips, and rendered title overlays from the desktop inspector, plus per-clip fade, crossfade, and dip-to-black transition controls.
- P1-07 audio mixer with clip keyframe volume, persistent track volume/role, mute/solo-aware output, and optional music ducking under dialogue with a configurable floor.
- P1-08 render contract and golden output coverage for frame order, duration/frame count, captions, audio, active tracks, and original-asset final rendering.
- P1-09 terminal-free Playwright Electron E2E covering project creation, direct editing, markers, undo/redo, proxy preview, and local render; CI runs the flow under Xvfb.
- Focused backend and UI tests for P1-02 persistence, locked-item protection, selection behavior, marker validation, snapping geometry, and multi-clip movement.

### Changed

- Balanced local encodes use ffmpeg `faster` and High uses `medium`, so export iteration is quicker. Compact stays `veryfast`. Final output still reads original assets, never proxies.
- README, Local Studio, and the desktop guide treat Desktop (`/`) as the default workspace. Instagram, TikTok, and YouTube publish are documented as implemented with local env tokens; official OAuth apps stay external.
- Desktop Export asks before retrying an interrupted publish receipt, because the platform may already have the first upload. Receipt retry buttons stay visible when the error text is long.
- Legacy browser pages keep their routes and show a banner that points to Desktop. Production and Bot Check can still run live jobs; the other header pages stay planning or preview. Production no longer crashes when a Desktop Timeline v2 project has no legacy `clips` array.
- `npm run local` and `site --page desktop` open `/` instead of sending operators to `/production`.
- First-run docs tell operators to click Start with the sample instead of opening a second terminal for `npm run sample`.

- Core verification now runs every focused timeline UI test, so P1-01 and P1-02 interaction regressions are included in CI.

## 0.2.3 — 2026-08-25

### Added

- Closing the desktop window now keeps Grok Crew running in the Windows notification area/menu bar. The tray menu provides `Grok Crew 열기`, `숨기기`, and `종료`, and clicking the tray icon restores the workspace.
- The desktop app now enforces a single running instance; launching it again while hidden restores the existing window instead of starting a second sidecar and tray icon.

## 0.2.2 — 2026-08-25

### Fixed

- Local transcript and scene analysis results are now shown inside the source card with scene thumbnails, timecodes, media facts, and an explicit transcript status instead of being reduced to a footer message.
- Local analysis has its own progress state, so completing an analysis reliably restores its button and no longer leaves the global `Start with Grok` action looking busy.
- Analysis thumbnails are served through a project-scoped, path-validated loopback endpoint so the sandboxed desktop renderer can preview them without exposing arbitrary local files.

## 0.2.1 — 2026-08-25

### Added

- Automatic music ducking under dialogue (`music_ducking`, on by default, and `music_duck_floor`): a background music bed now quiets automatically while a clip's own dialogue audio is present instead of mixing in at one flat level.
- `LOCAL_STUDIO_RENDER_WORKERS` (render concurrency) and `LOCAL_STUDIO_ALLOWED_ORIGINS` (the CORS/Origin allow-list, previously hardcoded to port 3000) are now documented `.env` settings; both default to the previous behavior when unset.
- The live browser workspace and bot guide now support Chinese and Japanese, matching the existing README translations. The language switcher (`app/language.tsx`) now offers `zh`/`ja` alongside `ko`/`en`, every page's UI text has zh/ja translations, and `local_studio/bot-guide.zh.json` / `bot-guide.ja.json` are served from `GET /api/bot-guide?lang=zh|ja`.
- `local_studio/handoff-guide.zh.json` and `handoff-guide.ja.json` bring the offline cloud-bot handoff contract up to the same four languages as the rest of this release; every place that references the guide (`bot-contract.json`, all four `README.*.md`, `local_studio/README.md`) now points to all four language files.
- Unit tests for the handoff watcher's per-cycle package limit (`folders_for_cycle`), completing test coverage of all three handoff safeguards (media size cap, bundle size cap, and packages-per-cycle).

### Changed

- All four `README.*.md` files now say "Korean, English, Chinese, and Japanese interfaces" instead of the stale "Korean and English" left over from before the zh/ja UI expansion.
- Removed the "Maintainer launch checklist" section from all four `README.*.md` files — it told readers to "publish a tagged first release" before announcing, but `v0.1.0` and `v0.2.0` were already tagged and released; `docs/LAUNCH.md` remains as the internal checklist.
- Trimmed the Roadmap in all four `README.*.md` files down to the two still-open items; the fourteen already-shipped items are already recorded in this changelog and no longer need to be duplicated as checked roadmap boxes.

### Fixed

- The sandboxed Electron preload now uses CommonJS, as required by Electron's sandbox loader. Desktop-only IPC features such as media import, Runner pairing, relay controls, and output reveal are available again, with a hidden-window smoke test guarding the bridge.
- `config.py` and `handoff_watcher.py` loaded `.env` too late: `LOCAL_STUDIO_WORKSPACE`, `LOCAL_STUDIO_RENDER_WORKERS`, `HANDOFF_MAX_MEDIA_BYTES`, and `HANDOFF_MAX_BUNDLE_BYTES` were read from the environment at import time, before `.env` was applied, so setting them in `local_studio/.env` silently had no effect (only a real process environment variable worked). `.env` now loads before any setting that depends on it.
- Rendering a project with `render_settings.music_track` set closed the music file's reader before `write_videofile()` was done reading from it, so any render with background music crashed. The music file now stays open for the whole render.

## 0.2.0 — 2026-08-24

### Added

- A public-ready README with quick start, workflow, use cases, roadmap, and local workspace preview.
- Contribution guide, issue templates, and maintainer launch checklist.
- Portable project bundle export/import (`GET /api/projects/{id}/export`, `POST /api/projects/import`, `grok_crew.py bundle export|import`, and an Operations Center card) covering a project's EDL, job history, and artifacts. Source/output media is not included.
- Quality, caption-layout, and platform presets via `GET /api/presets`, selectable in Production's Finish Rack. Platform presets add Feed square (1:1) and Landscape/X (16:9) alongside the existing Reels/TikTok/Shorts (9:16) output.
- Caption background panels (`caption_bg`/`caption_bg_color`) and optional per-clip word-level captions (`word_timings`) for sequential word-by-word reveal instead of one static line.
- Background music mixing (`music_track`, `music_volume`, `music_loop`) mixed under the source audio.
- Renders and Instagram publishes now run on a background worker: starting a job returns immediately, `GET /api/jobs/{id}` reports live progress and supports `wait: true` to block until done, and `POST /api/jobs/{id}/cancel` requests cancellation. A job left `running` after an unclean shutdown is reconciled to `failed` on the next start.
- `local_studio/handoff_watcher.py` lets a remote or cloud-hosted bot that cannot reach this PC's loopback address hand off a finished edit through a dedicated git repository instead. It polls the repository, copies media into the local workspace, and applies the package through the existing `/api/projects/import` and job endpoints — no server changes and no open port. See `local_studio/handoff-guide.json` (or `handoff-guide.ko.json`) for the package format handed to that bot.
- Handoff channel safeguards: a media file extension allow-list, a media size cap, a `bundle.json` size cap, and a per-cycle package limit, all documented in both language handoff guides.
- Bundled an OFL-licensed, Korean-capable bold font (`local_studio/assets/fonts/`) so caption burn-in always has CJK glyph coverage regardless of what's installed on the OS; captions are back on by default now that the font gap that motivated turning them off is closed.
- `local_studio/tests/`: a pytest suite covering workspace path validation, job lifecycle, project bundle import/export, bot execution policy, quality checks, the Instagram auto_upload gate, and HTTP status codes, plus `.github/workflows/ci.yml` running it (and `tsc`/`eslint`) on every push and PR.
- A "LIVE" badge in the site header marks the only two pages where a render, publish, or bot check-in actually happens (Production, Bot Check), matching the existing README table.

### Changed

- Bot Guide now maps every workspace page and explains 18 bot-usable production functions.
- Same-PC bot CLI can print URLs for every workspace page.
- Rendering fails fast with a clear error when no local font can be found for captions, instead of silently skipping them.
- `local_studio/studio_server.py` split into `config.py`, `db.py`, `render.py`, `instagram.py`, and `handlers.py`; `studio_server.py` now holds the project/job/bot/artifact domain logic and the process entrypoint.
- `app/production-console.tsx` and `app/forge.tsx` split: the Finish Rack render-settings form and the Export Room view moved into their own files, cutting both source files roughly in half.
- Render presets pick a faster libx264 encoder preset for compact/draft-quality renders.

### Fixed

- Local Studio now requires the configured `LOCAL_STUDIO_TOKEN` on GET requests as well as POST requests (previously only writes were gated), and rejects any request whose browser `Origin` header is outside `http://localhost:3000` / `http://127.0.0.1:3000`, closing a local cross-site request forgery gap that let an open browser tab drive the service.
- `npm run local` no longer fails with `spawn EINVAL` on Windows when starting the browser dev server — spawning a `.cmd` file (`npm.cmd`) now sets `shell: true`, which recent Node.js versions require on Windows.
- Rendered MP4s now write with `-movflags +faststart`, so the metadata needed to play or seek is at the start of the file instead of the end. Without it, a rendered Reel (or a demo video linked from the README) could appear to stop partway through or fail to play at all in a browser or player that streams the file progressively.
- Pre-render quality checks (`quality_report`) now read the EDL's actual `in`/`out` keys instead of `start`/`end`, so a valid project no longer always fails `clip_ranges`/`duration` checks with `0s`/`error`.
- Queuing an Instagram `auto_upload` now requires the requesting bot's `auto_local` execution policy or an explicit human `approved: true`, matching the gate `render` already had. Previously any process on the PC could force an immediate publish regardless of policy.
- `GET /api/jobs/{id}` and `GET /api/projects/{id}` return 404 for a missing resource instead of 200 with an error body; invalid input on a `GET` route (like a malformed `bot_id`) now returns 400 instead of 500.
- Korean (and other non-Latin-script) captions pulled from Cut Log into a new Production project no longer collapse to the placeholder caption "VIDEO" — the word-extraction regex now matches Unicode letters, not just ASCII.
- The local `Authorization` token check uses a constant-time comparison (`hmac.compare_digest`) instead of `==`.

## 0.1.0 — Initial local workspace

- Local project, bot, operations, render, and optional Instagram delivery workflow.
- Korean and English browser workspace and machine-readable bot guide.
