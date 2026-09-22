# Context

Why the system hangs together the way it does.

> **Mostly empty by design.** The project idea is not chosen yet (`REQ-P.1`), so
> there is no domain model and no architecture to document. Both get written
> *as we decide them*, not copied from anywhere.

| Page | Covers | State |
|---|---|---|
| [`reference-project.md`](./reference-project.md) | What EdgeLedger is, and the rule against reading it | Written |
| [`glossary.md`](./glossary.md) | Terms used without explanation elsewhere | Written |
| `project-brief.md` | What we're building, who for, the contested write | ⛔ Blocked on `REQ-P.1` |
| `domain-model.md` | Our entities, invariants, business rules | ⛔ Blocked on `REQ-P.1` |
| `architecture.md` | Our topology, trust boundaries, request paths | ⛔ Blocked on `REQ-P.1` |

## Why the previous domain-model and architecture pages are gone

They documented **EdgeLedger's** design, written before the course was captured
and before it was clear that copying from EdgeLedger is ruled out until the
finishing step. They are sealed in
[`../reference-edgeledger/`](../reference-edgeledger/) — not deleted, but not to
be read until `REQ-X.6`.

See [ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md).

## How these pages get written

As decisions are made, not in advance and not by inference:

1. `REQ-P.1` picks the project → `project-brief.md`, and the same text goes at
   the top of the repo README per `REQ-0.5`.
2. Cluster B settles the route tree and the shared zod schema → the first entries
   in `domain-model.md`.
3. Cluster D settles the D1 schema and what lives in KV / R2 / Vectorize →
   `domain-model.md` fills out; `architecture.md` begins.
4. Cluster E settles the Durable Object's owning entity and the service-binding
   topology → `architecture.md` completes.
5. `REQ-X.5` turns `architecture.md` into the README diagram.

Every one of those steps is a decision, so every one gets an ADR
([`../decisions/`](../decisions/)) alongside the page update.
