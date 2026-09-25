# `REQ-E.1`/`REQ-E.2`: the GroupLedger Durable Object refuses the double settlement ("after")

**Date:** 2026-09-25 · **Workers:** `splitr-ledger` (version `134160f5`), `splitr` (version `3d4f7f18`)
**Decision:** [ADR-0023](../decisions/0023-group-ledger-arbitrates-settlements.md) · **"Before":** [the naive path, both accepted](./REQ-E.1-double-settle-without-the-do.md)

---

## The same race, before and after

The protocol is identical in both runs: Bob pays £80, split two ways, so
Alice owes £40. Then Alice's and Bob's sessions both send "Alice paid Bob
£40" at the same instant, through `POST /api/groups/:id/settlements`.

| | Before: naive check-then-write (2026-09-24) | **After: GroupLedger DO, production (2026-09-25)** |
|---|---|---|
| Round 1 | 201 **and** 201 | **201 + 409** |
| Round 2 | 409 + 409 (corrupted: Alice overpaid) | **201 + 409** |
| Round 3 | 201 **and** 201 | **201 + 409** |
| Round 4 | 409 + 409 | **409 + 201** |
| Round 5 | 201 **and** 201 | **201 + 409** |
| D1 after five £40 debts | 7 settlements, **£280** | **5 settlements, £200** |

Production output:

```
round 1: Alice→ 201  Bob→ 409  | D1 n:1 t:4000  | loser told "Alice recorded it" ✔
round 2: Alice→ 201  Bob→ 409  | D1 n:2 t:8000  | loser told "Alice recorded it" ✔
round 3: Alice→ 201  Bob→ 409  | D1 n:3 t:12000 | loser told "Alice recorded it" ✔
round 4: Alice→ 409  Bob→ 201  | D1 n:4 t:16000 | loser told "Bob recorded it" ✔
round 5: Alice→ 201  Bob→ 409  | D1 n:5 t:20000 | loser told "Alice recorded it" ✔
```

The loser gets a **409 `already-settled`** that names who recorded the winning
payment. `screens-cluster-b.md` §6.3 makes that binding ("it names who won").

## Why it works, and the proof that it's the lock and not luck

The DO runs `read balances → checkSettlement → insert` inside
`ctx.blockConcurrencyWhile()`, because a Durable Object admits the next event
while it awaits outbound I/O such as a D1 query. Tested against a real DO in
workerd (`npm run test:ledger`), with the lock **removed**:

| Race size | Without the lock | With the lock |
|---|---|---|
| 2 concurrent | failed about 1 run in 12 | always 1 winner |
| 8 concurrent | passed 8/8 (no interleave seen) | always 1 winner |
| **30 concurrent** | **failed 6/6** | **passed 3/3** |

So the interleave is real but rare at small sizes. **The permanent test uses 30
concurrent requests**, so that deleting the lock makes it fail every time.

## Idempotency (`REQ-E.2`)

On production, with an `idempotencyKey` header:

```
first → 201 replayed=false · replay → 201 replayed=true · bodies identical: YES · D1 rows +1
```

The ledger's live log (`wrangler tail splitr-ledger`) for those two requests:

```
[AUDIT] {…"action":"settlement.record","target":"stl_8faa69d4…","outcome":"accepted","persisted":true,…}
[AUDIT] {…"action":"settlement.record","target":"grp_acc2e1f7…","outcome":"replayed","persisted":false}
```

Locally, the double-click case (two requests with the same key at the same
instant) gave both 201, one replayed, **byte-identical bodies, and one D1
row**. The cache lookup is inside the critical section. A new key after
payment gets a 409 `already-settled`.

**Cleanup:** the DO alarm fires at the earliest expiry, evicts expired entries
and re-arms. It's proved in the workerd test with `runDurableObjectAlarm`
(24 hours can't be waited out): the expired entry goes, the live one stays,
and the alarm re-arms for the live entry's expiry. The production entries
from this run are left for their own alarm to evict.

## Service binding and no public surface (`REQ-E.5`, `REQ-M.8`)

- The app reaches the ledger only through `LEDGER` (`splitr-ledger#LedgerService`),
  typed end to end (`Service<typeof LedgerService>`).
- `workers_dev: false`: `https://splitr-ledger.raffaele-digennaro.workers.dev`
  returns **`error code: 1042`**, from Cloudflare itself, before any Worker
  code runs.

## Bugs found on the way

1. **Exporting a constant from the Worker's main module** stopped workerd from
   starting ("not of type 'function or ExportedHandler'"). `tsc` can't see
   this.
2. **The loser was told the wrong winner.** Joining `user` twice produced two
   result columns both called `name`, and inside `db.batch` D1 returns rows as
   objects keyed by column name, so the recipient's name overwrote the
   recorder's. It's fixed by resolving names from the member list. Verified in
   both directions: Alice wins and Bob is told Alice; Bob wins and Alice is
   told Bob.
3. **A 2-way race test can't guard the lock**, as measured above. It's now
   30-way.

## Cost noticed: Worker size

The app is at 2,543 KiB gzipped (**about 83% of 3 MiB**), up 192 KiB. That was
bisected: the old code with today's dependencies measured 2,351 KiB, so the
cause is code. The settlements Route Handler's new dependency graph made
Turbopack bundle a **third full copy of Better Auth** (three 573 KiB route
chunks, where there used to be two). It's logged in the backlog with fixes.
