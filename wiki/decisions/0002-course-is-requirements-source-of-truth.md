# ADR-0002: The course is the source of truth for requirements

- **Status:** Accepted — **working method superseded by**
  [ADR-0003](./0003-edgeledger-is-comparison-not-template.md)
- **Date:** 2026-09-22
- **Deciders:** Raffaele Di Gennaro
- **Requirement:** n/a (process decision)

## Context

We have two candidate sources for "what to build":

1. The Project JEDI course at `https://jedi.newpage.io/typescript-cloudflare/course`.
2. The reference implementation at `typescript-cloudflare-project/` (EdgeLedger),
   which already contains a complete, working version of the system.

The reference project is far easier to read — it is on disk, it is complete, and
it is well commented. The course is behind an authenticated session that the
available tooling cannot establish.

## Options considered

### Option A — Reverse-engineer requirements from the reference project
- Pros: available immediately; unambiguous; every requirement is provably
  satisfiable because it is already satisfied.
- Cons: an implementation is not a specification. It cannot tell us what is
  *required* vs. what the author happened to do, what the phase ordering is,
  what the acceptance criteria are, or which parts are explicitly out of scope.
  It also silently smuggles in the author's choices as if they were mandates.

### Option B — Course as source of truth, reference project as evidence
- Pros: requirements stay traceable to something that actually grades the work;
  the reference project still contributes concrete, proven patterns for *how*.
- Cons: blocked until course access is obtained.

## Decision

We chose **Option B**.

Because: the deliverable is a training project assessed against the course. A
requirement we invented by reading someone else's implementation is not a
requirement — and the failure mode (building the wrong thing confidently) is much
worse than the delay.

## Consequences

- `wiki/requirements/` stays empty and explicitly marked BLOCKED until course
  content is obtained. No requirement is written from inference.
- `wiki/techstack/`, `wiki/context/` and `wiki/guidelines/` **are** populated from
  the reference project, because they answer "how" and "with what", not "what".
  They carry a note that they must be reconciled against the course.
- Where the course and the reference project conflict, the course wins and the
  conflict gets its own ADR.
- Planning the codebase cannot start until this unblocks. Tracked in
  `wiki/todos/backlog.md`.

## Verification

`curl` on the course URL returns `HTTP/2 307` redirecting to
`/auth/login?redirect=%2Ftypescript-cloudflare%2Fcourse`. No page content is
served unauthenticated. Confirmed the login form posts `email`, `password` and
`authMethod` (`otp` | `password`) to `POST /auth/login`.

---

## Supersession note (2026-09-22)

The core finding stands: **the course is the source of truth for requirements.**

What is withdrawn is this ADR's working method — the phrase *"reference project
as evidence for **how**"*, and the consequence that
`techstack`/`context`/`guidelines` may be populated from EdgeLedger. The captured
course forbids copying from the reference build until the finishing step
(`REQ-0.4`, `REQ-X.6`).

See [ADR-0003](./0003-edgeledger-is-comparison-not-template.md) for the replacement.
