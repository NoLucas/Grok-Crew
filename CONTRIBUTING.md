# Contributing to Grok Crew

Thanks for helping make local bot-assisted video editing more useful.

## Before you start

1. Read the current [README](README.md) and [Bot Guide](local_studio/bot-guide.json).
2. Search existing issues before opening a new one.
3. Keep every test file, project record, and rendered asset inside `local_studio/workspace/`.
4. Never commit `.env` files, access tokens, private media, SQLite databases, or generated renders.

## Report a bug

Please include:

- What you expected and what happened instead
- Your operating system, Node.js version, and Python version
- The smallest safe set of steps that reproduces the problem
- The local job error or Bot Check activity, with secrets removed

## Propose a feature

Describe the editing problem first, then the smallest workflow that solves it. Good proposals name the target user, the expected local result, and how the feature fits the bot guide or CLI contract.

## Pull requests

- Keep one clear change per pull request.
- Update the Korean and English bot guide together when bot behavior changes.
- Add or update documentation for user-visible behavior.
- Run `npm run build` and Python syntax validation before requesting review.
- Do not add a cloud dependency, remote bot service, or credential collection without an explicit design discussion.

## Code of conduct

Be concise, constructive, and respectful. Focus feedback on the workflow and the implementation, never the contributor.
