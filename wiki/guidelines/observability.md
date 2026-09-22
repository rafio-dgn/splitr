# Observability

No paid Analytics Engine. Everything is structured `console.log`, which
`"observability": { "enabled": true }` surfaces in `wrangler tail` and the
dashboard. That constraint is the design.

## Log line shape

```ts
console.log("[scope:operation] phase", { structuredFields });
```

- **Message string:** bracketed scope, then a short phase. Greppable.
- **Second argument:** an object, never interpolation. Keeps fields queryable.

Scopes observed in the reference project:

```
[session:create] [session:get] [session:destroy]
[password:hash] [password:verify]
[authz:assertAdmin] [authz:assertSelfOrAdmin]
[login:fn] [register:fn] [logout:fn]
[txService:create]
[DO:UserLedger:createTransaction] [DO:UserLedger:categorize] [DO:UserLedger:alarm]
[ledgerWorker:fetch] [ledgerWorker:scheduled]
[aiWorker:fetch] [aiWorker:categorize]
[consumer:queue]
[workflow:StatementWorkflow] [workflow:aggregate] [workflow:upload-to-r2]
[dailyJob] [dailyJob:aggregate] [dailyJob:backfill]
[api:receipts:GET] [admin:requireAdmin]
```

Extend the pattern for new modules; do not invent a second format.

## What to log

**Always:**
- Entry and exit of any operation crossing a boundary (DB, binding, external fetch).
- Every authorisation decision — allow *and* deny, with actor and target.
- Cache hit/miss on read-through paths (`KV HIT` / `KV miss, falling back to D1`).
- Durations, as `durationMs`, around anything that can be slow.
- Non-fatal failures on degradable paths, explicitly marked `(non-fatal)`.

**Never:**
- Secrets, tokens, password hashes, full session ids.
- Whole request or row bodies.

Use previews for correlation without disclosure:
```ts
const preview = (s: string) => s.slice(0, 8);
console.log("[session:get] start", { sidPreview: preview(sessionId) });
```

## Timing

```ts
const t0 = Date.now();
await work();
console.log("[scope:op] done", { durationMs: Date.now() - t0 });
```

Time each external call separately — the point is to see *which* hop was slow.

## The `[AUDIT]` convention

Business-significant events get a distinct prefix so they can be extracted from
the general log stream:

```ts
console.log("[AUDIT] transaction.created", {
  transactionId, userId, type, amountCents, category,
  balanceAfterCents, hasReceipt, durationMs,
});
```

Events currently emitted:

| Event | Where |
|---|---|
| `transaction.created` | DO, after a successful write |
| `daily_job.run` | DO worker, after the nightly job |
| `notification.sent` | Consumer worker, per queue message |
| `monthly_statement.generated` | Workflow, final step |

Rules for `[AUDIT]` lines:
- Emit **after** the operation is durable, never before.
- Name events `noun.verb-past-tense`, dot-separated.
- Include the actor, the subject, and the outcome.
- Never include secrets or PII beyond an identifier.
- **Adding a new business operation means adding a new `[AUDIT]` event.** Treat it
  as part of the work, not a follow-up.

## Boolean and derived fields

Log `hasReceipt: !!key`, not the key. Log `emailFound: !!user`, not the email.
Enough to debug, nothing to leak.

## Relationship to the wiki logs

Three different records — do not conflate them:

| Record | Audience | Lifetime |
|---|---|---|
| `[AUDIT]` log lines | Runtime — what the system did | Log retention |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Humans — what we changed | Forever |
| [`../AI-AUDIT.md`](../AI-AUDIT.md) | Humans — what an AI did and why | Forever |
