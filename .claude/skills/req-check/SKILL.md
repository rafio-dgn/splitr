---
name: req-check
description: Trace work to a REQ-* before starting and verify it against the acceptance criteria before claiming done. Use at the start of any build task, and before reporting anything complete. Prevents inventing scope and prevents false "done".
user-invocable: true
allowed-tools: Read, Grep, Glob
---

## Requirements index

!`ls ${CLAUDE_PROJECT_DIR}/wiki/requirements/clusters/ 2>/dev/null`

## Before you start

1. Name the `REQ-*` this task satisfies. If you cannot, **stop** — either it is
   in `wiki/requirements/` and you have not found it, or it is not a requirement
   at all and belongs in `wiki/todos/backlog.md`.
2. Read that requirement's **acceptance criteria**, not just its statement. The
   criteria are what "done" means.
3. Read `wiki/requirements/cross-cutting-rules.md` — `REQ-M.1` … `REQ-M.8` apply
   to every task, always.

## Before you claim done

Go through the acceptance criteria one at a time and state, for each:

- what you did, and
- **how you verified it** — the command you ran and what it printed.

A criterion you did not verify is not met. Say so.

Watch for criteria that demand a **demonstration** rather than code — "prove it
by curl-ing an invalid payload", "run it twice and confirm identical", "the
sixth request returns 429". These are not satisfied by implementing the feature;
they are satisfied by running the thing and keeping the output. See the
`demo-evidence` skill.

## Then update the status

Set the `REQ-*` status in its cluster file: `Not started` / `In progress` /
`Done` / `Blocked` / `Dropped` / `Needs clarification`. A stale status is worse
than none, because the build plan is read as truth.

## Red flags

- Building something no requirement asked for → backlog it instead.
- "Done" with unverified criteria.
- A requirement naming an **exact path or header** (`src/lib/fetch.ts`,
  `src/db/schema.ts`, an `idempotencyKey` header) — match it literally. These are
  cheap to satisfy and awkward to explain if you deviate.
