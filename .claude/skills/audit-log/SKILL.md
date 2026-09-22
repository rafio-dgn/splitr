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

```ts
console.log("[AUDIT] settlement.created", {
  actor: session.userId,      // who did it
  action: "settlement.created", // what happened
  target: settlementId,        // what it happened to
  timestamp: Math.floor(Date.now() / 1000),
  outcome: "success",          // success | refused | failed
  // context worth having later:
  groupId, amountCents, balanceAfterCents,
});
```

`REQ-F.3` names the five fields exactly: **actor, action, target, timestamp,
outcome.** Use those names.

## Rules that matter

- **Emit after the write is durable**, never before. An audit line for a write
  that then failed is worse than no line.
- **Parseable JSON.** `wrangler tail | grep AUDIT` must yield machine-readable
  output (`REQ-F.3`). Pass an object as the second argument — never build the
  line by string interpolation.
- **Name events `noun.verb-past-tense`**, dot-separated:
  `settlement.created`, `expense.added`, `group.joined`, `receipt.uploaded`.
- **Log refusals too.** The contested write's whole point is that the second
  settlement is refused — that refusal is the most interesting audit line in the
  system. `outcome: "refused"`.
- **Never log secrets, tokens or full session ids.** Use a preview
  (`sid.slice(0, 8)`) when you need to correlate.
- Log booleans, not payloads: `hasReceipt: !!key`, not the key.

## The acceptance test

`REQ-F.6` Q2 asks: *"Could you trace every change to a record from logs alone?"*

The answer must be **yes**, demonstrably. If you cannot reconstruct a record's
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
