---
name: wiki-discipline
description: Enforce the project paper trail — changelog, AI-audit and ADR entries — in the same turn as the change. Use before ending any turn that modified code or the wiki. Prevents losing the reasoning the demo depends on.
user-invocable: true
allowed-tools: Read, Edit, Write, Bash(git status *), Bash(git diff *)
---

## What changed in this working tree

!`cd ${CLAUDE_PROJECT_DIR} && git status --short`

## The rule

Two files are the project's memory and **neither may fall behind the code**:

- `wiki/CHANGELOG.md` — one entry per change to code or wiki
- `wiki/AI-AUDIT.md` — one entry per AI task, **including tasks that produced no
  code** (research, analysis, a rejected approach)

Plus: any choice that closed off an alternative gets an ADR in `wiki/decisions/`.

**Write them in the same turn as the change.** "I'll do the changelog at the end"
is how the changelog ends up wrong.

## Why this is not bookkeeping

`REQ-M.4` requires every decision to be **explainable in your own words** at the
15-minute demo. `REQ-X.2` requires written notes on what surprised you and what
you would do differently. Both are assembled from these files. A decision that
lives only in a chat transcript is a lost decision — the transcript will be gone.

## Entry formats

Changelog:

```markdown
## YYYY-MM-DD — <short title>
- **Type:** added | changed | fixed | removed | docs
- **Scope:** <paths or subsystem>
- **What:** <concrete, one or two sentences>
- **Why:** <REQ id, bug, review comment>
- **Decision:** <ADR link, or "none">
```

AI-audit — the two fields that carry the weight are **Alternatives considered**
(raw material for `REQ-M.4`) and **Verification** (what you actually ran and what
it printed, not "it works"):

```markdown
## YYYY-MM-DDTHH:MMZ — <task title>
- **Agent:** · **Prompt intent:** · **Inputs read:** · **Actions:**
- **Alternatives considered:** · **Assumptions:**
- **Verification:** · **Open questions:**
```

ADR: copy `wiki/decisions/adr-template.md` to `NNNN-<slug>.md`, add it to
`wiki/decisions/README.md`, and record the options you **rejected** and why.
An ADR without rejected options is a note, not a decision record.

## Also check

- Did this change invalidate a wiki page? Fix it now.
- Do `wiki/todos/backlog.md` and `build-plan.md` still tell the truth?
- Is the `REQ-*` status current?

## If unsure whether something counts

Log it. An over-full audit trail costs nothing; a missing entry costs the reason
the wiki exists.
