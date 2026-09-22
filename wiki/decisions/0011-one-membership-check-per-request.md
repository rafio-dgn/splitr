# ADR-0011: One membership check per request, in the group layout, memoised with React `cache()`

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** AI (frontend agent), pending human review
- **Requirement:** `REQ-B.1`, `REQ-B.3`, and §2 of [`../context/screens-cluster-b.md`](../context/screens-cluster-b.md)

## Context

The design spec makes group membership "the spine": every screen under
`/groups/[groupId]` must answer *is the viewer a member of this group?* before
anything else renders, the check must happen **once, in the group layout**, and
"not a member" must be indistinguishable from "does not exist" so that a
stranger cannot enumerate group ids.

The App Router gives a layout no way to hand data to the page beneath it.
Layouts and pages are rendered as siblings in the tree, not as a function and its
return value. So "one check, in the layout, and no page re-derives it" is a
statement about *behaviour*, not about call sites — some mechanism has to make
the repeated question cost one answer.

A second, sharper problem surfaced while building: `notFound()` thrown **in a
layout** is not caught by the `not-found.tsx` beside it. That boundary renders
*inside* the layout that threw, so the error bubbles to the parent segment.

## Options considered

### Option A — Check in every page, not in the layout
- Pros: no memoisation needed; each page is self-contained and obviously correct.
- Cons: contradicts §2 outright; five call sites to forget; the day someone adds
  a sixth screen under `/groups/[groupId]` and forgets the check, it leaks. The
  spec's whole point is that the check is structural, not repeated.

### Option B — Check in the layout, pass the group down via React context
- Pros: one read, one source.
- Cons: context needs a Client Component provider, which would drag the group
  data across the server/client boundary for no reason and put a `"use client"`
  above the page — the exact inversion `REQ-B.3` forbids.

### Option C — Check in the layout; pages call the same resolver, memoised per request with React `cache()`
- Pros: the layout is the gate and the pages stay Server Components; the resolver
  runs **once** per request whatever calls it; the signature is unchanged when
  Cluster D swaps the fixture for a Drizzle query.
- Cons: the memo is invisible at the call site — a reader has to know `cache()`
  is there, which is what `src/lib/groups/current-group.ts`'s comment is for.

## Decision

We chose **Option C**.

Because: it is the only option that keeps the check structural *and* keeps every
screen in the subtree a Server Component. `cache()` is per-request and per-
argument, so two different viewers never share an entry — which matters
enormously for a function whose answer is "is this person a member".

Consequent placement rule, forced by the layout/`not-found` interaction above:
the group's "We can't find that group" screen lives at
`src/app/(app)/groups/not-found.tsx`, the **parent** segment, not beside the
layout that throws. The expense-detail screen keeps its own
`expenses/[expenseId]/not-found.tsx`, so a missing expense is not reported as a
missing group.

## Consequences

- What this now makes easy: adding a screen under `/groups/[groupId]` — it is
  gated by construction, and calling `resolveGroup` for the group's name is free.
- What this now makes hard: nothing in Cluster B. In Cluster D the memo must
  stay *per request*; if anyone reaches for a cross-request cache here, the
  membership answer starts leaking between users.
- What we will have to revisit: when `REQ-D.1` gives the balance its own
  aggregate query. Today the dashboard's balance and its expense feed come from
  the same read, so a read failure takes both down and §5.6's "the balance above
  is still accurate" fallback cannot be reached from a data failure — only from a
  render failure inside the feed. Two queries will separate them properly.

## Verification

Built and exercised on `next dev -p 3100` with headless Chrome:

- `/groups/nope` → "We can't find that group" (before `groups/not-found.tsx`
  existed it rendered Next.js's built-in 404 — which is what exposed the
  layout/`not-found` rule).
- `/groups/grp_demo/expenses/nope` → "We can't find that expense".
- `/groups/grp_demo`, `/members`, `/settle`, `/expenses/new` all render with the
  group name in the header, one membership resolution per request.
