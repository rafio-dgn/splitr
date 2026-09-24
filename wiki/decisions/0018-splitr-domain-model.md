# ADR-0018: Splitr's domain model: equal shares, pairwise settlements, void-not-edit

- **Status:** Accepted. The Consequences line about "KV's snapshot" is superseded by [ADR-0019](./0019-kv-holds-recent-descriptions-not-balances.md): KV holds recent descriptions, and balances are never cached in KV
- **Date:** 2026-09-24
- **Deciders:** Raffaele, in two rounds of structured questions on 2026-09-24.
  The AI proposed the options; two of his eight answers differ from its
  recommendation, and are recorded as chosen.
- **Requirement:** `REQ-D.1`, `REQ-E.1`, `REQ-P.3`, `REQ-F.2`, `REQ-F.6`
- **Resolves:** the "split model" decision the build plan puts at D.1, and the
  brief's open decision of the same name

## Context

`REQ-D.1` needs a schema, and a schema is a set of product decisions. What an
expense is, what a settlement settles, and what "correcting a mistake" means
all fix columns and constraints that are expensive to change once rows exist.
They also define **what the Durable Object checks** when it refuses the
duplicate settlement (`REQ-E.1`), so the contested write can't be designed
until they're settled.

Already fixed before this ADR, by `schema.ts`'s conventions and Cluster B's
code:

- money is integer minor units, and the currency is a separate ISO-4217 column;
- timestamps are Unix seconds;
- ids are text, and foreign keys are declared;
- the equal split puts the leftover penny on the first participants, so the
  shares always sum to the total: £10 across 3 is 334/333/333.

## Decisions

### 1. Split model: equal shares; line items are informational

An expense is split **equally among its chosen participants**, which is what
Cluster B's form already does. The computed shares are **stored**
(`expense_share`), so a balance never depends on re-running the rounding. Line
items from a receipt exist for categorisation and search
([ADR-0016](./0016-ai-integration-strategy.md)), and **they don't affect who
owes what.**

*Rejected:* per-item assignment (an item-assignment UI, per-item penny rounding,
and far more money logic to test under ADR-0012), and equal-with-optional
per-item (two share paths). Per-item goes to the backlog as a stretch.

### 2. A settlement is "A paid B", checked against net balances

A settlement is a **transfer between two members**. It's valid only if:

- the payer currently **owes** (net < 0);
- the recipient is currently **owed** (net > 0);
- the amount is **at most** what each side can absorb:
  `amount ≤ min(-net(payer), net(recipient))`.

Partial payments are allowed. The duplicate "Alice paid Bob £40" finds Alice's
net at £0 and is refused, so this **is** the arbiter's rule for `REQ-E.1`.
The payer and recipient must differ, which the database enforces with a
`CHECK`.

*Rejected:* validating against a simplified set of transfers, because the
arbiter's rule would depend on an algorithm whose output changes with every
expense. "Pay the group" was also rejected: real cash moves between two
people, as in the brief's own example.

### 3. Mistakes are voided and re-added, never edited or deleted

An expense is never updated or deleted. A mistake gets `voided_at` and
`voided_by`, which drop it out of every balance, and the correct one is added
fresh. **Settlements are immutable.** The history stays complete, which is
`REQ-F.6` Q2's answer ("trace every change to a record"), and no balance ever
changes except through an explicit, recorded event.

*Rejected:* editing in place (it silently rewrites balances that a settlement
may already have been accepted against) and hard delete (the history is gone).

### 4. One currency per group

The group chooses its currency at creation, and every expense and settlement
in it carries that currency. There are no exchange rates anywhere. The UI may
offer only GBP for now; the model is ready for more.

*Rejected:* GBP-only (the column exists by convention anyway), and
multi-currency per expense (a rates feature the course doesn't ask for).

### 5. Invites: one reusable code per group, rotatable

`group.invite_code` is unique and appears in the shareable `/join/[code]` link
that Cluster B already built. Any member can rotate it to kill a leaked link.
There's no invite table.

*Rejected:* single-use per-person invites, and codes with expiry.

### 6. Members can leave, only when square. *(Raffaele's choice; the AI had recommended "not in scope".)*

`group_member.left_at`. A member may leave only when their net balance is
exactly zero. Former members stay visible by name on their past expenses. A
member who has left can't be a participant, payer or settlement party in new
records. That's enforced in code, since SQLite can't express it as a `CHECK`.

### 7. Any member may void any expense. *(Raffaele's choice; the AI had recommended "whoever added it, or its payer".)*

Trust within the group, with accountability: `voided_by` records who did it,
and the `[AUDIT]` line (`REQ-M.5`) records it too.

### 8. Only the two parties may record a settlement

`recorded_by` must be the payer or the recipient, which is enforced by a
`CHECK`. This still produces the contested write, because both parties can tap
at once, exactly as in the brief. A third member can't invent a payment
between two others.

*Rejected:* any member (payments nobody involved agreed to).

## Consequences

- **The balance formula.** For each member:
  - add the expenses they *paid* (non-voided);
  - subtract their *shares* of non-voided expenses;
  - add the settlements they *paid*;
  - subtract the settlements they *received*.

  Everything else is derived from this. Nothing stores a running balance in
  D1; KV's snapshot (`REQ-D.2`) is a cache of this formula.
- **The race is bigger than settlements. This feeds E.1.** Decisions 2, 3 and 6
  are all *check-then-write* operations against net balances:
  - a settlement checks the payer still owes;
  - leaving checks the member is square;
  - a void changes balances that another in-flight check may be reading.

  If only settlements go through the Durable Object, a void or a new expense
  can land between a settlement's check and its write. So **E.1's "does the DO
  own or only arbitrate" question now includes "does every balance-changing
  write go through it?"** That's recorded here, and decided at E.1 with
  Raffaele.
- **The database enforces what it can**, through `CHECK`s: positive amounts,
  non-negative shares, payer ≠ recipient, recorder ∈ {payer, recipient}, and
  a category in the closed list. Rules that need other rows (membership,
  currency matching the group's, leaving only when square, the balance check)
  live in code, and eventually in the DO.
- **`spent_on` is a calendar date (`YYYY-MM-DD` text), not a timestamp.** It's
  a deliberate exception to the Unix-seconds convention. A receipt's date has
  no time zone, and storing it as midnight UTC would shift it a day for anyone
  west of Greenwich.
- **Backlog:** per-item splits, multi-currency, single-use invites.
