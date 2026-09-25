# `REQ-D.4`: semantic search, beating keyword search on labelled queries

**Date:** 2026-09-24 · **Index:** `splitr-search` (768 dimensions, cosine) · **Deployed version:** `6cd8cc88`
**Decision:** [ADR-0022](../decisions/0022-semantic-search-design.md) (Raffaele: all his groups; itemless expenses covered; item + merchant text)

---

## The criteria

| Criterion | Met by |
|---|---|
| Each record embedded with `@cf/baai/bge-base-en-v1.5` | Every saved expense: one vector per line item, or one for an itemless expense. 16 seeded expenses gave **exactly 25 vectors** (9 itemless + 16 items) |
| Vectors upserted into a Vectorize index | `splitr-search`, after the save in `ctx.waitUntil`; the log shows `[search] indexed … vectors=N mutation=…` |
| A `/search` route exists | `/search?q=…`, across all the viewer's current groups, plus `&mode=keyword` for comparison |
| Results by **meaning**, demonstrably not keyword match | **11/11 against 3/11** on labelled queries (below) |

## The labelled queries

The demo group, "Search demo", holds 16 realistic English expenses. 9 were
typed by hand ("Taxi to the airport", "Plumber call-out") and 7 have line
items ("Lemon Tree Restaurant: Pad thai, Green curry, Jasmine rice"). All were
seeded **through the real Route Handler**, so indexing ran through the actual
code path. 11 queries mostly avoid the data's own words, plus one
keyword-friendly control ("Tesco"). A query scores if the right expense is in
the top 3.

```
query                        by meaning (top 3)                                   by keyword (top 3)                  
that Thai place              ✔ Lemon Tree Restaurant, Bangkok Street Kitchen, Ube ✖ —
coffee                       ✔ Starbucks, Netflix, Boots                          ✖ —
the thing for the kitchen    ✔ IKEA, Plumber call-out, Bangkok Street Kitchen     ✖ —
getting to the flight        ✔ Taxi to the airport, Uber home from the pub, Train ✖ —
heating and power            ✔ Electricity bill March, Gas bill, Plumber call-out ✖ —
streaming subscription       ✔ Netflix, Plumber call-out, Gas bill                ✖ —
painkillers                  ✔ Boots, Birthday present for Sam, Plumber call-out  ✖ —
beer                         ✔ The Crown, Uber home from the pub, Netflix         ✖ —
groceries                    ✔ Tesco, IKEA, Boots                                 ✖ —
leaking pipe                 ✔ Plumber call-out, Gas bill, Bangkok Street Kitchen ✖ —
Tesco                        ✔ Tesco, IKEA, The Crown                             ✔ Tesco

right expense in the top 3:  by meaning 11/11   by keyword 1/11

=== stronger keyword baseline: match ANY word of the query (stop words dropped) ===
that Thai place              words=['Thai', 'place']                  ✔ Lemon Tree Restaurant
coffee                       words=['coffee']                         ✖ —
the thing for the kitchen    words=['thing', 'kitchen']               ✔ Bangkok Street Kitchen, IKEA
getting to the flight        words=['flight']                         ✖ —
heating and power            words=['heating', 'power']               ✖ —
streaming subscription       words=['streaming', 'subscription']      ✖ —
painkillers                  words=['painkillers']                    ✖ —
beer                         words=['beer']                           ✖ —
groceries                    words=['groceries']                      ✖ —
leaking pipe                 words=['leaking', 'pipe']                ✖ —
Tesco                        words=['Tesco']                          ✔ Tesco

any-word keyword, right expense in the top 3: 3/11
```

**The result: by meaning 11/11, with the right expense ranked first every
time. By keyword 1/11 for whole-query substring, and 3/11 even when any single
word may match.** The any-word baseline also shows why keyword search misleads:
for "the thing for the kitchen" it ranks **Bangkok Street Kitchen** first (a
false match on the word), while meaning search goes straight to **IKEA**.

**Caveats, stated rather than hidden:**
- I wrote both the data and the queries, so there's a risk of unconscious
  bias. The control query and the stronger keyword baseline are there to keep
  the comparison honest, not flattering.
- 16 expenses is a small corpus. Rankings in a large index will be noisier.

## Behaviour worth knowing, measured

- **A saved expense becomes searchable after about 45–90 seconds** (Vectorize's
  asynchronous mutations). A just-added expense won't show up in search
  straight away.
- **The re-check against D1 is real:** every hit is reloaded from D1 filtered
  to the viewer's current groups and non-voided expenses. Vectorize holds ids
  only.

## Production

- **Indexing on save works in production.** `wrangler tail` showed the
  `[AUDIT] expense.add … persisted:true` line followed by
  `[search] indexed exp_… vectors=1 mutation=…`.
- **Production search for "groceries" found "Tesco big shop"**, a
  hand-typed expense that doesn't contain the word.
- **One miss, and its most likely cause:** the very first browser test after
  `deploy` created an expense that was never indexed. The identical form path,
  re-run once the deploy had settled, indexed within ~45 s. The most likely
  explanation is that the first request was served by the **previous** Worker
  version (without indexing) while the new one propagated. It isn't provable
  after the fact, and it's recorded as such. Lesson: wait for a deploy to
  settle before verifying it.

Test data was deleted afterwards. **The index went from 28 vectors to 0**, the
25 seeded locally plus 3 from production, which also shows that local dev
writes to the real index.
