> 🔒 **QUARANTINED — do not read until `REQ-X.6`.** This describes *EdgeLedger's*
> design, not ours. See [README](./README.md) and
> [ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md).

# Architecture

## Shape

```
┌──────────── Frontends (separate Workers, identical D1) ─────────────┐
│  nextjs-edgeledger-flare        │  tanstack-edgeledger-flare        │
│  Next.js 16 + OpenNext          │  TanStack Start + Vite            │
└────────────────────┬────────────┴───────────┬───────────────────────┘
                     │ service binding (LEDGER)                       │
                     ▼                                                │
            ┌──────────────────────────────┐                          │
            │ edgeledger-transaction-do    │ ◀── cron (nightly)       │
            │ Durable Object writer        │                          │
            │ + idempotency + audit log    │                          │
            └─────┬────────────┬────────┬──┘                          │
                  │ AI         │ Queue  │                             │
                  ▼            ▼        │      WORKFLOW binding ──────┘
       edgeledger-ai   edgeledger-consumer    edgeledger-workflow
       (categorise)   (notify, async)         (monthly statement)

   D1 (SQLite) · KV (sessions) · R2 (receipts + statements)
   Cloudflare Access on /admin/* · Turnstile on register/login
```

## Why it is split this way

**Two frontends, one backend.** The DO worker, AI worker, queue and workflow are
framework-agnostic. Only the presentation layer is duplicated. This is what makes
"build it twice" a meaningful exercise rather than two disconnected projects.

**Writes funnel through a Durable Object.** D1 offers no interactive transaction
across statements, so read-balance-then-insert would race. One DO instance per
user serialises those writes by construction. Reads bypass the DO entirely and hit
D1 directly — they do not need serialising and going through the DO would be a
pointless bottleneck.

**AI lives in its own worker.** Three callers need categorisation (the DO's create
path, the nightly backfill, and eventually the workflow). One implementation, one
prompt, one allow-list, reachable by service binding.

**The queue is fire-and-forget.** `EVENTS.send()` is wrapped in try/catch and
guarded by `if (this.env.EVENTS)`. The transaction is already durable in D1 by
then; losing a notification is acceptable, failing the write is not. This is also
what lets the project run on the free tier, where Queues are unavailable.

**Workflows for anything multi-step and slow.** Each `step.do()` is checkpointed,
so a crash resumes rather than restarts, and total runtime can exceed one
invocation's CPU budget.

## Layering inside a frontend

```
routes/          rendering + routing only. No DB, no business rules.
  └── server/    RPC boundary (createServerFn / Server Actions).
                 Session lookup, input validation, redirect shaping.
      └── services/   business logic. Authorisation, D1 queries,
                      calls out to the DO worker. Framework-agnostic.
          └── db/     Drizzle client + schema.
              lib/    session, password, authz, access, format.
```

Rules:
- A route component never imports from `db/`.
- A file in `services/` never imports from `@tanstack/*` or `next/*`. If it needs
  request context, the caller passes it in (that is why every service function
  takes `caller: SessionData` as its first argument).
- `lib/session.ts` is the one file that legitimately differs between the two
  frontends, because it touches framework cookie APIs.

## Trust boundaries

Four, each with its own check:

| # | Boundary | Check |
|---|---|---|
| 1 | Internet → frontend Worker | Session cookie; Turnstile and rate limiting on auth routes |
| 2 | Internet → `/admin/*` | Cloudflare Access challenge, **then** JWT verification in the Worker, **then** app role check |
| 3 | Frontend → private Worker | `workers_dev: false` + shared-secret header, constant-time compared |
| 4 | Caller → user's data | `assertSelfOrAdmin` / `assertAdmin` in the service layer |

Boundary 4 is the one that matters most: it sits below the routes, so a new route
that forgets to guard itself still cannot leak another user's data.

## Request paths

**Read (dashboard):**
`route loader → server fn → getSession() → KV hit → service (assertSelfOrAdmin) → D1 → render`

**Write (create transaction):**
`form → server fn → validate → service (assertSelfOrAdmin) → LEDGER binding
 → DO worker (secret check) → DO instance (idempotency → balance → AI → D1 insert
 → audit → queue) → response → client navigates`

**Receipt download:**
`GET /api/receipts/<key> → session? → D1 lookup owner of key → owner or admin?
 → R2 get → stream back` (404 for both "missing" and "not yours")

**Nightly:**
`cron 00:00 UTC → scheduled() → ctx.waitUntil(runDailyJob)
 → aggregate yesterday into daily_summary (UPSERT)
 → backfill up to 100 NULL categories via AI_SERVICE`

**Monthly statement:**
`admin UI → WORKFLOW binding → POST /trigger (secret) → workflow instance
 → aggregate → render → R2 put → audit`

## Deliberate omissions

Worth knowing so nobody "fixes" them by accident:

- **No Vectorize.** Mentioned in the reference README as off.
- **No Analytics Engine.** Audit logging is structured `console.log` instead —
  it works without a paid add-on.
- **No email/push.** The queue consumer logs rather than sending.
- **Transfers have no counterparty.** Recorded, but they do not move a balance.
