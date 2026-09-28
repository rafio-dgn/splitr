# `REQ-F.3`: structured `[AUDIT]` JSON on every mutation

**Date:** 2026-09-28 · **Decision:** [ADR-0028](../decisions/0028-audit-line-format-and-coverage.md)
**Verified:** locally (`next dev` plus the ledger's logs). **Production (`wrangler tail`):** Raffaele's, after the merge.

---

## One line

```
[AUDIT] {"actor":"WdEz…","action":"expense.add","target":"exp_2373…","timestamp":"2026-09-28T10:49:12.854Z","outcome":"accepted","persisted":true,
         "detail":{"group":"grp_006c…","amountMinorUnits":8000,"currency":"GBP","participants":2,"lineItems":0,
                   "paidBy":"WdEz…","shares":"pQPG…:4000,WdEz…:4000","spentOn":"2026-09-28"}}
```

## Coverage (the F.4 inventory)

Every file that writes data, set against its audit calls. The actions:
- **auth:** `auth.user.create`/`update`/`delete`, `auth.session.create`/`delete`,
  `auth.account.create`/`update`/`delete`;
- **groups:** `group.create`, `group.join`;
- **expenses:** `expense.add`, `expense.index`, `expense.reindex`;
- **settlements:** `settlement.record` (accepted, refused and replayed);
- **categories:** `line_item.categorise`;
- **receipts:** `receipt.upload-url`, `receipt.read`, `receipt.delete`;
- **the cron:** `reminder.refresh`, `cron.sweep`.

Deliberately not audited (ADR-0028 §4): the KV autofill cache, the ledger's
idempotency cache, and operator actions through `wrangler`.

## The check, locally

```
$ node scripts/verify/smoke.mjs http://localhost:3100 > smoke.out   # real mutations
$ node scripts/verify/audit-tail.mjs --from-file combined.log --smoke-out smoke.out

$ wrangler tail … | grep AUDIT   → 14 line(s)
  [AUDIT] {"actor":"4pfx…","action":"auth.user.create","target":"4pfx…","timestamp":"2026-09-28T10:48:00.828Z","outcome":"accepted","persisted":true
  [AUDIT] {"actor":"4pfx…","action":"auth.account.create",…
  [AUDIT] {"actor":"4pfx…","action":"auth.session.create",…
parseable, with all five fields: 14/14

the smoke group's history, from the logs alone (8 entries):
  10:48:02.285Z  expense.add        accepted                 target=exp_7733…  {"amountMinorUnits":8000,…}
  10:48:04.187Z  expense.index      accepted                 target=exp_7733…  {"vectors":1,…}
  10:48:04.826Z  settlement.record  accepted                 target=stl_57f6…  {"from":"4pfx…","to":"ybo…",…}
  10:48:04.837Z  settlement.record  refused:payer-not-owing  target=grp_2090…  {"arbiter":"GroupLedger"}
  10:48:05.670Z  expense.add        accepted                 target=exp_7b4d…  {"amountMinorUnits":2000,…}
  10:48:06.624Z  expense.index      accepted                 target=exp_7b4d…
  10:48:06.680Z  settlement.record  accepted                 target=stl_5713…
  10:48:06.731Z  settlement.record  replayed                 target=grp_2090…
audit-tail passed
```

That's the whole smoke run from logs alone: two expenses, both indexed, the
race's winner and refused loser, and the idempotent replay. (The group itself
was inserted by the test with `wrangler d1`, an operator action, so it has no
`group.create` line.)

**Found while reading it:** `expense.add` had only counts, so it now carries
`paidBy`, `shares` and `spentOn`, and `group.create` carries the name.

## On production (Raffaele, after the merge)

```
node scripts/verify/audit-tail.mjs https://splitr.raffaele-digennaro.workers.dev
```

It runs `wrangler tail splitr` and `wrangler tail splitr-ledger`, then smoke,
then the same checks on what the tails printed.

## Production (2026-09-28, Raffaele): `wrangler tail | grep AUDIT` on the live Workers

```
$ node scripts/verify/audit-tail.mjs https://splitr.raffaele-digennaro.workers.dev
tailing splitr and splitr-ledger, then running smoke against https://splitr.raffaele-digennaro.workers.dev…
  smoke │ smoke passed   (all 15 checks ✔)

$ wrangler tail … | grep AUDIT   → 14 line(s)
  (log) [AUDIT] {"actor":"twLm…","action":"auth.user.create","target":"twLm…","timestamp":"2026-09-28T11:09:15.275Z","outcome":"accepted","persisted…
  (log) [AUDIT] {"actor":"twLm…","action":"auth.account.create","target":"8rWP…","timestamp":"2026-09-28T11:09:15.275Z",…
  (log) [AUDIT] {"actor":"twLm…","action":"auth.session.create","target":"session:1M52qEeq","timestamp":"2026-09-28T11:09:15.275Z","outcome":"accepted","persisted":true}
  … 10 more

parseable, with all five fields: 14/14

the smoke group's history, from the logs alone (8 entries):
  11:09:16.897Z  expense.add        accepted                 target=exp_97b0…  {"amountMinorUnits":8000,…}
  11:09:17.553Z  settlement.record  accepted                 target=stl_bd7a…  {"from":"twLm…","to":"pezf…",…}
  11:09:18.198Z  settlement.record  refused:payer-not-owing  target=grp_a679…  {"arbiter":"GroupLedger"}
  11:09:18.242Z  expense.index      accepted                 target=exp_97b0…  {"vectors":1,…}
  11:09:19.211Z  expense.add        accepted                 target=exp_ffd9…  {"amountMinorUnits":2000,…}
  11:09:19.521Z  settlement.record  accepted                 target=stl_7138…
  11:09:19.739Z  settlement.record  replayed                 target=grp_a679…
  11:09:20.054Z  expense.index      accepted                 target=exp_ffd9…

audit-tail passed
```

- **Every criterion is met on production.** The literal `wrangler tail | grep
  AUDIT` output parses, every line carries the five fields, and the smoke
  group's history (both expenses, the race's winner and **refused loser**, and
  the idempotent replay) is rebuilt from the logs alone.
- **The order shows `REQ-M.7` at work:** each `expense.index` lands *after* the
  requests that followed its save. The indexing ran in `waitUntil`, off the
  request path.
- The session target is logged as a preview (`session:1M52qEeq`), as the rule
  requires.

