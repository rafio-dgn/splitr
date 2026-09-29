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

## A record's whole history, from its creation (2026-09-29, REQ-F.6 Q2)

**Why this was added.** Smoke creates its group straight in D1: on
production, a script can't get a second member past Turnstile. So the smoke
history above starts at `expense.add`, not at the group's creation (ADR-0028
§4: changes made around the app aren't in its logs). `audit-tail.mjs` now also
creates a group **through the app's own "New group" form**, in a browser, and
adds an expense with one item. That group's history must start at
`group.create`, or the run fails.

**Local rehearsal** (`AUDIT_LOCAL_LOGS` reading `next dev`'s and the ledger's
logs in place of `wrangler tail`):

```
parseable, with all five fields: 21/21
the smoke group's history, from the logs alone (8 entries): … (as above: both expenses, the race's winner and refused loser, the replay)

a group created through the app, its history from the logs alone (4 entries):
  07:47:02.614Z  group.create           accepted  target=grp_a54a…  {"name":"Trace trace-mumdi7q4-6a5165","currency":"GBP"}
  07:47:03.102Z  expense.add            accepted  target=exp_47ee…  {"group":"grp_a54a…","amountMinorUnits":600,…}
  07:47:07.537Z  expense.index          accepted  target=exp_47ee…  {"group":"grp_a54a…","vectors":1,…}
  07:47:07.542Z  line_item.categorise   accepted  target=exp_47ee…  {"group":"grp_a54a…","model":"8b","ms":2278,"items":1,"categorised":1,…}
  ✔ it starts at group.create: every change, from the record's creation
audit-tail passed
```

**On production (Raffaele, after the merge):**

```
node scripts/verify/audit-tail.mjs https://splitr.raffaele-digennaro.workers.dev
```

Raffaele's run, 2026-09-29:

```
  smoke │ smoke passed   (all 15 checks ✔)
  trace │ a group created through the "New group" form (grp_f9c1053f…), then an expense with one item → 201
cleanup: done, D1 re-checked (0 rows left)

$ wrangler tail … | grep AUDIT   → 21 line(s)
parseable, with all five fields: 21/21

the smoke group's history, from the logs alone (8 entries):
  08:12:55.283Z  expense.add            accepted                   target=exp_66d8…
  08:12:56.509Z  settlement.record      accepted                   target=stl_57a2…
  08:12:56.524Z  settlement.record      refused:payer-not-owing    target=grp_a838…  {"arbiter":"GroupLedger"}
  08:12:56.911Z  expense.index          accepted                   target=exp_66d8…
  08:12:57.605Z  expense.add            accepted                   target=exp_0f73…
  08:12:57.909Z  settlement.record      accepted                   target=stl_1aab…
  08:12:58.338Z  expense.index          accepted                   target=exp_0f73…
  08:12:58.824Z  settlement.record      replayed                   target=grp_a838…

a group created through the app, its history from the logs alone (4 entries):
  08:13:10.200Z  group.create           accepted  target=grp_f9c1…  {"name":"Trace trace-mumefrmm-1c3f1f","currency":"GBP"}
  08:13:11.145Z  expense.add            accepted  target=exp_3ac9…  {"group":"grp_f9c1…","amountMinorUnits":600,…}
  08:13:12.063Z  expense.index          accepted  target=exp_3ac9…  {"group":"grp_f9c1…","vectors":1,…}
  08:13:12.484Z  line_item.categorise   accepted  target=exp_3ac9…  {"group":"grp_f9c1…","model":"8b","ms":1165,"items":1,"categorised":1,…}
  ✔ it starts at group.create: every change, from the record's creation

audit-tail passed
```

**`REQ-F.6` Q2's demonstration is met on production:** a record's whole
history, from its creation, is rebuilt from the logs alone.

