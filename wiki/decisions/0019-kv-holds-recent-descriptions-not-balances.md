# ADR-0019: KV holds each group's recent expense descriptions, not a balance snapshot

- **Status:** Accepted
- **Date:** 2026-09-24
- **Deciders:** Raffaele (the value), AI (the mechanism)
- **Requirement:** `REQ-D.2`, `REQ-D.6` Q1, `REQ-C.5` Q3, `REQ-M.7`
- **Changes:** the plan in the project brief, the README and build-plan D.4, all of which said "KV: hot per-group balance snapshot"

## Context

`REQ-D.2` asks for exactly one piece of hot, short-lived state in KV. It must be
rebuildable, it must not be primary data, and it must be justifiable. Its note
is the constraint that decided this:

> *"Choosing something that would be a correctness bug if stale fails the
> requirement even if it works."*

Since the brief, the plan had been a **per-group balance snapshot**. On
re-reading the note at D.4, that plan is exactly the thing the note warns
about. KV is eventually consistent: a write or delete can take up to about 60
seconds to be seen in other locations. So after Alice settles, a stale
snapshot elsewhere could still say *"You owe £40.00"*. `screens-cluster-b.md`
§6 says the user's actual question at that moment is *"did the £40 land?"*,
and a stale balance answers it wrongly. Keeping the settle *check* on D1 would
keep the ledger correct, but the *display* would still be a stale money figure
in a money app. That's a hard answer to defend at the demo.

## Options considered

### Option A — Recent expense descriptions, for autofill
- Per group, the last ~10 distinct descriptions ("Tesco run", "Uber to the
  airport"), offered as suggestions on the add-expense form.
- Pros: it's the course's own example ("a read-many cache such as the
  dashboard's recent items"). It's read on every add-expense view. It's
  rebuilt from D1 with one query, and it isn't primary data. **Stale means a
  missing suggestion, never a wrong number.**
- Cons: a smaller feature than a balance cache, and it had to be justified
  from scratch rather than inherited from the brief.

### Option B — Balance snapshot, display only
- Pros: it's the original plan, and the value is hotter.
- Cons: stale balances, as above. Defensible only with caveats.

### Option C — A feature flag
- Pros: KV's textbook use, and trivially safe.
- Cons: bolted on. Splitr has no natural need for it, and `REQ-P.2` asks
  blocks to fit naturally.

## Decision

We chose **Option A**.

Because: it's the only candidate where the worst case of eventual consistency
is harmless *by construction*. The requirement's note is satisfied because
staleness has no correctness consequence, not because the cache happens to be
fresh.

### Mechanism

- **Key:** `recent-descriptions:v1:<groupId>`. The version segment lets the
  value's shape change without reading old values as new ones.
- **Value:** a JSON array of at most 10 strings, validated with zod on read.
  An unreadable value is treated as a miss.
- **TTL:** 7 days (`expirationTtl`), so an abandoned group's key disappears on
  its own.
- **Read (`getRecentDescriptions`):**
  1. Get the key from KV. A hit returns it.
  2. On a miss, run one D1 query (the group's non-voided expenses, distinct
     descriptions, newest first, limit 10), then put the result back into KV
     in `ctx.waitUntil`.
  3. **Any KV error falls through to D1.** KV can make the form faster, never
     broken (the same stance as `REQ-M.7`).
- **Write:** after an expense is saved, the key is **deleted** in
  `ctx.waitUntil`. The expense's save never waits on KV. Deletion rather than
  a write-through prepend is deliberate: a delete can't produce a *wrong*
  list, only a cold one, and the next read rebuilds it from the source of
  truth.
- **Scope:** read only after the group's membership check (the add-expense
  page sits under the group layout). The key contains the unguessable group
  id, and KV is never exposed directly.

## Consequences

- **`REQ-D.6` Q1 ("why does each piece of data live where it does?")** gets a
  crisp answer. Money lives in D1 because it must be correct. A convenience
  list lives in KV because it only has to be fast, and it's fine being a
  minute behind.
- **`REQ-C.5` Q3 (`ctx.waitUntil`)** gets live code. Both the refill and the
  delete run after the response. Without `waitUntil` they'd be killed when the
  response returns, and the cache would never be warm.
- **The balance stays uncached.** It's derived from D1 on every view, which is
  cheap at Splitr's scale. If it ever needs caching, the right tool is the
  Durable Object that already serialises the group's writes (E.1), which is
  strongly consistent, not KV.
- **Plan documents change:** the brief's building-block table, the README
  (the component table and the system diagram) and build-plan D.4 now say
  "recent descriptions".
