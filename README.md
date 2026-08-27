# Grok Crew

A program on the guest’s PC. Attach a bot they already use. The finished file lands in **their folder**.

Opens with no account. Not a website subscription.

[Get Windows](https://github.com/NoLucas/Grok-crew-test/releases) · [한국어](README.ko.md) · [中文](README.zh.md) · [日本語](README.ja.md)

---

## How you use it

1. Install from **Get Windows** and open it. There is no sign-in.
2. On **Connect**, attach the bot they already use. Copy the attach text into the bot window.
3. On **Auto**, write what they want and press **Make**.
4. A person pastes into the bot window. This window waits.
5. When the preview appears, **save on this PC**. Posting is later, and only if they want it.

If attach fails, **Connect** says how to fix it. Do not open Auto first.

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

Captions, dubbing, and TTS run only when the guest turns them on. All three start off.

**Version history** in the sidebar and GitHub / maker in the inspector stay folded until they open them.

---

## What changed

- Every tab uses the same writing style: one job, then chips. Features stayed. Unused panels stay closed.
- **Connect** only copies attach text. They do not paste a reply back into this window.
- Finished files stay **on this PC**. Posting is after save, and only if they ask.
- Git handoff is only a **guest-owned private repo** they turn on. There is no company inbox. The program works without it.

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

For people who build or change the code:

| Job | What we use |
|---|---|
| Window | Electron — a program on this PC. |
| Desk | React and TypeScript — Connect, Auto, Setup, Edit, Export. |
| Cut | A Python sidecar on this PC (Local Studio). It talks to this window only. It does not upload the cut. |
| Store | SQLite on this PC. No account server. |
| Encode | ffmpeg and MoviePy, on this PC, when they save. |
| Captions | whisper.cpp, only if they turn captions on. |
| Voice | One chosen TTS engine, only if they turn TTS on. |
| Other-PC bots | This window and a folder on this PC by default. Git only if they set their own private remote. |

Voice models are not in the installer. They download only after the guest turns that tool on.

---

## Open this repo

Public source: [NoLucas/Grok-crew-test](https://github.com/NoLucas/Grok-crew-test)

```bash
git clone https://github.com/NoLucas/Grok-crew-test.git
cd Grok-crew-test
npm install
npm run local
```

The guest window is `npm run desktop`. To look at the desk in a browser, run `npm run dev` and open the address it prints.

Full install notes: [docs/BUILD.ko.md](docs/BUILD.ko.md).

---

## License

[BUSL-1.1](LICENSE). To change the code, read [CONTRIBUTING.md](CONTRIBUTING.md).
