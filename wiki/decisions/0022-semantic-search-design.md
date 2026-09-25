# ADR-0022: Semantic search across all the viewer's groups, with item and itemless-expense vectors

- **Status:** Accepted
- **Date:** 2026-09-24
- **Deciders:** Raffaele (scope, coverage, vector text), AI (mechanism)
- **Requirement:** `REQ-D.4`, [ADR-0016](./0016-ai-integration-strategy.md) §7, §8, §9
- **Resolves:** the brief-vs-build-plan conflict on search scope (backlog, 2026-09-24)

## Decisions (Raffaele's)

1. **Scope: all the groups the viewer currently belongs to.** This is the
   brief's version, over the build plan's single group. It's never another
   user's group. The filter is built at query time from the viewer's *current*
   memberships (`left_at IS NULL`), so leaving a group removes it from search
   immediately, with nothing to re-index.
2. **Coverage: a vector per line item, plus one per expense that has no
   items.** ADR-0016 §7 said one vector per line item, but a hand-typed
   expense has no items and would never be found. This extends §7; it doesn't
   reverse it. Receipt-read expenses keep item-level vectors for E.7's RAG.
3. **Vector text: the item plus the merchant**, as in
   `"Pad thai, at Lemon Tree Restaurant"`: the item's plain-English
   `description` and the expense's description. An itemless expense embeds
   its description alone. **The raw printed text is left out**: shorthand is
   exactly what the English embedding model reads badly (C.4: 2/10).

## Mechanism

- **Index:** `splitr-search`, 768 dimensions, **cosine** (the model's output
  size and the usual metric for `@cf/baai/bge-base-en-v1.5`).
- **Metadata:** `groupId` (a string, with a **metadata index created before
  any insert**, since vectors inserted earlier can't be filtered), plus
  `expenseId` and `kind` (`item` | `expense`). **No text is stored in
  Vectorize.** Everything shown comes from D1, so Vectorize is never a second
  copy of anyone's spending.
- **Vector id:** the line item's id (`li_…`) or the expense's (`exp_…`), at 35–36
  bytes against the 64-byte limit.
- **Writing:** after an expense is saved, its vectors are embedded (one batched
  `bge` call) and upserted in `ctx.waitUntil`. **The save never waits on it,
  and never fails because of it** (`REQ-M.7`). A failure is logged, and a
  backfill is E.8's job.
- **Querying:**
  1. Read the viewer's current group ids from D1.
  2. Embed the query.
  3. Query Vectorize with `topK: 20` and `filter: { groupId: { $in: [...] } }`.
  4. **Re-check every hit against D1**: it must still exist, not be voided,
     and belong to a group the viewer is in. The index is a candidate list,
     never the authority.
  5. Group item hits by expense and show each expense once, with its
     best-matching item.
- **Keyword mode for comparison:** `/search?q=…&mode=keyword` runs a plain
  `LIKE` over the same data. That's for the `REQ-D.4` evidence ("demonstrably
  not keyword match") and a side-by-side at the demo.

## Limits, recorded rather than discovered later

- **About 50 groups per viewer per search.** Vectorize filters must be under
  2,048 bytes, and a group id costs about 39 bytes in `$in`. Past 50, search
  uses the first 50 by name and says so on the page ("Searching your first 50
  groups only").
- **Free plan: 5 million stored dimensions**, which is about 6,500 vectors, and
  30 million queried dimensions a month. That's enough for a demo and a small
  real group; it's a plan-tier question beyond that.
- **Voiding** (not built) will need to delete the expense's vectors. That's
  noted for whenever voiding is built.

## Consequences

- `REQ-D.6` Q1 gains a fourth answer: meaning-search lives in Vectorize because
  it's a nearest-neighbour index, and it holds only ids, because D1 is the
  truth.
- E.7's RAG reuses this index: item vectors filtered to one group. For RAG
  that's the ADR-0016 §8 scope, deliberately narrower than search.
