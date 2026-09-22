# Data access — Drizzle ORM on D1

## Client

```ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  return drizzle(getCfEnv().edgeledger_db, { schema });
}
export type Db = ReturnType<typeof getDb>;
```

Per-request, never a module-level singleton — the binding comes from request
context. Server-only.

## Schema

`src/db/schema.ts` is the single definition. Four tables:

```ts
users         id(pk) · email(unique) · password_hash · role(enum admin|user) · created_at
transactions  id(pk) · user_id(fk) · type(enum deposit|withdraw|transfer)
              · amount_cents · description? · category? · receipt_r2_key? · created_at
              indexes: user_id, created_at
sessions      id(pk) · user_id(fk) · expires_at
daily_summary id(pk = `${userId}_${date}`) · user_id(fk) · date(YYYY-MM-DD)
              · deposit_cents · withdraw_cents · transfer_cents · tx_count · computed_at
              indexes: user_id, date
```

Conventions that matter:

- **Money is `integer` cents.** Never a float. Formatting happens in `lib/format.ts`,
  never in the query.
- **Timestamps are `integer` unix seconds**, written as `Math.floor(Date.now() / 1000)`.
  Not ISO strings, not milliseconds. The one exception is `daily_summary.date`, a
  `YYYY-MM-DD` text column used as a grouping key.
- **`text` enums propagate into the inferred type**, so `role` is
  `"admin" | "user"` at every call site with no casting.
- **Deterministic composite ids** (`${userId}_${date}`) make upserts idempotent —
  this is what lets the nightly cron re-run safely.
- Index anything you filter or sort by. `transactions` is indexed on both
  `user_id` and `created_at` because the list view filters by one and orders by
  the other.

## Query style

```ts
// .get() for one row, .all() for many
const user = await db.select({ id: users.id, role: users.role })
  .from(users).where(eq(users.email, email)).get();

// Aggregate with sql<T> when you need SQL Drizzle does not model
const rows = await db.select({ type: transactions.type, total: sql<number>`SUM(${transactions.amountCents})` })
  .from(transactions).where(eq(transactions.userId, userId))
  .groupBy(transactions.type).all();

// Join
.from(sessions).innerJoin(users, eq(users.id, sessions.userId))
```

**Always project explicitly** (`select({ … })`), never bare `select()`. It keeps
the password hash out of result types by construction.

## When to drop to raw D1

Backend workers (`edgeledger-transaction-do`, `edgeledger-workflow`) use raw
prepared statements and carry no Drizzle dependency. Justified when a worker runs
a small fixed set of statements — the ORM earns nothing and costs bundle size.

Use raw SQL for upserts, which Drizzle's D1 dialect expresses awkwardly:

```sql
INSERT INTO daily_summary (id, user_id, date, …) VALUES (?, ?, ?, …)
ON CONFLICT (id) DO UPDATE SET
  deposit_cents = excluded.deposit_cents,
  computed_at   = excluded.computed_at
```

Always `.bind()` parameters. No string interpolation, ever.

## Migrations

```bash
npx drizzle-kit generate            # schema.ts → drizzle/migrations/NNNN_name.sql
wrangler d1 migrations apply edgeledger-db --remote
```

Config in `drizzle.config.ts`. Migrations are append-only — never edit an applied
file; generate a new one. Existing files in the reference project:

- `0000_swift_skullbuster.sql` — initial schema
- `0001_add_daily_summary.sql` — the cron aggregation table

## Seeding

`scripts/generate-seed-transactions.mjs` emits `drizzle/seed-transactions.sql` and
`drizzle/seed-bulk.sql`. Bulk seed data matters here — pagination and the nightly
aggregation cannot be meaningfully tested against five rows.
