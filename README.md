# NOH Reel Forge offline handoff desk

## Run locally

1. Install dependencies with `npm install`.
2. Start with `npm run dev` and open `http://localhost:3000/connect`.
3. Editing, gate checks, bot-return notes, and JSON handoffs remain in browser storage on this device.

## Manual Grok handoff

The Local Desk creates one offline JSON handoff from the saved Studio, Agent Desk, Edit Lab, and caption packet:

- Copy or download the JSON brief.
- Paste it into a Grok conversation only when you decide to do so.
- Copy Grok's returned plan and paste it into the Local Desk for local review.

No key, API route, provider call, or automatic data transfer is included. The Local Desk deliberately does not publish to Instagram, share media, or expose an API key.

## Keep it local

`localhost` is your own local workspace. A Grok bot running elsewhere cannot reach it—and this version intentionally does not provide a tunnel, network endpoint, or background connection.
