# Tech stack

Cloudflare platform reference: what each service is and how its API works.

> ## ⚠️ How to read these pages
>
> They document **platform mechanics** — how `idFromName` addresses a Durable
> Object, what `wrangler types` generates, how a queue consumer acks. That is
> course material in its own right (Clusters C, D and E teach it).
>
> Their **code examples are drawn from EdgeLedger**, because that is what was on
> disk when they were written. Read them as illustrations of a Cloudflare API,
> **never as a design to reproduce**. Our architecture is ours to decide, and
> copying EdgeLedger's is ruled out until `REQ-X.6` —
> [ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md).
>
> Where an example conflicts with a requirement, **the requirement wins.** The
> known conflicts are listed below.

| Page | Covers |
|---|---|
| [`cloudflare-platform.md`](./cloudflare-platform.md) | Workers, Durable Objects, Queues, Cron, service bindings |
| [`cloudflare-data.md`](./cloudflare-data.md) | D1, KV, R2, Workers AI |
| [`typescript.md`](./typescript.md) | Compiler settings, typing patterns, env augmentation |
| [`data-access-drizzle.md`](./data-access-drizzle.md) | Drizzle ORM on D1, migrations |
| [`security-services.md`](./security-services.md) | Turnstile, rate limiting, secrets |
| [`versions.md`](./versions.md) | Versions seen in the reference build, and the drift hazard |
| [`frontend-nextjs-opennext.md`](./frontend-nextjs-opennext.md) | Next.js on Workers via OpenNext |
| ~~`frontend-tanstack-start.md`~~ | **Out of scope** — TanStack Start is not in the course |

## What the course actually mandates

From capture §12, the consolidated stack:

**Language & framework:** TypeScript · React · **Next.js (App Router, Server
Components, Server Actions)** · Tailwind · **zod**

**Tooling:** Node ≥ 20 + npm · Git/GitHub · Wrangler · `create-next-app` ·
`npm create cloudflare@latest` · drizzle-kit · curl · an agentic coding tool

**Cloudflare compute:** Workers · Durable Objects · Queues (+ DLQ)* · Cron /
`scheduled()` · service bindings · Pages

**Cloudflare data:** D1 (with Drizzle) · KV · R2 (**presigned URLs**) ·
**Vectorize**

**Cloudflare AI:** Workers AI (`@cf/meta/llama-3.1-8b-instruct`,
`@cf/baai/bge-base-en-v1.5`) · **AI Gateway*** · **RAG**

**Cloudflare security:** Turnstile* · rate-limiting binding* · secrets ·
structured `[AUDIT]` logging · secret rotation*

**Optional auth:** Auth.js / Lucia / Clerk as a black box

`*` in an `[OPTIONAL]` cluster or item.

## Gaps these pages do not yet cover

Required by the course, absent from the pages below because EdgeLedger does not
use them. These need writing from official docs when the relevant cluster starts:

| Missing | Required by |
|---|---|
| **Vectorize** — index creation, embedding, upsert, similarity query | `REQ-D.4` |
| **R2 presigned URLs** — issuing, direct client upload | `REQ-D.3` |
| **RAG** — retrieve-then-generate wiring | `REQ-E.4` |
| **AI Gateway** — caching, logs, rate limits, spend cap | `REQ-F.4` |
| **zod** — shared client/server schema | `REQ-B.2` |
| **Next.js deploy adapter** — OpenNext vs Pages, an open decision | `REQ-C.1` |

## Known conflicts: EdgeLedger examples vs. course requirements

| Requirement | EdgeLedger example in these pages | Use |
|---|---|---|
| `REQ-D.3` presigned R2 uploads | `cloudflare-data.md` streams objects through a Worker | **The requirement** |
| `REQ-D.4` Vectorize required | Not covered; EdgeLedger has it off | **The requirement** |
| `REQ-B.5` auth from a library | `security-services.md` shows hand-rolled PBKDF2 | **The requirement** |
| `REQ-E.2` `idempotencyKey` **header** | EdgeLedger passes it in the request body | **The requirement** |

## The one-line summary

TypeScript everywhere, Cloudflare Workers as the only runtime, D1 as the only
relational store, and **no Node-native dependencies** — V8 isolates, not Node.
Anything needing native bindings (bcrypt, argon2, `fs`) is off the table. That
constraint is itself examinable: `REQ-C.4` asks for three such modules and their
edge-friendly replacements.
