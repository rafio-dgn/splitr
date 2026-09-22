# The reference project (EdgeLedger)

`../typescript-cloudflare-project/` — the finished reference build, cloned per
`REQ-0.4` as a **sibling of this repo**, never inside it:

```
ts-training/
├── splitr/                        ← this repo
└── typescript-cloudflare-project/ ← reference, read-only, sealed
```

## The rule

> **Do not copy from it. Do not read it for patterns. Do not open it to "check
> how they did X".**

The course, three times:

> §3.2 — *"Never build inside it. **Do not copy from it at this stage** — it is
> for comparison later."*
>
> §5 — *"…EdgeLedger ships Workers-native auth … **read it afterwards**."*
>
> §10, **finishing** steps — *"Read EdgeLedger and compare notes."*

`REQ-X.6` is a deliverable: a written comparison between our build and theirs.
It only exists if the two were arrived at independently. Reading early deletes
the deliverable.

It also silently breaks `REQ-M.4` — every decision explainable in your own words.
"Because EdgeLedger did it that way" is not an explanation, and the 15-minute
demo panel (`REQ-X.8`) will find the seam.

## What this means in practice

| Situation | Do |
|---|---|
| You want to know how a Cloudflare service works | Read the official docs, or [`../techstack/`](../techstack/) |
| You want to know how to structure *our* app | Decide it, and write an ADR |
| You are stuck on an API signature | `node_modules` types, official docs |
| You're curious how EdgeLedger solved it | **Note the question and move on.** Save it for `REQ-X.6` |

Prior analysis of EdgeLedger, written before the course was captured, is sealed
in [`../reference-edgeledger/`](../reference-edgeledger/). It is not lost — it
becomes the input to the comparison.

## Where it actively contradicts the course

Worth knowing *now*, so a stray glance does not mislead:

| Course requirement | EdgeLedger |
|---|---|
| `REQ-D.3` — presigned R2 URLs, file bypasses the Worker | Streams through a Worker route |
| `REQ-D.4` — Vectorize required | Vectorize off |
| `REQ-B.5` — auth from a library, black box | Hand-rolled PBKDF2 + KV sessions |

Also present in EdgeLedger but **not** in the course at all: Cloudflare Access,
Workflows, a second TanStack Start frontend. Do not treat them as scope.

## What it is useful for, legitimately

- **Confirming it exists.** `REQ-0.4` is satisfied — it is cloned beside the
  project, not inside it.
- **`REQ-X.5`, the architecture diagram.** Its README opens with an ASCII
  topology diagram. Format inspiration is presentation, not design.
- **After `REQ-X.6`.** Then read all of it.

## Facts about it that need no reading

Enough to reason about the project without opening the source:

- Six deployable Workers: two frontends (Next.js 16 + OpenNext, TanStack Start),
  a Durable Object write coordinator, an AI worker, a queue consumer, a workflow
  worker.
- Uses D1, KV, R2, Workers AI, Queues, Workflows, Cron, service bindings,
  Turnstile, rate limiting, Cloudflare Access.
- Four git commits, all scaffolding. There is no phase-by-phase history to learn
  from even if we wanted it.
- Essentially no tests — one stub file.

## Never

- Build inside it.
- Edit it.
- Copy code out of it before `REQ-X.6`.
- Load `../reference-edgeledger/` into an agent's context before `REQ-X.6`.
