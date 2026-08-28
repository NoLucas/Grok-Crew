# Grok Crew

<p align="center">
  <img src="public/hero.png" alt="Grok Crew with Grok Bot — local video desk" width="100%" />
</p>

**v1.0.2** · with Grok Bot · free now

You do not have to stay up cutting Shorts by hand.
Attach the **Grok Bot** or Agent they already use. The finished file lands in **their folder on this PC**.
No account. No card. No per-cut credits. Download it and open it.

[Get Windows](https://github.com/NoLucas/Grok-Crew/releases/tag/v1.0.1) · [한국어](README.ko.md) · [中文](README.zh.md) · [日本語](README.ja.md)

---

## Who this is for

- **People tired of cutting Shorts alone.** They write what they want, paste it into the bot window, and save here. They do not have to build a timeline from zero.
- **Free on this track.** There is no sign-in. It is not a subscription. There are no credits per cut.
- **The file stays on this PC.** This is not a cloud editor.

This window is not a “we generate the video” subscription. It is a program that attaches a bot they already use.

---

## Built-in skills for bots and agents

On connect, the seat already gets its skill. They do not have to write a planner, scraper, or editor prompt from scratch.

| Seat | Base skill | Extra skill that ships with it |
|---|---|---|
| **Grok Bot / Agent planner** | `planner` — turn today’s line into a cut plan | `edit-plan` — a short plan the other two seats can read |
| **Grok Bot / Agent scraper** | `scraper` — pick public pages only | `public-pick` — do not name login-walled social apps |
| **Grok Bot / Agent editor** | `editor` — cut to the plan | `cut-to-plan` — keep scene order and the named market’s pace |

The source files live in [`public/bot-skills/`](public/bot-skills/). Copying the attach text takes that seat’s skills with it. This program does not scrape.

---

## How you use it

1. Install from **Get Windows** and open it. There is no sign-in. Get the file from the GitHub Release.
2. On **Connect**, copy the attach text into the bot window. Grok Bot should check in from the registered Windows after approval. If that does not land, paste the bot `GROK_CREW_OK` line here. Copying alone does not connect.
3. On **Auto**, write what they want and press **Make**.
4. A person pastes into the bot window. This window waits.
5. When the preview appears, **save on this PC**. Posting is later, and only if they want it.

If attach fails, **Connect** says how to fix it. Do not open Auto first.

---

## What changed in v1.0.2

- First open still asks which TTS this PC should keep. That window now fills the desk instead of sitting in a crushed sidebar. Next with no pick is Kokoro-82M. The installer stays one-click.

The full list is in [CHANGELOG.md](CHANGELOG.md) and [the 1.0.2 notes](docs/RELEASE_NOTES.v1.0.2.md).

## What changed in v1.0.1

- First open asks which TTS this PC should keep. Next with no pick is Kokoro-82M. The installer stays one-click.
- Connect lamps are only **Connected** (green) and **Not connected** (gray). Copying the connect text does not turn the lamp green.
- Quit warns first. Confirming disconnects Grok Bot and Agent. Closing the window only hides to the tray.

The 1.0.1 list is in [the 1.0.1 notes](docs/RELEASE_NOTES.v1.0.1.md).

## What changed in v1.0.0

Older Grok-Crew (0.2.1) was closer to a browser workspace. 1.0.0 is **a window on this PC**.

- Connect, Auto, Setup, Edit, and Export share one writing style: one job, then chips.
- **Grok Bot** and **Agent** attach as planner, scraper, and editor. Built-in skills go with the seat.
- Connect only copies attach text. They do not paste a reply back here. The bot never sees `127.0.0.1`.
- Captions, dubbing, and TTS stay off until they turn them on. First open does not block on a voice picker.
- Finished files stay on this PC. A GitHub inbox is optional.
- Pair codes use cryptographic randomness. GitHub token errors do not echo the token.

The 1.0.0 list is in [CHANGELOG.md](CHANGELOG.md) and [the 1.0.0 notes](docs/RELEASE_NOTES.v1.0.md).

---

## What’s on the screen

Each tab is **one job**. Extra tools stay behind chips until they ask.

| Tab | What it does |
|---|---|
| **Connect** | Attach or remove a bot. Same-PC use, other windows, and open-a-file-without-a-bot stay folded. |
| **Auto** | One prompt. Chips: picture / where it goes / sound. After Make: wait → preview → save. |
| **Setup** | Shape, length, sound, pace. The button here is **Save setup only**. |
| **Edit** | Timeline and preview first. Inbox files and proxy stay folded. |
| **Export** | Save on this PC first. Post, swap, and history are chips. |
| **Advanced spec** | Title and goal. Style, source, collect, and files are chips. Send/receive opens only after they save. |

**Version history** in the sidebar and GitHub / maker in the inspector stay folded until they open them.

---

## What this is not

- A cloud editor or a site that cuts in the browser
- A “we generate the video” subscription
- Auto-post to Instagram or TikTok
- Scraping a logged-in social account
- Showing `127.0.0.1` to the bot

---

## What’s under the window

Guests can ignore this. Open the installer and use the desk.

| Job | What we use |
|---|---|
| Window | Electron — a program on this PC. |
| Desk | React and TypeScript — Connect, Auto, Setup, Edit, Export. |
| Cut | A Python sidecar on this PC (Local Studio). It talks to this window only. |
| Store | SQLite on this PC. No account server. |
| Encode | ffmpeg and MoviePy, on this PC, when they save. |
| Captions | whisper.cpp, only if they turn captions on. |
| Voice | One chosen TTS engine, only if they turn TTS on. |
| Bot skills | Markdown in `public/bot-skills/`, pasted on connect. |

Voice models are not in the installer. They download only after the guest turns that tool on.

---

## Open this repo

Public source: [NoLucas/Grok-Crew](https://github.com/NoLucas/Grok-Crew)

```bash
git clone https://github.com/NoLucas/Grok-Crew.git
cd Grok-Crew
npm install
npm run local
```

The guest window is `npm run desktop`. To look at the desk in a browser, run `npm run dev` and open the address it prints.

Full install notes: [docs/BUILD.ko.md](docs/BUILD.ko.md).

---

## License

[BUSL-1.1](LICENSE). To change the code, read [CONTRIBUTING.md](CONTRIBUTING.md).
