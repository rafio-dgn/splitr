# ADR-0003: EdgeLedger is a comparison artifact, not a template

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** the course (this is not our choice to make)
- **Requirement:** `REQ-0.4`, `REQ-B.5`, `REQ-X.6`

## Context

Before the course was captured, the working assumption — recorded in
[ADR-0002](./0002-course-is-requirements-source-of-truth.md) — was: *course for
requirements, reference project as evidence for how to implement them.* On that
basis the wiki was populated by reading `typescript-cloudflare-project/`
(EdgeLedger) in depth and writing up its domain model, architecture and patterns.

The captured course says something different, three times:

> §3.2 — *"Never build inside it. **Do not copy from it at this stage** — it is
> for comparison later."*

> §5 — *"The reference build EdgeLedger ships Workers-native auth (Web Crypto
> hashing, sessions in KV); **read it afterwards**."*

> §10, under **finishing steps** — *"Read EdgeLedger (the reference build) and
> compare notes."*

And the whole path rests on two rules that copying would defeat:

> §13 — *"Every file produced by the agentic tool must be reviewed and
> understood. Every decision must be explainable in your own words."*

The final deliverable `REQ-X.6` is a **written comparison** between our build and
EdgeLedger. That deliverable only exists if the two were arrived at
independently.

## Options considered

### Option A — Keep mining EdgeLedger for patterns (the ADR-0002 approach)
- Pros: faster; the patterns are demonstrably good and already documented.
- Cons: directly contradicts `REQ-0.4`. Destroys `REQ-X.6` — you cannot compare
  notes with a build you copied. Undermines `REQ-M.4`, since the honest answer to
  "why is it like this?" becomes "because EdgeLedger did it that way". Also
  imports EdgeLedger's *wrong* answers: it serves files through a Worker where
  `REQ-D.3` demands presigned URLs, and has Vectorize off where `REQ-D.4` demands
  it on.

### Option B — Delete the EdgeLedger analysis already written
- Pros: unambiguous compliance.
- Cons: throws away accurate platform documentation that is not EdgeLedger-specific
  (how Durable Objects address instances, how service bindings work, what
  `wrangler types` generates). That knowledge is course material in its own right
  — Cluster C, D and E teach it.

### Option C — Quarantine the EdgeLedger-specific analysis; keep the platform mechanics
- Pros: honours the rule where it bites (EdgeLedger's *design*) without discarding
  generic platform reference. The quarantined material becomes the input to
  `REQ-X.6` instead of being wasted.
- Cons: requires a judgement call on each page about which side of the line it
  falls; a careless reader can still open the quarantined folder.

## Decision

We chose **Option C**.

Because: the rule's purpose is that the *design decisions* must be ours, so the
comparison at the end is meaningful and the explanations at the demo are honest.
Knowing that `idFromName` gives you a deterministic DO instance is not a design
decision — the course teaches it directly in Cluster E. Knowing that *EdgeLedger
made the user the owning entity* **is** one, and we must reach our own answer.

The line: **platform mechanics stay, EdgeLedger's design choices are quarantined.**

## Consequences

- `wiki/reference-edgeledger/` holds the EdgeLedger-specific analysis, marked
  do-not-open until `REQ-X.6`. Git keeps it; it is not lost.
- `context/domain-model.md` and `context/architecture.md` moved there — they
  documented EdgeLedger's domain and architecture, not ours. `context/` is now
  empty of design content until `REQ-P.1` picks a project.
- `techstack/` stays, reframed as platform reference. Its code examples are
  illustrations of Cloudflare APIs, not a design to reproduce.
- Every page carrying EdgeLedger-derived material states so at the top.
- Three places where EdgeLedger actively contradicts the course are now flagged
  in the requirements: presigned R2 uploads (`REQ-D.3`), Vectorize required
  (`REQ-D.4`), and auth-by-library rather than hand-rolled (`REQ-B.5`).
- **This ADR supersedes the working method in ADR-0002**, though not its core
  finding — the course remains the source of truth for requirements. ADR-0002's
  phrase "reference project as evidence for *how*" is withdrawn.
- Revisit when: `REQ-X.6` is reached. At that point the quarantine lifts and the
  material becomes the basis of the comparison write-up.

## Verification

Course capture at `../requirements/_raw/course-full-capture.md`, §3.2, §5, §10,
§13. The three EdgeLedger/course contradictions were confirmed by reading
`tanstack-edgeledger-flare/src/routes/api/receipts/$.ts` (streams through the
Worker; no presigned URL), the reference README (Vectorize listed as off), and
`src/lib/password.ts` (hand-rolled PBKDF2).
