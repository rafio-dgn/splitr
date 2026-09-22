# Cloudflare data services

## D1 — SQLite at the edge

One database (`edgeledger-db`) shared by all six workers. Binding name
`edgeledger_db` everywhere; keep it identical across `wrangler.jsonc` files or
shared code breaks.

```jsonc
"d1_databases": [{
  "binding": "edgeledger_db",
  "database_name": "edgeledger-db",
  "database_id": "<uuid>",
  "remote": true          // frontends only — makes `wrangler dev` hit the real DB
}]
```

Two access styles coexist deliberately:

| Where | Style | Why |
|---|---|---|
| Frontend workers | Drizzle ORM | Typed queries, schema as code — see [`data-access-drizzle.md`](./data-access-drizzle.md) |
| Backend workers (DO, cron, workflow) | Raw `env.edgeledger_db.prepare(...)` | No Drizzle dependency in workers that only run a handful of fixed statements |

Raw D1 API:
```ts
await env.edgeledger_db.prepare("SELECT … WHERE user_id = ?").bind(userId).all<Row>();
await env.edgeledger_db.prepare("INSERT …").bind(...).run();
```
Always `.bind()`. Never interpolate into SQL.

Migrations live in `drizzle/migrations/` and apply with:
```bash
wrangler d1 migrations apply edgeledger-db --remote
```

**D1 has no interactive transactions across statements in the Workers API.** This
is precisely why writes are funnelled through a Durable Object — the DO provides
the serialisation that D1 does not.

## KV — session cache

```jsonc
"kv_namespaces": [{ "binding": "edgeledger_sessions", "id": "<id>", "remote": true }]
```

Read-through cache in front of D1, never the source of truth:

```
getSession():
  cookie → sessionId
  KV.get(sessionId)          → HIT  → return
                             → MISS → D1 join sessions×users
                                      → check expiry
                                      → re-warm KV with remaining TTL
```

- Writes go to D1 and KV in parallel (`Promise.all`).
- Deletes hit both, then clear the cookie.
- `expirationTtl` is set from the session's real remaining lifetime, so KV
  expires no later than D1 does.
- KV is **eventually consistent**. Never use it for anything where a stale read
  is a correctness bug (balances, authorisation decisions beyond session lookup).

## R2 — object storage

```jsonc
"r2_buckets": [{ "binding": "edgeledger_receipts", "bucket_name": "edgeledger-receipts", "remote": true }]
```

Two uses: transaction receipts, and generated monthly statements
(`statements/<userId>/<YYYY-MM>.txt`).

Reading back through an authenticated endpoint:
```ts
const object = await env.edgeledger_receipts.get(key);
if (!object) return new Response("Not found", { status: 404 });
const headers = new Headers();
object.writeHttpMetadata(headers);          // restores Content-Type etc.
headers.set("etag", object.httpEtag);
return new Response(object.body, { headers });  // streams, no buffering
```

The R2 key is stored on the transaction row (`receipt_r2_key`), and access is
authorised by looking up that row's owner — **not** by the key itself. S3-compatible
API, zero egress fees.

## Workers AI

```jsonc
"ai": { "binding": "AI" }
```

```ts
const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { prompt, max_tokens: 8 });
```

Isolated in its own worker (`edgeledger-ai`) so the DO worker, the cron backfill
and future callers all share one implementation.

Treat model output as **untrusted text**:
- Constrain the prompt to a closed set of categories.
- Match the response against that set; never store raw output.
- Fall back to a default (`"Other"`) when nothing matches.
- Skip the model entirely where the answer is deterministic — `deposit → "Income"`,
  `transfer → "Transfer"`, no description → `null`.
- Wrap in try/catch and return `null` on failure. **Categorisation is optional
  metadata; it must never fail a transaction.**

## Resource creation

None of these bind until the underlying resource exists:

```bash
wrangler d1 create edgeledger-db
wrangler kv namespace create edgeledger_sessions
wrangler r2 bucket create edgeledger-receipts
wrangler queues create edgeledger-events
wrangler queues create edgeledger-events-dlq      # DLQ is a separate queue
```

Then paste the returned ids into every `wrangler.jsonc` that binds them.
