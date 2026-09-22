---
name: edgeledger-guard
description: The rule that the EdgeLedger reference build is sealed until REQ-X.6. Use whenever tempted to look at the reference implementation, or when a question starts "how did they do X". Protects a course deliverable.
user-invocable: true
allowed-tools: Read
---

## ⛔ EdgeLedger is sealed

**Do not read** `../typescript-cloudflare-project/` or
`wiki/reference-edgeledger/` until `REQ-X.6`. Do not load either into context.
Do not grep them. Do not "just check how they did it".

## Why — this is not pedantry

The course says it three times:

> §3.2 — *"Never build inside it. **Do not copy from it at this stage** — it is
> for comparison later."*
>
> §5 — *"…EdgeLedger ships Workers-native auth … **read it afterwards**."*
>
> §10, **finishing** steps — *"Read EdgeLedger and compare notes."*

`REQ-X.6` is a **deliverable**: a written comparison between our build and
theirs. It only exists if the two were arrived at independently. Reading it early
does not merely break a rule — **it deletes the deliverable**, because there is
nothing left to compare.

It also quietly breaks `REQ-M.4` (every decision explainable in your own words —
"because EdgeLedger did it that way" is not an explanation) and `REQ-X.1` (an
application *you built yourself*). The panel will find the seam.

## It would also make you wrong

EdgeLedger contradicts the course in at least three places:

| Course requires | EdgeLedger does |
|---|---|
| `REQ-D.3` — presigned R2 URLs, file bypasses the Worker | streams through a Worker route |
| `REQ-D.4` — Vectorize required | Vectorize switched off |
| `REQ-B.5` — auth from a library, black box | hand-rolls PBKDF2 + KV sessions |

It also contains Cloudflare Access, Workflows and a TanStack frontend — none of
which are in the course, and none of which are our scope.

## What to do instead

| Situation | Do |
|---|---|
| Need to know how a Cloudflare service works | Official docs, or `wiki/techstack/` |
| Need to structure our app | Decide it, write an ADR |
| Stuck on an API signature | `node_modules` types, official docs |
| Curious how EdgeLedger solved it | **Note the question. Move on.** Save it for `REQ-X.6` |

Keep those questions — they are the seed of the comparison write-up.

## When the seal lifts

At `REQ-X.6`, after our build is complete. Then read all of it and write the
comparison. Differences are the *point*, not mistakes to correct.
