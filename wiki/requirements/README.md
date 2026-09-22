# Requirements

**Status: CAPTURED.** Source: [`_raw/course-full-capture.md`](./_raw/course-full-capture.md)
(all 21 slides, retrieved 2026-09-22).

This folder is the source of truth for **what** to build. `techstack/` covers
*with what*, `guidelines/` covers *how*.

## ⚠️ Read this first — what the course actually asks for

The course is **not** "rebuild EdgeLedger". It is:

> **Pick your own project idea and build it incrementally across six clusters,
> using about five of the Cloudflare building blocks, with a contested write at
> its heart.**

EdgeLedger (`typescript-cloudflare-project/`) is the *finished reference build*.
The course is explicit about how to treat it:

> *"Never build inside it. **Do not copy from it at this stage** — it is for
> comparison later."* — §3.2
>
> *"Read **EdgeLedger** (the reference build) and compare notes."* — §10, listed
> under **finishing** steps.

So EdgeLedger is a **comparison artifact for the end**, not a pattern library for
the start. See [ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md).

## Contents

| File | Purpose |
|---|---|
| [`00-capture-protocol.md`](./00-capture-protocol.md) | How to turn course text into requirement entries |
| [`cross-cutting-rules.md`](./cross-cutting-rules.md) | Rules that apply to every cluster — read before any work |
| [`clusters/`](./clusters/) | One file per cluster, with `REQ-*` entries |
| [`_raw/`](./_raw/) | Verbatim course capture. Never edited. |

## Cluster map

Six clusters in three parts. **Order is mandatory** — one capability per step.

| Part | Cluster | Topic | Blocks introduced |
|---|---|---|---|
| — | [Prerequisites](./clusters/00-prerequisites-and-method.md) | Tooling, method, repo setup | — |
| — | [Project selection](./clusters/01-project-selection.md) | Pick the idea; name the contested write | — |
| **1 — Foundations** | [A](./clusters/A-language-and-runtime.md) | TypeScript & React fundamentals | none (local only) |
| | [B](./clusters/B-routing-and-forms.md) | App Router, Server Components, Server Actions, zod | none (local only) |
| **2 — Edge platform** | [C](./clusters/C-workers.md) | Workers, Wrangler, first Workers AI call | Workers, Workers AI |
| | [D](./clusters/D-storing-data.md) | Where each kind of data lives | D1, KV, R2, Vectorize |
| **3 — Going further** | [E](./clusters/E-shared-state-and-background-work.md) | Concurrency and background work | Durable Objects, Cron, service bindings, RAG, Queues* |
| | [F](./clusters/F-protecting-the-app.md)* | Hardening | Turnstile, rate limiting, AI Gateway |
| — | [Deliverables & certification](./clusters/99-deliverables-and-certification.md) | Ship, document, demo | — |

`*` Cluster F is marked **OPTIONAL** on the slide. Queues within Cluster E is also
marked optional. Everything else is `[MUST]`.

## ID scheme

`REQ-<cluster>.<n>` — assigned once, never reused. A dropped requirement is
marked `Dropped`, never deleted.

| Prefix | Covers |
|---|---|
| `REQ-0.x` | Prerequisites and tooling |
| `REQ-M.x` | Working method (cross-cutting) |
| `REQ-P.x` | Project selection |
| `REQ-A.x` … `REQ-F.x` | Clusters A–F |
| `REQ-X.x` | Deliverables and certification |

## Status legend

`Not started` · `In progress` · `Done` · `Blocked` · `Dropped` · `Needs clarification`

## What is still open

- [ ] **The project idea is not chosen.** Everything in `context/domain-model.md`
      depends on it. See `REQ-P.1` and [`../todos/backlog.md`](../todos/backlog.md).
- [ ] Whether `[OPTIONAL]` items (Cluster F, Queues) are in our scope.

## Notable resolutions from the capture

Questions that were open before the capture, now answered:

| Question | Answer |
|---|---|
| Both frontends, or one? | **One.** Next.js App Router. TanStack Start is not in the course at all. |
| Workers Paid plan needed? | **No.** "A Cloudflare account (free tier is sufficient for the whole path)" — §0.2. Queues, which need Paid, is the one `[OPTIONAL]` item in Cluster E. |
| Fresh build or fork EdgeLedger? | **Fresh, in a new GitHub repo.** Copying from EdgeLedger is explicitly ruled out at this stage. |
| Is Cloudflare Access required? | **No.** Never mentioned. It is an EdgeLedger extra. |
| Are Workflows required? | **No.** Never mentioned. Also an EdgeLedger extra. |
| Is Vectorize required? | **Yes** — `REQ-D.4`. EdgeLedger has it switched off; the course does not. |
