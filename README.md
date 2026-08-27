# Grok Crew

<p align="center"><strong>English</strong> &nbsp;·&nbsp; <a href="README.ko.md">한국어</a> &nbsp;·&nbsp; <a href="README.zh.md">简体中文</a> &nbsp;·&nbsp; <a href="README.ja.md">日本語</a></p>

**[Open on Windows](https://github.com/NoLucas/Grok-crew-test/releases/latest)** — get [`GrokCrew-Windows.exe`](https://github.com/NoLucas/Grok-crew-test/releases/latest) and double-click.

Five steps. Receive → open → connect → write → paste.

1. **Receive** — one file, `GrokCrew-Windows.exe`.
2. **Open** — double-click. If the blue shield appears, More info → Run anyway.
3. **Connect** — open **Bots**. Same-PC bots paste the check-in line. Other-PC bots (Grok, or an agent you made) paste the connect line, then you paste their one-line `GROK_CREW_OK` reply. The name means it is connected.
4. **Write** — a title.
5. **Paste** — the job into that bot window. This window opens when the cut arrives.

To cut your own file, drop it in the second card. There is no login.

It is not a website that holds your footage. The bot never opens this PC. It only pushes a package.

```
receive the exe  →  open it  →  connect  →  write a title  →  paste the job  →  this window opens when the cut arrives
```

## Who it is for

- People who want to specify the Reel, not hunt for the raw file on this machine
- Creators who let the connected bots do the sourcing and the first cut — on separate doors, never mixed
- Anyone who still wants the finished file to land on this PC, not in a cloud editor

You do not need an account to start.

## What you see

The first screen is the **Bots** room. Same-PC and other-PC connections all happen there. Setup, Edit, and Export stay off until a bot is attached or you open a file yourself. Then the short desk: **Hand it off** is title → copy → wait. **Open it myself** is drop a video → edit now. The two paths stay in two cards. The sample opens only from **See it with the sample**. After a copy, the desk says the bot is working, when it last checked, and not yet / arrived / failed. Python, ports, and folder paths stay folded. **More detail** and **Advanced tools** grow only after the first cut arrives. Incoming cuts on the editor door open on their own. Files the bot saved — the package under `inputs/handoff/` and clips in the materials box — stay in one collapsed row. Open it and the list sits beside the preview. Right-click a file to preview, enlarge, show the original, or delete it. Quality stays locked to the spec; aspect, captions, and the other edit knobs stay yours. Setup can assign Shorts, Reels, TikTok, Custom, or another style, and save the current knobs as a named preset separately. Projects can live in folders, and trash keeps a restore window of 30 days. Bright day, deep night, soft day, soft night, and type live in the gear at the top-left corner. A person may specify which tools the bot should use; the bot should run them. That hub follows the desk theme and keeps the bot catalog folded. This desk does not scrape websites.

Then you work in four tabs:

| Tab | What it is for |
| --- | --- |
| **Bots** | Connection status, same-PC check-in, other-PC codes |
| **Edit** | Watch the preview, cut on the timeline |
| **Setup** | Look, captions, speed |
| **Export** | Save an MP4 here, or post after it asks |

The preview is a fast draft. The file you save is made from the footage the bot sent. Opening a file already on this computer is optional and tucked under the brief.

## Your video stays on this computer

Raw clips, the edit, and the finished file live on this PC. There is no Grok Crew cloud project and no login wall.

Posting is optional. The default is **Ask before posting**. If a post may have already gone out, it asks again before sending a second copy. Grok Crew does not create your Instagram, TikTok, or YouTube account.

## Optional: ask AI on this PC

If an AI helper is already running on **this same computer**, you can say in plain language: keep the strongest lines, add captions, make a vertical cut, save the file here, do not upload.

A helper on another computer cannot open this desk. **Bots** attaches it by name only. The finished cut is dropped on this window. Footage is not sent out so a bot elsewhere can “just take a look.”

## How to open it

**Open on Windows** — get `GrokCrew-Windows.exe` from the [latest release](https://github.com/NoLucas/Grok-crew-test/releases/latest) and double-click it. It installs for this account only. It does not ask for an administrator password.

If Windows says it protected your PC: **More info → Run anyway**.

If someone already set it up, open the Grok Crew window, or a browser at [http://localhost:3000](http://localhost:3000/).

If you are building from source you need [Node.js 22+](https://nodejs.org/) and [Python 3.10+](https://www.python.org/downloads/):

```sh
git clone https://github.com/NoLucas/Grok-Crew.git grok-crew
cd grok-crew
npm run local
```

A desktop window from source: `npm install` once, then `npm run desktop`. The first start can take a few minutes. Stop with `Ctrl+C`.

You may use it on this computer to make and publish your own videos. The source is shared under [BUSL-1.1](LICENSE); it is not an open-source product. Questions: [CONTRIBUTING.md](CONTRIBUTING.md).
