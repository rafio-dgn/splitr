# Context

Why the system hangs together the way it does.

> **Filled as decisions are made.** The project idea is settled (`REQ-P.1` →
> Splitr) and Cluster B's screens are designed. The domain model and
> architecture are still open — they get written *as we decide them*, not
> copied from anywhere.

| Page | Covers | State |
|---|---|---|
| [`reference-project.md`](./reference-project.md) | What EdgeLedger is, and the rule against reading it | Written |
| [`glossary.md`](./glossary.md) | Terms used without explanation elsewhere | Written |
| [`project-brief.md`](./project-brief.md) | What we're building, who for, the contested write | Written ([ADR-0004](../decisions/0004-project-is-splitr.md)) |
| [`screens-cluster-b.md`](./screens-cluster-b.md) | Cluster B screens, flows, copy and state coverage (`REQ-B.1`, `REQ-B.4`) | Written |
| `domain-model.md` | Our entities, invariants, business rules | Pending — written as Cluster D settles the schema |
| `architecture.md` | Our topology, trust boundaries, request paths | Pending — written as Cluster E settles the topology |

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
