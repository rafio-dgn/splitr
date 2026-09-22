# ADR-0001: Wiki as the knowledge base, `CLAUDE.md` as a thin router

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Raffaele Di Gennaro
- **Requirement:** n/a (process decision)

## Context

`CLAUDE.md` is loaded into context on every session. Projects of this size
accumulate requirements, stack notes, conventions, domain vocabulary and a
decision history. Putting all of that in `CLAUDE.md` produces a single file that
grows without bound — Raffaele's words: "we do not want to store everything there
like a linked list". Every session then pays for the whole corpus regardless of
what the task needs, and nothing can be found by a human either.

A second, harder problem: decisions made during AI-assisted work normally live
only in the chat transcript. When the transcript is gone, the reasoning is gone,
and the next agent re-litigates a settled question or silently contradicts it.

## Options considered

### Option A — Everything in `CLAUDE.md`
- Pros: nothing to navigate; guaranteed to be loaded.
- Cons: unbounded context cost; unreadable for humans; no way to load selectively;
  merge conflicts on every change; no natural home for a decision history.

### Option B — Folder-per-topic wiki, thin `CLAUDE.md` router
- Pros: agents load only what the task needs; humans can navigate it; each topic
  has an owner file; decisions get a first-class home; diffs stay small.
- Cons: an agent can read the router and skip the wiki. Requires the router to
  make loading mandatory, and requires discipline to keep pages current.

### Option C — Wiki with no changelog/audit, relying on git history
- Pros: no duplication; git already records what changed.
- Cons: git records *what* and *when*, not *why* or *what was rejected*. AI-driven
  work in particular produces large commits whose reasoning is nowhere in the
  diff. Git also cannot record work that produced no commit (research, a rejected
  approach) — which is exactly what gets repeated.

## Decision

We chose **Option B, with the changelog and AI-audit log from Option C's gap
added as mandatory artifacts**.

Because: selective context loading is the only thing that keeps per-session cost
flat as the project grows, and git demonstrably cannot carry the "why" — so the
changelog and audit log are not duplication of git, they are the part git has
never held.

## Consequences

- Makes easy: adding knowledge without inflating every session; onboarding a
  human; answering "why is it like this?" from the repo alone.
- Makes hard: a page can drift from the code. Mitigated by making "update the
  wiki page this change invalidates" part of the definition of done in
  `CLAUDE.md` §3.
- Adds overhead: every task now carries a changelog entry and an audit entry.
  Accepted deliberately — this is the point of the exercise, not a side effect.
- Revisit if: the wiki grows past the point where the folder index itself is
  expensive to read. At that point, split indexes per folder (already done) and
  consider a generated table of contents.

## Verification

Structure created and cross-linked at `wiki/`. Root `CLAUDE.md` rewritten to
route into it and to make the two logs a condition of task completion.
