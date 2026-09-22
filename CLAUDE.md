# CLAUDE.md — Project JEDI: TypeScript + Cloudflare

This file is deliberately **thin**. It tells you where to look and what you must
never skip. Detail lives in `wiki/`. Do not copy wiki content back into here.

## 1. What this project is

A **Project JEDI course build**: one self-chosen application, built incrementally
across six clusters (A–F), using ~5 Cloudflare building blocks, with a **contested
write** at its heart. Assessed by a 15-minute demo.

It is **not** a rebuild of EdgeLedger. See §4.

Stack is fixed by the course: TypeScript · React · **Next.js App Router** ·
Tailwind · zod · Cloudflare Workers. Free tier is sufficient throughout.

## 2. Read before you act

Start with `wiki/README.md`, then load only the pages your task touches.

| You need to know… | Read |
|---|---|
| What the course demands, acceptance criteria | `wiki/requirements/` |
| Rules that apply to every task | `wiki/requirements/cross-cutting-rules.md` |
| Which Cloudflare API, how it works | `wiki/techstack/` |
| Our domain model, architecture, vocabulary | `wiki/context/` |
| How to write and secure the code | `wiki/guidelines/` |
| How to work with the human on this | `wiki/guidelines/ai-collaboration.md` |
| What is queued, in flight, or blocked | `wiki/todos/` |
| Why a past choice was made | `wiki/decisions/` |

## 3. Non-negotiable: the paper trail

Two files are the project's memory. **Neither may fall behind the code.**

- **`wiki/CHANGELOG.md`** — append an entry for every change to code or wiki, in
  the same turn you make it.
- **`wiki/AI-AUDIT.md`** — append an entry for every AI task, including tasks
  that produced no code (research, analysis, a rejected approach).
- **`wiki/decisions/`** — any choice that closed off an alternative gets an ADR.

This is not bookkeeping. `REQ-M.4` requires every decision to be **explainable in
your own words** at the demo, and `REQ-X.2` requires written notes on what
surprised you and what you'd do differently. Both are built from these files. A
decision that lives only in a chat transcript is a lost decision.

If unsure whether something counts: log it.

## 4. ⛔ EdgeLedger is sealed until the end

`../typescript-cloudflare-project/` — a **sibling directory, outside this repo** —
is the finished reference build. The course:

> *"Never build inside it. **Do not copy from it at this stage** — it is for
> comparison later."*

`REQ-X.6` — a written comparison between our build and theirs — is a deliverable,
and it only exists if the two were reached independently.

- **Never** read it for patterns, "just to check how they did X", or at all.
- **Never** load `wiki/reference-edgeledger/` into context.
- If you're curious how it solved something: note the question, move on.

Full rule: `wiki/context/reference-project.md`.
Rationale: `wiki/decisions/0003-edgeledger-is-comparison-not-template.md`.

## 5. Definition of done

A task is not done until:

1. The code change is complete and type-checks (`tsc --noEmit` passes).
2. `wiki/CHANGELOG.md` has an entry.
3. `wiki/AI-AUDIT.md` has an entry.
4. Any decision made along the way has an ADR.
5. Any wiki page the change invalidates is updated in the same turn.
6. `wiki/todos/backlog.md` reflects reality.
7. The relevant `REQ-*` status is updated in `wiki/requirements/`.

State explicitly which of these you did. If you skipped one, say so and why.

## 6. Working rules

- **⛔ Never change anything on GitHub.** No repo creation or deletion, no
  settings, no remotes, no pushes, no PRs, no issues, no releases, no `gh`
  commands, no authenticated API calls. Raffaele owns the account and manages it
  himself. If a task appears to need one of these, **stop and ask him.**
  Permitted: local `git` in the working tree (status, diff, log, add, commit),
  and `clone`/`fetch`/`pull` on a repository URL **he has given you**.
  **Commit only when he asks; never push.**
- **One capability per step** (`REQ-M.2`). Clusters run in order. Never
  parallelise them, never jump ahead.
- **Every file you write must be reviewable** (`REQ-M.3`). Explain before
  writing. No large generated trees. Flag every decision, including small ones.
  See `wiki/guidelines/ai-collaboration.md`.
- **Every mutation emits an `[AUDIT]` line** (`REQ-M.5`) — from the first
  mutation, not once Cluster F is reached.
- **AI and secondary Workers never block the primary write path** (`REQ-M.7`).
- **Worker-to-worker calls use service bindings, never public HTTP** (`REQ-M.8`).
- **No `any`, no unchecked casts.** `wiki/guidelines/coding-standards.md`.
- **Secrets only via `wrangler secret put`.** Never in a file, a log, or a commit.
- **Do not invent requirements.** If the course did not ask for it, file it in
  `wiki/todos/backlog.md` instead of building it.
- **Version drift is real.** Next 16, React 19, TypeScript 6 postdate reliable
  training data. Verify APIs against `node_modules` or official docs — do not
  write them from memory.

## 7. Entry formats

Append-only, newest last.

`wiki/CHANGELOG.md`:

```markdown
## 2026-09-22 — <short title>
- **Type:** added | changed | fixed | removed | docs
- **Scope:** <paths or subsystem touched>
- **What:** <one or two sentences, concrete>
- **Why:** <requirement id, bug, review comment>
- **Decision:** <ADR link, or "none">
```

`wiki/AI-AUDIT.md`:

```markdown
## 2026-09-22T14:30Z — <task title>
- **Agent:** <model / tool>
- **Prompt intent:** <what was asked, in the user's terms>
- **Inputs read:** <wiki pages, source files, external docs>
- **Actions:** <what was created/changed/run>
- **Alternatives considered:** <options weighed and why rejected>
- **Assumptions:** <anything filled in without being told>
- **Verification:** <what was actually run/checked, and the result>
- **Open questions:** <what a human still needs to confirm>
```

ADRs: copy `wiki/decisions/adr-template.md` to `NNNN-<slug>.md`.
