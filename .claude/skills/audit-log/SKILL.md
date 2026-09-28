---
name: audit-log
description: The [AUDIT] logging convention every Splitr mutation must follow. Use when writing any code path that creates, updates or deletes data, or when adding a new business operation. REQ-M.5 makes this mandatory from the first mutation.
user-invocable: true
allowed-tools: Read, Grep
---

## The rule

**Every mutation emits an `[AUDIT]` line.** `REQ-M.5`, stated in the course's
cross-cutting rules (§13) *and* in Cluster E (§8) *and* in Cluster F (§9).

It is **not** deferred to Cluster F. Cluster F is optional; this is not. It
applies from the first mutation you write.

## The shape

Use the shared helper. Never hand-roll the line:

```ts
import { audit } from "@/lib/audit"; // workers: "../../../src/lib/audit"

audit({
  actor: session.user.id,        // who did it (or "system:cron", "system:receipt-check")
  action: "settlement.record",   // what happened: noun.verb
  target: settlementId,          // what it happened to
  outcome: "accepted",           // accepted | refused:<reason> | rejected:<why> | error:<msg> | replayed
  persisted: true,               // did the durable write happen? (only after D1 confirmed)
  detail: { group, from, to, amountMinorUnits }, // what changed: enough to rebuild the record
});
```

`formatAudit()` in `src/lib/audit.ts` writes one line:
`[AUDIT] {"actor":…,"action":…,"target":…,"timestamp":"2026-09-28T10:48:00.828Z","outcome":…,"persisted":…,"detail":{…}}`.
`timestamp` is added for you (ISO 8601 UTC). `REQ-F.3` names the five fields
exactly: **actor, action, target, timestamp, outcome**, and those are the
names. (Until F.4 on 2026-09-28 the field was `ts`, in unix seconds. It's gone.)

## Rules that matter

- **Emit after the write is durable**, never before. An audit line for a write
  that then failed is worse than no line.
- **Parseable JSON.** `wrangler tail | grep AUDIT` must yield machine-readable
  output (`REQ-F.3`). Pass an object as the second argument — never build the
  line by string interpolation.
- **Name events `noun.verb`**, dot-separated, as the code has always done:
  `expense.add`, `settlement.record`, `group.join`, `receipt.delete`,
  `auth.session.create`. (This skill used to say past tense. The code never
  did, and consistency with the code wins.)
- **`detail` must make the change reconstructible**: who paid and each share
  for an expense, from/to/amount for a settlement, each item's label for a
  categorisation. That's what makes `REQ-F.6` Q2 answerable with "yes".
- **Log refusals too.** The contested write's whole point is that the second
  settlement is refused — that refusal is the most interesting audit line in the
  system. `outcome: "refused:payer-not-owing"`.
- **Never log secrets, tokens or full session ids.** Use a preview
  (`sid.slice(0, 8)`) when you need to correlate.
- Log booleans, not payloads: `hasReceipt: !!key`, not the key.

## Deliberately not audited

Rebuildable caches, not records: the KV autofill list
(`recent-descriptions.ts`) and the GroupLedger's idempotency cache (DO
storage). Search vectors are audited by the caller that owns the operation
(`expense.index`, `expense.reindex`), not by `splitr-ai`, which has no actor.

## The acceptance test

`REQ-F.6` Q2 asks: *"Could you trace every change to a record from logs alone?"*

The answer must be **yes**, demonstrably: `node scripts/verify/audit-tail.mjs
<BASE_URL>` tails the Workers, runs smoke, checks every `[AUDIT]` line parses
with the five fields, and prints the smoke group's history from the logs alone. If you cannot reconstruct a record's
full history from `wrangler tail | grep AUDIT`, the logging is incomplete.

## Adding a new operation

A new business operation means a new `[AUDIT]` event. Treat it as part of the
work, not a follow-up — this is the single easiest requirement to forget, and
the demo tests it directly.

## Not to be confused with

| Record | Purpose |
|---|---|
| `[AUDIT]` log lines | Runtime — what the system did |
| `wiki/CHANGELOG.md` | What *we* changed in the codebase |
| `wiki/AI-AUDIT.md` | What an AI did, and why |
