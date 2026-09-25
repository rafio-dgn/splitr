# ADR-0023: The GroupLedger Durable Object arbitrates settlements; D1 stays the truth

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Raffaele, in structured questions on 2026-09-25. The AI proposed the options and the mechanism.
- **Requirement:** `REQ-E.1`, `REQ-E.2`, `REQ-E.3`, `REQ-E.5`, `REQ-P.3`, `REQ-M.8`
- **Resolves:** E.1's open question (own or arbitrate), and ADR-0018's follow-on question (which writes go through it)

## Context

Fixed by the course: one DO per owning entity via `idFromName`; it validates
pre-conditions, writes to D1 and returns the result; it runs in its own Worker,
reached by a **service binding** with `workers_dev: false`; there's an
`idempotencyKey` **header** with the response cached 24 hours and replayed
byte-for-byte, and alarm-based cleanup; and `[AUDIT]` after the durable write.

The owning entity is **the group** (the brief: `idFromName(groupId)`), because
what's fought over is the group's balances. Every settlement is judged
against every member's net.

The "before" already exists: two concurrent settlements of one £40 debt were
both accepted by the naive D1 path
([evidence](../evidence/REQ-E.1-double-settle-without-the-do.md)).

## Decisions (Raffaele's)

1. **Arbitrate; D1 stays the truth.** The DO holds no balance. Per settlement
   it reads the balances fresh from D1, runs the **same pure, tested
   `checkSettlement`** rule, writes D1 and returns. There's one source of
   truth and nothing to keep in sync. *Rejected:* owning the balance (two
   truths, and every balance-changing write would be forced through the DO),
   and a cached balance (the same constraint, without the durability).
2. **Settlements go through the DO now; voids and leaving will too when
   built.** The contested write is settlement against settlement, which the
   DO fully closes. An expense racing a settlement can't corrupt the ledger,
   because both are real events and recorded truthfully. Voids and leaving
   *reduce* what's owed, so they must be arbitrated whenever they exist.
   *Rejected:* every write (the whole expense path moved for a race that can't
   corrupt anything), and settlements forever (a known trap left in).
3. **The idempotency key is minted when the settle form renders**, as a
   hidden field. A double-click, a retry, or a re-submit of the same form
   share the key and replay the cached result; a fresh page is a fresh intent.
   curl callers send their own `idempotencyKey` header. *Rejected:* a key per
   click, and a key for API callers only.
4. **Demo: the "before" is recorded, the "after" is live.** No switch in the
   product can reintroduce the bug. *Rejected:* a live toggle, and a
   local-only replay.

## Mechanism

- **Worker `splitr-ledger`** (`workers/group-ledger/`): `workers_dev: false`,
  `preview_urls: false`. It exports a `WorkerEntrypoint` (`LedgerService`)
  with an RPC method `settle()`, which the app reaches through a **service
  binding** (`REQ-M.8`: never public HTTP), and the `GroupLedger` DO class,
  **SQLite-backed** (the storage backend available on the Free plan).
- **The critical section is explicit.** A DO runs one event at a time, *but
  awaiting outbound I/O (a D1 query) lets the next event in.* So the read
  balances → check → write settlement sequence runs inside
  **`ctx.blockConcurrencyWhile()`**, which admits nothing else until it
  finishes. The concurrency evidence must show that this, not luck, is what
  refuses the second writer.
- **Idempotency:** `idem:<key>` in the DO's storage holds `{ body, expiresAt }`,
  where `body` is the **exact JSON string** returned, so a replay is
  byte-for-byte and does no D1 read and no write. It's checked *inside* the
  critical section, so two simultaneous requests with the same key can't both
  miss the cache. A DO **alarm** fires at the earliest expiry, deletes
  expired entries, and reschedules itself.
- **Split of responsibilities:** the app still authenticates, parses, and
  checks membership and "recorder is a party" (ADR-0018 §8). The DO checks the
  **ledger pre-condition** (ADR-0018 §2) and writes. Rules live once, in
  `src/lib/settlements/rules.ts` and `src/lib/expenses/balances.ts`, which
  both Workers import.
- **`[AUDIT]`:** the DO emits the settlement line after D1 confirms the insert
  (`REQ-E.3`), and a replay is audited as `replayed`, never as a second
  `accepted`.

## Consequences

- E.2's "after" becomes: the same two concurrent requests give **one 201 and
  one 409 `already-settled`**, every round.
- **The DO's ordering is per group,** so settlements in different groups never
  wait on each other.
- **Voiding and leaving, when built, must call the DO**; that's in the
  backlog. Adding an expense stays a direct D1 write, by decision 2.
- ADR-0012's Cluster E test plan applies: the invariants (one winner, replay,
  refusal) are tested against a real DO, not a mock.

## Verification

Done on 2026-09-25, locally and on production. Details are in
[`../evidence/REQ-E.1-group-ledger-refuses-the-double-settlement.md`](../evidence/REQ-E.1-group-ledger-refuses-the-double-settlement.md).

- **Production:** exactly one winner in 5 of 5 concurrent rounds, and D1
  holds £200 for five £40 debts (it was £280 without the DO). The loser was
  named correctly in both directions. The idempotent replay was
  byte-identical, with one row.
- **workerd tests** (`npm run test:ledger`, 6 tests): the 30-way race fails
  6/6 **with the lock removed** and passes with it, so the critical section is
  proved necessary, not assumed. Also tested: the replay, the double-click,
  over-payment, and alarm eviction.
- **`splitr-ledger`** is unreachable publicly (Cloudflare 1042).

