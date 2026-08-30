---
name: idea-to-code
description: >-
  Use this whenever an idea needs to become working software. It is not tied
  to one product, one repo, or one spoken language. Covers the product line,
  what is out of scope, what the program can actually observe, letter slices,
  one contract, a task packet, problem-finding, security, user-facing copy,
  and handoff. Also use it for “make this idea real,” “same habit on a
  different product,” “why is the UI pretending it knows,” or “what we can
  fix versus what we cannot.”
---

# How to turn an idea into code

This is not a memory of one product. It is **one page that keeps the same working habit** when another chat or another model picks up any idea. You only need this file.

The user does not have to start with file paths. They describe the product in whatever language they already use. You choose the stack.

## Language

Do not lock this habit to Korean, English, or any other language.

- Work in the language the user writes. If they mix languages, follow the language of the request in front of you.
- Product lock, UI copy, errors, empty states, and guest docs use that same language.
- This skill is written in current everyday English so any model can read it. That is a carrier language, not a product rule.
- Do not invent a house dialect. Do not require the user to switch languages to work with you.

## When to use this

- A new idea, product, screen, or connection: “make this work”
- Lots of features, but no one-line product yet
- The UI is acting like it knows something the program cannot see
- You need the same implementation habit in another repo or another chat

Skip it for a typo or a one-line fix that is already locked.

## Do not

- Build a platform before one user loop works
- Let the screen claim knowledge the system cannot observe
- Create a second contract for the same job (fake fields, a side API, localStorage pretending to be the server)
- Ship several user-facing outcomes in one PR, or reformat files you did not need to touch
- Commit secrets, installers, generated media, or verification screenshots
- Bring back a deleted draft under a new name
- Say “it passed” without the command and the numbers
- Pretend you bypassed a limit that the program cannot actually cross

---

## 1. Lock it in one line

Do not open code until both of these exist.

```text
Product: (who) (where) (using what they already have) (where the result lands).
Account: yes / no.
Money: free now / paid / later.
Out of scope:
- …
```

If someone asks for a feature that breaks that line, do not build it. Write **that is not this idea** and return to the loop.

Keep user-facing verbs short and concrete: get, open, attach, write, save. No lorem. No “Welcome to your app.” No “we make it for you.”

## 2. Finish one loop

Write the path a person walks in **six steps or fewer**. Implement only that path.

```text
1.
2.
3.
4.
5.
6. (leave blank if unused)
```

Check:

- You did not open a new tab, subscription, or API outside this loop
- If a step fails, that same step says how to fix it. It does not send the person to another step first
- The window is not pretending to know what it cannot see

Do not start a roadmap, a store listing, code signing, or a second product before this loop works.

If a pattern works, use it on every screen. Do not delete unused features; fold them away. Each step has **one job now**. Everything else is a chip.

## 3. Sensors — what the system actually knows

Write this before you accept the idea. **A sensor is only an input this program can observe.**

```text
Sensors:
- (examples: clipboard, local roster, folder count, HTTP response, database row)
Unknown:
- (examples: another app’s chat, localhost on another computer, whether a person spoke)
```

Rules:

- Do not draw a lamp, badge, or percent for something that is not a sensor
- If you have three sensors, split a big complaint by sensor
- If the sensor list is **none**, this is not an implementation job. It is an “cannot fix” item in section 4

When you move to another product, refill this block. Keep the habit.

## 4. What you can fix / what you cannot

| Fix it | Do not pretend to fix it |
|---|---|
| A value this program already reads | Words in another app’s window; loopback on another machine |
| Files and APIs this program already writes | Remote-delete of a scheduled job in someone else’s account |
| A confirm the person can choose once more | Certificates, payments, and store review — stamps outside the code |
| Honest empty, error, and leftover states | Magic (“just run it,” “paste it for them”) |

One-line test: **fix what this program already sees.** You cannot stand in for **what another window says, an address on another computer, or whether someone else ran a script.**

Faking a fix usually opens a worse hole. Example: if the desk steals an invite, the seat never gets the job.

## 5. Split by letter

Do not treat a large complaint as one bug. One letter, one sensor.

```text
A: (symptom) → sensor: → the person sees:
B: …
```

Prefer one letter per commit or PR. If you ship several letters together, keep a test per letter.

Names like A+F+H+L belong to one past product. A new idea gets new letters.

## 6. One contract

A new field on screen is not a license to invent a local fake, a second API, or a storage workaround that mimics the server.

Look for the existing field or route first. If it is missing, stop here.

```text
Contract request
- consumer: (screen or caller)
- missing: (field / action / validation)
- input validation:
- success / error:
- stale / locked:
```

Schema, migrations, permission boundaries, and packaging belong to the **contract owner**. A UI slice does not lock those first.

## 7. No packet, no code

Do not guess empty fields. Do not invent defaults for data loss, security, publishing, or migrations.

```markdown
## Task packet
- Workstream / owner:
- Base commit:
- User-visible outcome: (one sentence a person can see)
- Sensor: (list) | none
- Letter slice:
- Allowed paths:
- Forbidden paths:
- Frozen contracts and examples:
- Acceptance criteria:
- Required focused tests:
- Required full checks:
- Manual reproduction steps:
- Evidence: (do not commit screenshots)
- Guest copy to update: none | list
```

If `Allowed paths` is empty, or the change fights an existing contract, do not start.

Do not edit outside the allowlist. Do not commit straight to `main`. Do not push secrets to a remote by default.

## 8. Implementation loop

```
Read the request in the user’s language
  → one line + out of scope
  → one loop
  → sensors / cannot-fix
  → one letter
  → packet
  → a small test that fails
  → the smallest code change
  → security check
  → if a person will see it, update guest copy to the same version
  → handoff
```

While you work:

1. Before you start, check that the tree is clean and the base SHA is right
2. Pin a test that reproduces the failure first
3. One user-facing outcome per PR
4. Keep types and error codes in one place. Do not copy them into the UI
5. Treat loading, empty, error, leftover, locked, and cancelled the same way you treat the happy path
6. Fold unused features. Do not “clean up” in a way that breaks the path a person walks
7. Write on-screen copy in the language the user is using

## 9. How to find the real problem

If someone says “it doesn’t work,” do not swallow that as one bug. Split **what the window knows** from **what the person saw**.

These get mixed up a lot:

| What the person saw | What the window knows | The wrong fix |
|---|---|---|
| Another app said it succeeded | Nothing | Turn the lamp on |
| They copied text | Copied | Treat copy as connected |
| Yesterday’s leftover | Old state still sitting there | Close it as today’s job |
| The file is in another slot | This is not its home | Invent a second home |

Pin reproduction with **state-function tests**, not a guessed UI. Name the test in the person’s words.

Do not put tokens, absolute personal paths, decrypted bodies, or private media in logs or handoffs.

If this environment is not the person’s machine, write down the path you could not click. One screenshot is not verification. Walk the path they would walk.

## 10. Security

Close a hole before you open a new tab.

Every time:

- Pairing codes and other secrets use a cryptographic API. No `Math.random`
- Failure text does not print the secret again
- No tokens or internal addresses in chat, URLs, or QR codes
- User input cannot jump into the work folder, a private network, or `file://`
- Do not give the renderer Node privileges or credentials
- Do not turn on upload, send, or pay unless someone asked
- Do not commit `.env` files, keys, databases, installers, generated video, or verification captures

If a feature has to cross a boundary the program cannot cross, the feature is wrong.

Do not talk as if code-signing certificates, store review, or someone else’s payments are done. Those are outside the code.

## 11. Only four kinds of writing

| Kind | Whose voice | Examples |
|---|---|---|
| Lock | The person fixing it | Product line, out of scope, one loop |
| Guest copy | Understood in about 30 seconds | README, release notes |
| Machine-readable copy | A bot or another agent | Paste-in instructions. No tokens |
| Collaboration | Agents | Packet, handoff, this skill |

Do not add a fifth pile (scraps, draft copies, wiki dumps). Do not mix guest sentences and the lock in one file.

If people read the product in more than one language, keep the same bones in each. Version numbers, download links, and clone URLs must point at the same product.

Do not revive a deleted path. Edit the live file that still does that job.

## 12. Verify

While you build: the smallest focused test.

Before you hand off: the repo’s core check, one command. If there is none, write the tests you added and the path a person would walk.

If you opened a privilege boundary (main process, preload, sandbox, payments), run that check on its own.

Release candidate: audit, install, update, quit. Real external login or a live publish only with the user’s OK and a test account.

## 13. Handoff

```markdown
## Handoff
- Owner / branch / commit:
- Base commit:
- User-visible result:
- Files changed:
- Contracts changed: none | list
- Commands and results: (command, pass/fail counts, OS)
- Could not verify:
- Known limitations:
- Follow-up owner:
- Safe rollback:
```

## 14. Decision log

An agent does not flip a lock because it “feels more natural.” Change it only when the user locks a new one-liner.

```text
Date:
One-liner:
Out of scope:
Sensors:
Cannot fix:
```

If several agents are in play, one implementer per PR. Do not open the same folder at the same time. Merge, tags, and secrets follow the repo owner’s defaults. Tag in this session only when the owner asks.

---

## You may call it done when

| Face | Must be true |
|---|---|
| Product | One line and a clear out-of-scope list |
| Screen | One loop. Same write path everywhere |
| Sensors | Lamps match what the window actually knows |
| Docs | Guest copy describes the same product as the screen |
| Secrets | None in the commit |
| Limits | What you cannot fix is written down honestly |

Write the next slice (a feature that needs a contract, paid work, a stamp) on paper. Do not put it in this slice.
