# `REQ-E.6`: the nightly sweep, run twice, identical

**Date:** 2026-09-28 · **Decision:** [ADR-0026](../decisions/0026-nightly-cron-worker.md) · **Worker:** `splitr-cron` (cron `30 2 * * *`)
**Verified:** locally (the local D1, plus `splitr-ai` under `wrangler dev`). **Production run:** Raffaele's, after the merge (the commands are below).

---

## The criteria

| Criterion | Met by |
|---|---|
| A `scheduled()` handler on a cron trigger | `workers/cron/src/index.ts`, `"triggers": { "crons": ["30 2 * * *"] }` |
| Writes use UPSERT-on-conflict | `INSERT INTO reminder … ON CONFLICT (group_id, debtor_id, creditor_id) DO UPDATE …`, and `INSERT INTO expense_indexed … ON CONFLICT (expense_id) DO NOTHING` |
| **Run twice, results identical** | Below: the snapshot after run 2 is byte-identical to the one after run 1 |
| A manual trigger | `npm run cron:run` (`-- --remote` for production): `wrangler dev --test-scheduled`, then `/__scheduled`, with no public endpoint (ADR-0026 §4) |

## The double run (`scripts/verify/cron-twice.mjs`)

It sets up a real debt (Bob pays £80 for both), then **simulates the two
failures the cron exists for**: a line item reset to `uncategorised`, and the
expense's `expense_indexed` row removed.

```
$ node scripts/verify/cron-twice.mjs http://localhost:3100
  ✔ expense with a line item → 201
  · simulated: the item is uncategorised, and the expense is unindexed
  · run 1: {"today":"2026-09-28","groups":1,"reminderPairs":1,"groupsFailed":0,"backfill":{"items":1,"expenses":1},"reindex":{"tried":1,"indexed":1}}
  ✔ run 1 wrote the reminder: Alice owes Bob £40
  ✔ run 1 backfilled the category (groceries)
  ✔ run 1 re-indexed the expense
  · run 2: {"today":"2026-09-28","groups":1,"reminderPairs":1,"groupsFailed":0,"backfill":{"items":0,"expenses":0},"reindex":{"tried":0,"indexed":0}}
  ✔ run 2 left the group's data byte-identical
  · the snapshot both times: {"reminders":[{…,"amount_cents":4000,"currency":"GBP","owed_since":"2026-09-28","checked_on":"2026-09-28"}],"items":[{…,"category":"groceries"}],"indexed":[…2 expenses…]}
cron-twice passed
```

**Why it's identical:**
- The keys are deterministic: `(group, debtor, creditor)`, from the
  deterministic `suggestTransfers`.
- The only columns that change over time are **dates** (`owed_since`,
  `checked_on`), not timestamps.
- The backfill and the re-index select only what's still missing.

Run 2's summary shows it: **no AI work at all**.

## The in-app reminder (ADR-0026 §2), in a real browser

```
fresh reminder (< 3 days), groups page shows banner: false
4-day-old reminder, /groups: You've owed Bob Banner £40.00 since 24 Sept in Banner flat.
4-day-old reminder, group page: You've owed Bob Banner £40.00 since 24 Sept.
settled → 201
after settling, BEFORE the next cron, banner still on /groups: false
reminder row still stored (the cron removes it tonight): 1
```

(`owed_since` was backdated by 4 days in the test, because three days can't be
waited out.) **The banner is checked against the live balances**, so a debt
paid at noon stops being nagged about at once, not at 02:30.

## Tests (`node --test`)

- `suggestTransfers` (5): every member's transfers sum to exactly their
  balance, and the result is deterministic whatever the input order.
- `sweep` (6), against an in-memory store with the real SQL semantics:
  - same-day rerun identical, with no second round of AI calls;
  - `owed_since` kept across days, a settled pair deleted;
  - one failing group doesn't stop the others;
  - with no AI secret, reminders still run.
- `liveReminders` (4).

## On production (after the merge)

```
npx wrangler secret put AI_SHARED_SECRET -c workers/cron/wrangler.jsonc    # the same value as the app's
node scripts/verify/cron-twice.mjs https://splitr.raffaele-digennaro.workers.dev
```

## Production, run 1 (2026-09-28, Raffaele): a manual-trigger bug, found

```
  · run 1: {"today":"2026-09-28","groups":1,"reminderPairs":1,"groupsFailed":0,"backfill":{"items":1,"expenses":1},"reindex":{"tried":1,"indexed":0}}
  ✔ run 1 wrote the reminder: Alice owes Bob £40
✘ run 1 backfilled the category (uncategorised)
```

The reminder UPSERT worked on production. Both AI jobs were *attempted* (so
a secret was present) and refused. Cause, from wrangler 4.140's source
(`getVarsForDev`): `wrangler dev --remote` loads `workers/cron/.dev.vars`,
which is the **local** dev secret. **The check caught it,** and cleanup still
left nothing behind. The fix is in ADR-0026 §4. Verified locally:

```
wrong secret via --env-file: { categorise: 'rejected:refused' }
right secret via --env-file: { categorise: 'accepted' }
category now: [{'category': 'groceries'}]
```

## Production, after the fix (2026-09-28, Raffaele): run twice, identical

```
$ node scripts/verify/cron-twice.mjs https://splitr.raffaele-digennaro.workers.dev
cron-twice cron-mul3gsa4-9b90fc → https://splitr.raffaele-digennaro.workers.dev (the sweep runs on PRODUCTION)
  ✔ sign-up alice.cron-mul3gsa4-9b90fc@example.test → 200
  ✔ sign-up bob.cron-mul3gsa4-9b90fc@example.test → 200
  ✔ expense with a line item → 201
  ✔ expense "Cron taxi" £0.02 → 201
  · simulated: the item is uncategorised, and the expense is unindexed
  · run 1: {"today":"2026-09-28","groups":1,"reminderPairs":1,"groupsFailed":0,"backfill":{"items":1,"expenses":1},"reindex":{"tried":1,"indexed":1}}
  ✔ run 1 wrote the reminder: Alice owes Bob £40
  ✔ run 1 backfilled the category (groceries)
  ✔ run 1 re-indexed the expense
  · run 2: {"today":"2026-09-28","groups":1,"reminderPairs":1,"groupsFailed":0,"backfill":{"items":0,"expenses":0},"reindex":{"tried":0,"indexed":0}}
  ✔ run 2 left the group's data byte-identical
  · the snapshot both times: {"reminders":[{"debtor_id":"MP2G…","creditor_id":"9NXT…","amount_cents":4000,"currency":"GBP","owed_since":"2026-09-28","checked_on":"2026-09-28"}],"items":[{"id":"li_9f2d…","category":"groceries"}],"indexed":[{"expense_id":"exp_1573…"},{"expense_id":"exp_5b6f…"}]}
cleanup: 2 user(s), 1 group(s), 2 expense(s), 3 vector id(s), 0 receipt(s)
cleanup: done, D1 re-checked (0 rows left)

cron-twice passed
```

**Every `REQ-E.6` criterion is met, on production.** It's the real
`splitr-cron` code with the real bindings, triggered by hand with no public
endpoint. Run 1 repaired everything, and run 2 found nothing to do and changed
nothing.

