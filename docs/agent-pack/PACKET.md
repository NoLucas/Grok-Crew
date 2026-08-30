# Task packet and handoff

Copy these. Fill every line. Empty allowlist means do not code.

## Task packet

```markdown
## Task packet
- Workstream / owner:
- Base commit:
- User-visible outcome: (one Korean sentence the guest can see)
- Sensor: clipboard | roster | inbox | none
- Letter slice (if any): A | F | H | L | other:
- Allowed paths:
- Forbidden paths:
- Frozen contracts and examples:
- Acceptance criteria:
- Required focused tests:
- Required full checks:
- Manual reproduction steps:
- Expected screenshots or fixtures: (do not commit verification_screenshots/)
- Dependencies / blocked-by PR:
- Guest copy to update: none | README×4 + RELEASE_NOTES + CHANGELOG
```

If Sensor is `none`, stop. Read `CAN_CANNOT.ko.md`.

If a contract is missing:

```text
Contract request
- consumer:
- missing operation or field:
- input validation:
- expected success/error:
- stale/locked:
```

## Handoff

```markdown
## Handoff
- Owner / branch / commit:
- Base commit:
- User-visible result:
- Files changed:
- Contracts changed: none | exact schema/API/IPC list
- Commands and results: (not “passed”)
- Manual steps and evidence:
- Could not verify: (e.g. operator Windows desk)
- Known limitations:
- Follow-up owner:
- Safe rollback:
```

Do not put tokens, local media paths, relay payloads, or decrypted transcripts in the handoff.

## Smallest commands

```powershell
git status --short

node --experimental-strip-types --test --test-concurrency=1 app/<focused>.test.mjs

python -m pytest -q local_studio/tests/test_desktop.py local_studio/tests/test_accept_drop.py

npm run verify:core
python -m pytest -q local_studio/tests
npm run verify:desktop
```

Do not probe the operator’s `127.0.0.1:7214` from Linux or cloud.
