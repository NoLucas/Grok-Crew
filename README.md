# Grok Crew

<p align="center"><strong>English</strong> &nbsp;·&nbsp; <a href="README.ko.md">한국어</a> &nbsp;·&nbsp; <a href="README.zh.md">简体中文</a> &nbsp;·&nbsp; <a href="README.ja.md">日本語</a></p>

**[Open on Windows](https://github.com/NoLucas/Grok-crew-test/releases/latest)** — get [`GrokCrew-Windows.exe`](https://github.com/NoLucas/Grok-crew-test/releases/latest) and double-click. There is no public site. `docs/HOMEPAGE.ko.md`.

Five steps. Receive → open → connect → write in Auto → paste.

1. **Receive** — one file, `GrokCrew-Windows.exe`.
2. **Open** — double-click. If the blue shield appears, More info → Run anyway.
3. **Connect** — open **Connect**. Other-PC seats sit in two groups: Grok Bot and Agent. Copy the connect text on planner, scraper, or editor and it is attached. Paste that text in the bot window.
4. **Write** — today’s line in the **Auto** tab.
5. **Paste** — Start copies the job. Paste it in that bot window. When the cut arrives, the preview stays on this tab and asks you to save.

To cut your own file, use **Start with my file** inside Auto. There is no login.

It is not a website that holds your footage. The bot never opens this PC. It only pushes a package.

```
receive the exe  →  open it  →  connect  →  write in Auto  →  paste the job  →  preview and save on this PC
```

## Who it is for

- People who want to specify the Reel, not hunt for the raw file on this machine
- Creators who let the connected bots do the sourcing and the first cut — on separate doors, never mixed
- Anyone who still wants the finished file to land on this PC, not in a cloud editor

It is free for now. You do not need an account to start. It does not ask for a card or a subscription.

## What you see

The first screen is **Connect**. Other-PC links stay at the top. Same-PC, Local Studio, GitHub, and the Grok builder live there too. A green light means **Connected**. After a bot is attached or you open a file yourself, **Auto** is the landing tab. Setup, Edit, and Export turn on then. **Auto** is today’s line, what kind of video, the materials (your videos or images, or what a scrape bot should fetch), and one Start. This desk does not scrape. Hand-it-off and start-with-my-file are two modes inside Auto. Connection controls stay in Connect only. The sample opens only from **See it with the sample**. After a copy, five lights show connect, sent, working, cut, and save on this PC, plus elapsed time and not yet / arrived / failed. This window does not claim the bot read the invite. The save card names the folder on this PC and says Auto did not post. Python, ports, and folder paths stay folded. **More detail** and **Advanced tools** grow only after the first cut arrives. Incoming cuts on the editor door open on their own and stay previewed in Auto. Files the bot saved — the package under `inputs/handoff/` and clips in the materials box — stay in one collapsed row. Open it and the list sits beside the preview. Right-click a file to preview, enlarge, show the original, or delete it. Quality stays locked to the spec; aspect, captions, and the other edit knobs stay yours. Setup can assign Shorts, Reels, TikTok, Custom, or another style, and save the current knobs as a named preset separately. Projects can live in folders, and trash keeps a restore window of 30 days. Bright day, deep night, soft day, soft night, and type live in the gear at the top-left corner. A person may specify which tools the bot should use; the bot should run them. That hub follows the desk theme and keeps the bot catalog folded. This desk does not scrape websites.

Then you work in five tabs:

| Tab | What it is for |
| --- | --- |
| **Connect** | Other PC (Grok Bot / Agent × planner, scraper, editor), this PC, Local Studio, GitHub, Grok builder |
| **Auto** | Today’s line → send → wait → preview → save |
| **Edit** | Watch the preview, cut on the timeline |
| **Setup** | Look, captions, speed |
| **Export** | Save an MP4 here, or post after it asks |

The preview is a fast draft. The file you save is made from the footage the bot sent. Opening a file already on this computer is optional and tucked under the brief.

## Your video stays on this computer

Raw clips, the edit, and the finished file live on this PC. There is no Grok Crew cloud project and no login wall.

Posting is optional. The default is **Ask before posting**. If a post may have already gone out, it asks again before sending a second copy. Grok Crew does not create your Instagram, TikTok, or YouTube account.

## Optional: ask AI on this PC

If an AI helper is already running on **this same computer**, you can say in plain language: keep the strongest lines, add captions, make a vertical cut, save the file here, do not upload.

A helper on another computer cannot open this desk. **Connect** attaches it by name only. The finished cut is dropped on this window. Footage is not sent out so a bot elsewhere can “just take a look.”

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
