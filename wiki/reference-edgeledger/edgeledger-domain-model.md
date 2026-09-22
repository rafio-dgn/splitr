> 🔒 **QUARANTINED — do not read until `REQ-X.6`.** This describes *EdgeLedger's*
> design, not ours. See [README](./README.md) and
> [ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md).

# Domain model — EdgeLedger

A bank-style transaction ledger. Users register, log in, record money movements,
and see a balance. Admins can inspect any user. A nightly job summarises activity;
a monthly pipeline renders statements.

## Entities

### User
`id` · `email` (unique) · `passwordHash` · `role` · `createdAt`

- `role` is `"admin" | "user"`, defaulting to `"user"`.
- Registration always creates a `"user"`. **There is no self-service path to
  admin** — promotion is out-of-band (direct D1 write). Preserve that.
- Email is lowercased and trimmed before storage and lookup, so it is
  case-insensitive in practice while the column stays a plain unique text.

### Transaction
`id` · `userId` · `type` · `amountCents` · `description?` · `category?` ·
`receiptR2Key?` · `createdAt`

- `type` is `"deposit" | "withdraw" | "transfer"`.
- `amountCents` is a **positive** integer. The sign lives in the `type`, never in
  the amount. This is load-bearing: every balance computation branches on type.
- `category` is AI-assigned, nullable, and **non-essential**. A failed
  categorisation must never fail the transaction.
- `receiptR2Key` points at an R2 object. Access to it is authorised through this
  row's `userId`, never through the key.

### Session
`id` · `userId` · `expiresAt`

- `id` is 32 random bytes, base64url-encoded — opaque, unguessable, carries no
  information.
- Lives in D1 (truth) and KV (cache). 7-day lifetime.
- The cookie holds only this id.

### DailySummary
`id` (= `${userId}_${date}`) · `userId` · `date` · `depositCents` ·
`withdrawCents` · `transferCents` · `txCount` · `computedAt`

- Written by the nightly cron. The composite id makes the write idempotent.
- Derived data — it can always be recomputed from `transactions`.

## Invariants

These must hold no matter which code path runs. Each maps to a defence in the
implementation:

| Invariant | Enforced by |
|---|---|
| A withdrawal never takes a balance below zero | Balance check inside the Durable Object, before insert |
| Concurrent writes for one user cannot interleave | One DO instance per user (`idFromName(userId)`) |
| Retrying a create does not duplicate it | Idempotency key cached in DO storage, 24h TTL |
| A user only ever reads their own data | `assertSelfOrAdmin` in the service layer |
| Only admins reach admin surfaces | `assertAdmin` + route guard + Cloudflare Access |
| Amounts are exact | Integer cents throughout; no floats anywhere |
| Existence of another user's resource is not disclosed | 404 for both "missing" and "not yours" |

## Balance

Balance is **derived, never stored**:

```
balance = Σ(deposit.amountCents) − Σ(withdraw.amountCents)
```

`transfer` is recorded but does **not** move the balance in this model — it is
tracked for reporting only. Verify against the course whether transfers are meant
to have a counterparty; as implemented they do not.

Two implementations exist and must agree:
- `services/transactions.service.ts` — Drizzle `GROUP BY type` with `SUM`, for display.
- `edgeledger-transaction-do/src/index.ts` — row scan inside the DO, for the
  withdrawal check.

The DO reads from D1 (not DO storage) for this, so D1 stays the single source of
truth.

> **Known scaling limit, worth stating in a review:** the DO's
> `computeBalanceCents` selects *every* transaction row for the user and sums in
> memory. Correct, and fine at training scale; it degrades linearly with history.
> The real fix is a maintained balance or a `SUM` pushed into SQL. Flagged here so
> the choice is deliberate rather than accidental.

## Transaction creation — the full path

```
1. Route/action validates input                     (type, amount > 0)
2. Service asserts caller may write for this user   (assertSelfOrAdmin)
3. Service calls the DO worker over a service binding, with a shared secret
   and a fresh idempotency key (uuid per submission)
4. DO worker validates the secret, resolves the DO instance by userId
5. DO: idempotency cache hit? → return the cached result, do nothing else
6. DO: compute balance from D1
7. DO: if withdraw and balance < amount → INSUFFICIENT_FUNDS
8. DO: categorise (deposit → "Income", transfer → "Transfer",
       otherwise ask the AI worker; failure → null)
9. DO: INSERT into D1
10. DO: cache result under the idempotency key, ensure the cleanup alarm
11. DO: emit [AUDIT] transaction.created
12. DO: publish transaction.created to the queue (best-effort, never fatal)
13. Response flows back: { transactionId, balanceCents, category }
```

Errors that are business outcomes, not faults, are structured:
`INSUFFICIENT_FUNDS:<balance>` → HTTP 400 `{ error: "insufficient_funds",
balanceCents }` → `InsufficientFundsError` in the service → a real message in the
UI. Do not collapse these into a generic 500.

## Categories

Closed set: `Food`, `Travel`, `Bills`, `Entertainment`, `Shopping`, `Income`,
`Transfer`, `Other`.

Assignment order: deterministic rules first (`deposit → Income`,
`transfer → Transfer`, no description → `null`), model inference only for
withdrawals with a description. Output is matched against the closed set; no match
→ `Other`; error → `null`. Nulls are picked up later by the nightly backfill.

## Roles and visibility

| Surface | `user` | `admin` |
|---|---|---|
| Own dashboard, own transactions | ✅ | ✅ |
| Create a transaction for self | ✅ | ✅ |
| Own receipts | ✅ | ✅ |
| Another user's data | ❌ 404 | ✅ |
| `/admin/users`, `/admin/daily-summary` | ❌ redirect | ✅ (+ Access) |
| Trigger the daily job / a workflow | ❌ | ✅ |
