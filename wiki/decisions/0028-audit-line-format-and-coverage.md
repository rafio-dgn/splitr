# ADR-0028: The `[AUDIT]` line: exact field names, full coverage, and what isn't audited

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** AI, within `REQ-F.3`'s own wording. It's flagged to Raffaele
  for review: no product choice was involved.
- **Requirement:** `REQ-F.3` (`[MUST]`), `REQ-M.5`, and `REQ-F.6` Q2

## Context

`REQ-F.3` asks for an `[AUDIT]` JSON line on **every** mutation, carrying
**actor, action, target, timestamp, outcome**. Its notes say "the five named
fields are exact; use them as the field names." It also asks that
`wrangler tail | grep AUDIT` yields parseable output, and that every change to
a record is traceable from logs alone.

The F.4 inventory (every audit call against every file that writes data)
found:
- the timestamp field was named **`ts`** (unix seconds);
- **Better Auth's writes** (sign-up, sign-in, sign-out) weren't audited at all;
- search indexing, the cron's successful writes and a receipt delete weren't
  audited;
- `expense.add` recorded counts, not **who paid and each share**, and
  categorisation didn't record **which** label each item got. From logs
  alone, neither balances nor labels could be rebuilt.

## Decisions

1. **`timestamp`, ISO 8601 UTC with milliseconds** (for example
   `2026-09-28T10:48:00.828Z`), replacing `ts`. The five required fields come
   first, in `REQ-F.3`'s order. One shared, tested `formatAudit()` builds the
   line; it's never hand-rolled.
2. **Better Auth is audited through its own `databaseHooks.*.after`**
   (`auth.user.*`, `auth.session.*`, `auth.account.*`). Nothing of the auth
   itself is reimplemented (`REQ-B.5`). They log ids only, and a session only
   as an 8-character preview.
3. **`detail` must make the change reconstructible**:
   - who paid and each share, for an expense;
   - from, to and amount, for a settlement;
   - `item=label`, for a categorisation;
   - the pairs and amounts, for a reminder refresh.
4. **Deliberately not audited:** rebuildable caches that aren't records, namely
   the KV autofill list and the GroupLedger's idempotency cache. Search vectors
   are audited by the caller that owns the operation (`expense.index`,
   `expense.reindex`), not by `splitr-ai`. Operator actions through `wrangler`
   (test cleanup, migrations) happen outside the app and aren't in its logs.

*Rejected:*
- keeping `ts`: the requirement names the field;
- a timestamp in unix seconds: it's less readable in a live tail, and ISO
  still sorts as text;
- a custom wrapper around Better Auth's routes: it would duplicate auth logic
  and break `REQ-B.5`;
- auditing cache writes: noise, with no record to trace.

## Consequences

- Anything that parsed `ts` would break. Nothing did: the verification scripts
  never read it.
- `.claude/skills/audit-log` was out of date: it showed a hand-rolled line,
  past-tense names, and no coverage rules. It's updated to match the code.

## Verification

- `src/lib/audit.test.ts`: the exact field names in order, parseable even
  with quotes, newlines and emoji, and no `ts`.
- The inventory was rerun: only the deliberate exceptions above remain.
- Locally, `scripts/verify/audit-tail.mjs --from-file` over `next dev` plus
  the ledger's logs after `smoke.mjs`: **14/14 lines parseable with all five
  fields**, and the smoke group's history rebuilt from the logs alone
  ([evidence](../evidence/REQ-F.3-audit-json.md)).
- Production (`wrangler tail`) is Raffaele's to run.
