# D.3: groups, membership, expenses and settlements, written through D1

**Date:** 2026-09-24 · **Deployed version:** `6276cbc0` · **Build plan:** D.3 (under `REQ-D.1`)
**Proves:** the domain now persists; the Cluster B fixture is gone; `REQ-B.4`'s four
unrendered empty states render; the `[AUDIT]` line says `persisted: true` only
after D1 confirms the write.

---

## What changed

The Cluster B fixture was built to be swapped ("replace the body, not the
signature"), and it was. **No page changed its data contract.**
`getGroupForViewer` still returns `null` for both "not a member" and "no such
group" (404, never 403).

| Write | How it lands in D1 |
|---|---|
| Create a group | `group` plus the creator's `group_member`, in **one batch** (D1 runs it as one transaction) |
| Join via the invite link | a Server Action re-checks the *code*, never a client-supplied group id, then inserts `group_member` (a former member is reactivated) |
| Add an expense | `expense` plus every `expense_share`, in **one batch**, so an expense never exists without its shares |
| Settle up | `settlement` after `checkSettlement` (ADR-0018 §2). **Naive by design until E.1**, see [the race evidence](./REQ-E.1-double-settle-without-the-do.md) |

Balances come from **one** function, `getGroupBalances()`, which applies
ADR-0018's formula to members, non-voided expenses and settlements. Three pages
used to call `deriveBalances` themselves. Every read is `cache()`d per request,
which fixes finding O-3's double D1 read.

## A real browser, two sessions (Alice's and Bob's phones)

Puppeteer, with two isolated browser contexts (separate cookie jars). The same
run passed on local `next dev` (local D1) and on **production**:

```
✔ Alice signed up
✔ Alice created 'Flat 3B' → redirected to the real group: /groups/grp_d3ddfa0d…
✔ invite link: https://splitr.raffaele-digennaro.workers.dev/join/WLvEazsBw5
✔ Bob sees: Alice invited you to Flat 3B · 1 person is already splitting here
✔ Bob joined → landed on the group: /groups/grp_d3ddfa0d…?joined=1
✔ participant boxes (both should be ticked by default): [true,true]
✔ Bob added £80.00 → redirected: /groups/grp_d3ddfa0d…
✔ Alice's dashboard shows: You owe £40.00
✔ settle prefill on Alice's phone: Alice → Bob £40.00
✔ Alice records it: Settled: £40.00
✔ Bob's duplicate refused: Alice recorded a payment of £40.00 to Bob at …
✔ afterwards, settle page: Nothing to settle: everyone in Flat 3B is square.
```

**Bob's refusal is the *sequential* case.** He had the form open, Alice's
settlement landed first, and his submission found Alice's net at £0. The
*concurrent* case is different, and it isn't refused yet. That's the next
file.

The production test data was deleted afterwards (the group by id, and users by
`@example.test`). Production is back to 0 users, groups, expenses and
settlements.

## `REQ-B.4`: the four empty states that had never rendered

Rendered in a real browser against local D1, with a fresh user:

```
✔ RENDERED  No groups yet                          (/groups)
✔ RENDERED  It's just you in here so far           (/groups/grp_…/members)
✔ RENDERED  You're the only member of Solo trip    (/groups/grp_…/expenses/new)
✔ RENDERED  No line items                          (/groups/…/expenses/exp_…)
```

`REQ-B.4` is promoted back to Done on this evidence.

## `[AUDIT]` lines (`REQ-M.5`), from the local run

```
[AUDIT] {"ts":1790253366,"actor":"Gf50…","action":"group.create","target":"grp_c539…","outcome":"accepted","persisted":true}
[AUDIT] {"ts":1790253369,"actor":"1J2e…","action":"group.join","target":"grp_c539…","outcome":"accepted","persisted":true}
[AUDIT] {"ts":1790253371,"actor":"1J2e…","action":"expense.add","target":"exp_ff6b…","outcome":"accepted","persisted":true,"detail":{…}}
[AUDIT] {"ts":1790253374,"actor":"Gf50…","action":"settlement.record","target":"stl_c59b…","outcome":"accepted","persisted":true,"detail":{…}}
[AUDIT] {"ts":1790253374,"actor":"1J2e…","action":"settlement.record","target":"grp_c539…","outcome":"refused:payer-not-owing","persisted":false}
```

Every accepted write logs `persisted: true` only after D1 returned, and a
refusal logs its reason.

## Tests (ADR-0012), with `npm test`

`node --test`, with no dependencies (Node 24 runs the TypeScript directly).
11 tests, 11 pass:

- `equalShares` sums to the total for every amount from 1p to £10.00 across
  1–9 people.
- Balances sum to **zero** over 300 random runs of expenses plus
  settlements, and a settlement moves both sides to zero.
- `checkSettlement` accepts the owed amount and a partial one; it refuses the
  sequential duplicate, over-payment, paying someone not owed, and paying
  yourself.
- The amount parser's boundaries, and `formatGbp`/`describePosition`.

**Mutation check:** flipping the sign of a settlement in `deriveBalances`
makes 2 tests fail. Restored, 11 pass. The tests catch the bug they exist for.

## Worker size

2,329 KiB gzipped, up 202 KiB from `REQ-D.1`. That's **about 76% of the free
plan's 3 MiB**.
