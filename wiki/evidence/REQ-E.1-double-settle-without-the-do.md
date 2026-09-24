# `REQ-E.1` "before": the double settlement, reproduced without a Durable Object

**Date:** 2026-09-24 · **Where:** local `next dev` against local D1 · **Build plan:** the first half of E.2
**Proves:** that the naive check-then-write *does* double-count under
concurrency, so that E.1's Durable Object has something real to fix. The
course's own framing: *"Build the failure case first: show the double-settle
bug without the DO, then fix it with one."*

This half was captured early, at D.3, because the naive settlement path is what
D.3 built (Raffaele's sequencing, 2026-09-24). **The "after" half is still owed
at E.2.**

---

## The setup

- Alice and Bob are in one group, and Bob has paid £80 split between them, so
  **Alice owes Bob £40.00**.
- The same settlement, "Alice paid Bob £40.00", is sent twice **at the same
  moment**: once with Alice's session and once with Bob's. Both of them are
  allowed to record it (ADR-0018 §8), exactly as in the brief.
- Each request goes to `POST /api/groups/:id/settlements`, the Route Handler
  over the same `recordSettlement()` that the settle form calls.

```bash
BODY='{"fromUserId":"<alice>","toUserId":"<bob>","amount":"40.00"}'
curl -X POST …/settlements -H "Cookie: <alice>" -d "$BODY" &
curl -X POST …/settlements -H "Cookie: <bob>"   -d "$BODY" &
wait
```

Between rounds, Bob adds another £80 expense to reopen a £40 debt.

## The result

```
round 1: Alice→ 201  Bob→ 201   | settlements in D1: n:3 total:12000
round 2: Alice→ 409  Bob→ 409   | settlements in D1: n:3 total:12000
round 3: Alice→ 201  Bob→ 201   | settlements in D1: n:5 total:20000
round 4: Alice→ 409  Bob→ 409   | settlements in D1: n:5 total:20000
round 5: Alice→ 201  Bob→ 201   | settlements in D1: n:7 total:28000
```

**Round 1 is the bug.** Both requests read "Alice owes £40", both passed
`checkSettlement`, and both inserted. **One £40 debt, two £40 settlements.** D1
went from 1 settlement to 3 (the earlier one from the browser test, plus these
two).

Rounds 2 and 4 then refuse *both* requests, and that's the corruption showing
through. After a double settlement, Alice has overpaid: she's now *owed* £40.
Bob's next £80 only brings her back to £0, so "Alice pays Bob" is correctly
refused (`payer-not-owing`). The ledger is internally consistent and
factually wrong: it says Alice paid £80 for a £40 debt. **Nobody can tell
from the ledger which entry is spurious**, which is exactly the brief's
description of the failure.

## The same race, in the audit log

```
[AUDIT] {"ts":1790253399,"actor":"Gf50…","action":"settlement.record","target":"stl_91f1…","outcome":"accepted","persisted":true,…}
[AUDIT] {"ts":1790253399,"actor":"1J2e…","action":"settlement.record","target":"stl_1375…","outcome":"accepted","persisted":true,…}
```

Two accepted settlements of the same debt in the same second, by the two
parties. That's also an answer to `REQ-F.6` Q2: the logs alone show it.

## Why it happens, and what E.1 changes

`src/lib/settlements/record-settlement.ts` reads the balances, runs
`checkSettlement`, and then inserts. Nothing stops a second request from
running the same read in between. That gap is marked `RACE (REQ-E.1)` in the
code.

E.1 keeps **the same rule** (`checkSettlement` is pure and tested) and changes
*where it runs*. It moves into the group's Durable Object, which handles one
request at a time, so the second request's check sees the first request's
write. The expected "after" is 201 for one request and 409 `already-settled`
for the other, every round. Scope question for E.1 (ADR-0018): should expense
adds and voids also go through the DO, since they change the same balances?
