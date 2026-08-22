# NOH Reel Forge local bot gateway

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add an xAI key to `XAI_API_KEY` if you want Grok edit planning. Leave it blank to use the local validator only.
4. Start with `npm run dev` and open `http://localhost:3000/connect`.

## Bot contract

The local gateway gives a bot four endpoints:

- `GET /api/health` — readiness with no secrets.
- `GET /api/capabilities` — machine-readable allowed actions and safety boundaries.
- `POST /api/reel-jobs/validate` — Gate A/B/C validation for a supplied manifest.
- `POST /api/reel-jobs/plan` — uses the local xAI key to return an edit plan.

The Connect page creates a manifest from the saved Studio, Agent Desk, Edit Lab, and caption packet. The gateway deliberately does not publish to Instagram, share media, or expose an API key.

## Keep it local

`localhost` is accessible to processes on this computer. A Grok bot running elsewhere cannot reach it without a secure tunnel or reverse proxy. Do not make the server public by default. If you later expose it, set `REEL_FORGE_LOCAL_TOKEN` and require its bearer token on planning requests.
