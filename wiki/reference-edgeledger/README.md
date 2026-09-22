# 🔒 EdgeLedger analysis — QUARANTINED

> **Do not read these pages, and do not load them into an agent's context, until
> [`REQ-X.6`](../requirements/clusters/99-deliverables-and-certification.md#req-x6--read-edgeledger-and-compare-notes)
> — the finishing step, after our build is complete.**

## Why this folder is sealed

The course is explicit:

> *"Never build inside it. **Do not copy from it at this stage** — it is for
> comparison later."* — capture §3.2

> *"Read **EdgeLedger** (the reference build) and compare notes."* — §10,
> **finishing** steps

`REQ-X.6` is a deliverable: a written comparison between our build and
EdgeLedger's. **That deliverable only exists if the two were arrived at
independently.** Reading these pages early does not merely break a rule — it
deletes the deliverable, because there is nothing left to compare.

It would also quietly break two more requirements: `REQ-M.4` (every decision
explainable in your own words — "because EdgeLedger did it that way" is not an
explanation) and `REQ-X.1` (an application *you built yourself*).

## What is in here

Written on 2026-09-22, before the course was captured, when the working
assumption was that EdgeLedger was a pattern library. It is accurate — it is just
the wrong thing to read right now.

| File | Contents |
|---|---|
| [`edgeledger-domain-model.md`](./edgeledger-domain-model.md) | EdgeLedger's entities, invariants, balance rules, transaction-creation path |
| [`edgeledger-architecture.md`](./edgeledger-architecture.md) | Its six-worker topology, layering, trust boundaries, request paths |

## What is *not* in here, and why

`../techstack/` stays outside the quarantine. It documents Cloudflare platform
mechanics — how `idFromName` addresses a DO, what `wrangler types` generates, how
a queue consumer acks. That is course material in its own right (Clusters C, D
and E teach it directly), and it is not EdgeLedger's design.

The line, per [ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md):
**platform mechanics are fair game; EdgeLedger's design choices are not.**

## Three places EdgeLedger contradicts the course

Recorded here because they matter *before* the quarantine lifts — they are traps
for anyone who peeks:

| Course requirement | What EdgeLedger does instead |
|---|---|
| `REQ-D.3` — R2 uploads via **presigned URLs**, file never touches the Worker | Streams receipts **through** a Worker route |
| `REQ-D.4` — **Vectorize required**: embed, upsert, `/search` by meaning | Vectorize switched **off** |
| `REQ-B.5` — auth from a **library**, as a black box | Hand-rolls PBKDF2 + KV sessions |

EdgeLedger is not wrong; it was built against different constraints. But copying
it on these three points would fail the requirements outright.

## When the quarantine lifts

At `REQ-X.6`: read everything here, read the reference source, and write the
comparison. Differences are the *point* — understand why each build went the way
it did. They are not mistakes to correct.
