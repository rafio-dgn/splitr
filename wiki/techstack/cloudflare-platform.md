# Cloudflare compute platform

## Runtime model

Workers run on V8 isolates, not Node. Consequences that bite:

- No `fs`, no native addons, no `bcrypt`/`argon2`. Use Web Crypto.
- `nodejs_compat` gives you *some* Node built-ins, not a Node runtime.
- CPU time per invocation is bounded. Long pipelines belong in Workflows.
- Global state persists between requests on the same isolate but is **not**
  durable and **not** shared across isolates. Cache things that are cheap to
  rebuild (e.g. the JWKS cache in `lib/access.ts`), never state you need.

## Workers in the reference architecture

Six deployables, each its own Worker:

| Worker | Public? | Role |
|---|---|---|
| `tanstack-edgeledger-flare` | yes | TanStack Start frontend |
| `nextjs-edgeledger-flare` | yes | Next.js frontend, same D1 |
| `edgeledger-transaction-do` | **no** | Durable Object write coordinator + cron host |
| `edgeledger-ai` | **no** | Workers AI categorisation |
| `edgeledger-consumer` | **no** | Queue consumer |
| `edgeledger-workflow` | **no** | Monthly statement pipeline |

Private workers set `"workers_dev": false` — no `*.workers.dev` URL, so they are
reachable only through a service binding. See
[`../guidelines/security.md`](../guidelines/security.md) for why that alone is
not enough.

## Service bindings

Worker-to-worker calls that never leave Cloudflare's network — no public hop, no
DNS, no TLS handshake.

```jsonc
// in the caller's wrangler.jsonc
"services": [
  { "binding": "LEDGER", "service": "edgeledger-transaction-do" }
]
```

```ts
// env.LEDGER is a Fetcher. The hostname is arbitrary — it is never resolved.
const response = await env.LEDGER.fetch("https://ledger.internal/transaction/create", {
  method: "POST",
  headers: { "content-type": "application/json", "x-ledger-secret": env.TANSTACK_LEDGER_SECRET },
  body: JSON.stringify(payload),
});
```

Binding graph in the reference project:

```
tanstack ──LEDGER──▶ transaction-do ──AI_SERVICE──▶ ai
    └────WORKFLOW──▶ workflow              └──EVENTS(queue)──▶ consumer
nextjs   ──LEDGER──▶ transaction-do
```

## Durable Objects

One actor instance per user, addressed by name:

```ts
const doId = env.USER_LEDGER.idFromName(userId);
const stub  = env.USER_LEDGER.get(doId);
await stub.createTransaction(input);   // RPC — typed, not fetch()
```

Declared in `wrangler.jsonc`:

```jsonc
"durable_objects": { "bindings": [{ "name": "USER_LEDGER", "class_name": "UserLedger" }] },
"migrations": [{ "tag": "v1", "new_sqlite_classes": ["UserLedger"] }]
```

- `new_sqlite_classes` selects SQLite-backed DO storage (current) over the legacy
  KV-backed storage. Use it for new classes.
- Migrations are **append-only**. Never edit a released tag; add a new one.
- The class extends `DurableObject<Env>` from `cloudflare:workers`. Public methods
  on it are callable as RPC from the stub — no manual `fetch` routing needed.

**What DOs buy you here:** serialised writes per user. Two concurrent requests for
the same user hit the same instance and cannot interleave, which is what makes the
read-balance-then-insert sequence safe without transactions.

**What they do not buy you:** DO storage is *not* the database. D1 remains the
source of truth for balance. DO storage holds only the idempotency cache.

### Alarms

`ctx.storage.setAlarm(ts)` schedules `alarm()` on that instance. Used here to
evict idempotency entries after 24h, and to re-arm itself while entries remain.
One alarm per instance — `getAlarm()` before setting, or you clobber the pending one.

## Cron Triggers

```jsonc
"triggers": { "crons": ["0 0 * * *"] }   // midnight UTC
```

```ts
async scheduled(_event, env, ctx) {
  ctx.waitUntil(runDailyJob(env));   // waitUntil, or the job is killed at return
}
```

The cron handler lives on the DO worker but does **not** go through a DO — it
queries D1 directly. Jobs must be idempotent: the nightly aggregation uses
`INSERT … ON CONFLICT DO UPDATE` with a deterministic id (`${userId}_${date}`) so
re-running is harmless.

Pair every cron with a manual trigger endpoint (`POST /daily-job/run`) so it can
be exercised without waiting for the schedule.

## Queues (requires Workers Paid)

Producer:
```jsonc
"queues": { "producers": [{ "binding": "EVENTS", "queue": "edgeledger-events" }] }
```
Consumer:
```jsonc
"queues": { "consumers": [{
  "queue": "edgeledger-events", "max_batch_size": 10, "max_batch_timeout": 5,
  "max_retries": 3, "dead_letter_queue": "edgeledger-events-dlq"
}] }
```

- Producing is **best-effort and non-fatal**: the DO wraps `EVENTS.send()` in
  try/catch and degrades silently if the binding is absent, so the free tier still
  works.
- The consumer has no `fetch` handler — only `queue(batch, env)`.
- Ack/retry is per message, not per batch. Retry with explicit backoff:
  `msg.retry({ delaySeconds: 30 * 2 ** (msg.attempts - 1) })`.
- After `max_retries`, messages land in the DLQ. The DLQ needs creating too.

## Workflows (requires Workers Paid)

```jsonc
"workflows": [{ "name": "monthly-statement", "binding": "STATEMENT_WORKFLOW", "class_name": "StatementWorkflow" }]
```

```ts
export class StatementWorkflow extends WorkflowEntrypoint<Env, StatementParams> {
  async run(event, step) {
    const data = await step.do("aggregate-transactions", async () => { /* … */ });
    const text = await step.do("render-statement",       async () => { /* … */ });
    const key  = await step.do("upload-to-r2",           async () => { /* … */ });
  }
}
```

Each `step.do()` result is checkpointed. A crash resumes from the last completed
step rather than restarting, each step retries with backoff independently, and the
total run can far exceed a single invocation's CPU budget.

**Step return values must be serialisable** — they are persisted between steps.

Trigger and poll:
```ts
const instance = await env.STATEMENT_WORKFLOW.create({ params });  // → instance.id
const status   = await (await env.STATEMENT_WORKFLOW.get(id)).status();
```

## Observability

Every worker sets `"observability": { "enabled": true }`. Logs are structured
`console.log` with a bracketed prefix — see
[`../guidelines/observability.md`](../guidelines/observability.md).
