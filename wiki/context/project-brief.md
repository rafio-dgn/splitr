# Project brief — Splitr

Satisfies `REQ-P.1`. The first three sections go verbatim at the top of the repo
README, per `REQ-0.5`.

---

## What it is

**Splitr — snap the bill.** Photograph a receipt, and a vision model itemises it
into line items. The group's shared balance updates. When someone settles up,
exactly one settlement lands — never two.

## Who it's for

Anyone splitting shared expenses with the same people repeatedly: housemates,
a group trip, a regular dinner crowd. The people who currently keep a running
tally in a chat thread and argue about it later.

## The contested write

> **Two people settling the same debt at the same moment must not both succeed —
> the second must be refused, not merged.**

Concretely: Alice owes the group £40. She hands Bob cash. Alice taps *"I settled
£40"* on her phone; Bob, holding the notes, taps *"Alice settled £40"* on his.
Two writes, one real-world event. If both land, the group's books are wrong by
£40 and nobody can tell which entry is spurious.

This is a genuine contested write, not a last-write-wins edit:

- The two writes are **both valid in isolation** — neither is stale or malformed.
- Merging is **wrong**, not merely lossy. There is no sensible union of two
  settlements of the same debt.
- The loser must be **told** they lost, because a human is standing there
  expecting the balance to move once.

A Durable Object keyed on the **group** (`idFromName(groupId)`) arbitrates:
it re-reads the authoritative balance, validates that the settlement does not
exceed what is actually owed, writes to D1, and returns the new balance. The
second writer arrives after the first has committed, finds the debt already
cleared, and is refused.

`REQ-E.7` asks for this in one sentence: **"Splitr's Durable Object prevents the
same debt being settled twice when two group members record the same payment at
the same moment."**

---

## Building-block coverage (`REQ-P.2`)

Eight of eight. Honest assessment of how naturally each fits:

| Block | Use in Splitr | Fit |
|---|---|---|
| **D1** | Users, groups, members, expenses, line items, settlements — the relational core | **Natural.** Primary store. |
| **Durable Objects** | Balance arbiter, one instance per group | **Natural.** This *is* the contested write. |
| **R2** | Receipt photographs, uploaded direct from the client via presigned URL; only the object key is persisted | **Natural.** Real user-supplied files. |
| **Workers AI** | Vision model itemises the receipt photo; a text model categorises each line item | **Natural.** The product doesn't exist without it. |
| **KV** | Hot per-group balance snapshot — read on every group view, rebuildable from D1 by replaying expenses and settlements | **Natural.** Genuinely a cache: losing it costs a recompute, not correctness. |
| **Cron** | Nightly sweep — outstanding-debt reminders, plus backfilling uncategorised line items | **Natural.** Recurring, and idempotent via UPSERT. |
| **Turnstile** | The public **join-group** page: an invite link opens an unauthenticated form | **Designed for.** Splitr needs a public surface to satisfy `REQ-F.2`; the invite flow is the plausible one. Worth building deliberately rather than bolting on. |
| **Vectorize** | Embed expense descriptions and line items; `/search` finds past expenses **by meaning** — "that Thai place", "the thing we bought for the kitchen" | **⚠️ The stretch feature.** See below. |

### Vectorize is the stretch (`REQ-P.2`)

`REQ-P.2` says: *"If the idea only uses three or four, add a stretch feature to
cover the rest."* For Splitr, seven blocks fall out of the domain naturally.
Vectorize does not — a bill-splitter has no inherent need for semantic search.

So it is a deliberate stretch feature, and it has to earn its place:

**"Where have we spent on this before?"** — type *"coffee"* or *"that Italian
place near the station"* and get matching past expenses across all your groups,
matched by meaning rather than by keyword. This is genuinely useful (receipt
merchant names are cryptic — `SQ *TOAST LDN` is a coffee shop) and it is
genuinely semantic, so `REQ-D.4`'s "demonstrably not keyword match" is easy to
show.

Recording this honestly matters: `REQ-M.4` requires every decision explainable in
your own words, and "Vectorize is here because the course requires it" is the
true answer. The stretch feature is how it is made to pay for itself.

---

## Design decisions: where they stand

Each one belongs to the cluster that reaches it, with its own ADR.

| Decision | State |
|---|---|
| Auth library (`REQ-B.5`) | ✅ Better Auth, [ADR-0009](../decisions/0009-better-auth-on-local-sqlite-via-drizzle.md) |
| Deploy adapter (`REQ-C.1`) | ✅ OpenNext, [ADR-0014](../decisions/0014-opennext-as-the-deploy-adapter.md) |
| What the AI does, and its limits | ✅ [ADR-0016](../decisions/0016-ai-integration-strategy.md): RAG categorises line items; money needs a human |
| Text model (the course's one is deprecated) | ✅ `llama-3.1-8b-instruct-fp8` for now, and the eval picks E.4's model, [ADR-0017](../decisions/0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md) |
| Vision model for receipt OCR | ⏳ D.6, **chosen by a spike** over every available model ([ADR-0016](../decisions/0016-ai-integration-strategy.md) §10). Live on 2026-09-23: `llama-3.2-11b-vision-instruct`, `llama-4-scout-17b` |
| Split model: equal shares or per-item | ⏳ D.1. Cluster B's form uses equal shares today |
| Does the DO own the balance, or only arbitrate? | ⏳ E.1, the central design question. Leaning towards arbitrate-only, with D1 as the source of truth |
| Search scope: the current group, or all the viewer's groups? | ⏳ **Conflict to resolve at D.8.** This brief says "across all your groups"; the build plan says "the viewer's group". Either way, never another user's groups |

---

## Why this one

Weighed against ClaimCheck and TrialDesk, which the course wires up in more
detail:

- **The contested write is sharper.** "Two people settle the same debt" has an
  unambiguous correct behaviour — refuse the second. Claim-a-review-slot is also
  contested, but a reviewer taking a slot they then abandon is a softer failure.
- **It is demonstrable in 15 minutes** (`REQ-X.8`). Two phones, one receipt, two
  taps on *Settle up* — the failure mode without a DO is visible to a panel
  without domain explanation. An MLR claims workflow needs five minutes of
  pharma context first.
- **The files are real.** Receipt photos are genuine user uploads, which makes
  `REQ-D.3`'s presigned-URL requirement meaningful rather than contrived.
- **Cost:** the vision model is extra scope the course doesn't name. Accepted —
  it is what makes the product what it is.
