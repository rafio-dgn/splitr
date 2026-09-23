# ADR-0016: What the AI does in Splitr, and where it's allowed to reach

- **Status:** Accepted. §9 and §12 amended by [ADR-0017](./0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md): the course's model is deprecated, C.4 uses `-fp8`, and the eval gains a model axis
- **Date:** 2026-09-23
- **Deciders:** Raffaele, in three rounds of structured questions on 2026-09-23.
  The AI proposed options and recommendations; every choice below is his.
- **Requirement:** `REQ-C.3`, `REQ-D.3`, `REQ-D.4`, `REQ-E.4`, `REQ-E.6`, `REQ-F.4`, `REQ-M.7`
- **Refines:** [ADR-0004](./0004-project-is-splitr.md) (it deferred model choice) and
  [`../context/project-brief.md`](../context/project-brief.md) (it named the features)

## Context

The course fixes the *mechanics* of AI in this build: the models
(`@cf/meta/llama-3.1-8b-instruct`, `@cf/baai/bge-base-en-v1.5`), the Vectorize
index and `/search` route, a separate AI Worker doing RAG with no public URL and
a shared secret, AI Gateway in front of every call, and the rule that AI never
blocks the primary write. It never says **what the AI is for**. "RAG, grounded
in your own data" leaves the product role, the trust boundary and the data
open, and all three shape the schema, the Worker topology and the demo.

Raffaele asked that no AI decision be made without him. This ADR records the
outcome of three rounds of questions, each asked before any code was written.

## Decisions

Each decision is listed with the rejected alternatives and the reason.

### 1. The RAG feature categorises line items

A new line item, say "Pad Thai x2", goes through retrieval of *this group's*
similar past items, and then Llama picks a category consistent with how the
group has categorised before.

- **Rejected: expense autofill.** It suggests splits, which is too close to
  the money.
- **Rejected: natural-language Q&A over spending.** An 8B model summing
  retrieved rows gets numbers wrong, and top-k retrieval can't guarantee it saw
  every row. Both are fatal in an app whose point is correct balances.
- **Rejected: reminder text.** The grounding would be decorative and hard to
  show as better.
- **Chosen because** the output is one label, which is verifiable and can be
  measured against a no-RAG baseline. A wrong label never changes a balance.
  It's also exactly the work the brief's nightly backfill (`REQ-E.6`) needs.

### 2. Trust boundary: money needs a human

- AI may auto-apply **non-money** fields. Today that means only the category.
- Anything that becomes an **amount, a line item or a split** is a pre-filled
  draft the user reviews and confirms. That covers receipt OCR output
  especially. The ledger only ever contains human-confirmed amounts.
- A failed or unusable OCR falls back to the manual entry form, which is always
  available.
- **Rejected:** "suggest only, everywhere", because the cron couldn't apply
  categories on its own. **Rejected:** "auto-commit everything", because a
  misread €18.90 → €189.00 would silently corrupt the balance the Durable
  Object exists to protect.

### 3. English only

The mandated `bge-base-en-v1.5` is an English embedding model. Non-English
receipts would make semantic search likely to lose to keyword search, which is
the very thing `REQ-D.4` must demonstrate. The demo data and receipts are in
English. **Rejected:** Italian or Portuguese receipts, and mixed input with
translate-then-embed (an extra model call and an extra failure mode).

### 4. A closed category taxonomy

The model may return exactly one of these keys, and its output is validated
with zod against this list:

| Key | Label |
|---|---|
| `groceries` | Groceries |
| `eating_out` | Eating out |
| `drinks` | Drinks & nightlife |
| `transport` | Transport |
| `travel_lodging` | Travel & lodging |
| `household` | Household |
| `utilities_bills` | Utilities & bills |
| `entertainment` | Entertainment |
| `health_personal` | Health & personal care |
| `gifts` | Gifts |
| `other` | Other |

`uncategorised` is **system-only**. It's the state before categorisation, or
after the AI failed, and the model can never return it. `other` is a real
answer ("nothing fits"); `uncategorised` means "not yet answered". The cron
backfills `uncategorised` and never touches `other`. The key is stored; the
label is UI only.

- **Rejected:** free per-group labels (they can't be validated and spelling
  drifts), and a fixed list plus custom group categories (more schema and UI
  than the course asks for). The compact 7-category list and a receipt-line
  list were also offered and declined.
- RAG still earns its place with a closed list. Retrieved history resolves
  group-specific ambiguity: "beer" is `groceries` for one group and `drinks`
  for another.

### 5. Categorisation runs after the write

1. The expense saves first.
2. Categorisation is started with `ctx.waitUntil` and writes the label when it
   arrives.
3. If the AI Worker is down or slow, the item stays `uncategorised`, and the
   nightly cron (`REQ-E.6`) backfills it.

`REQ-M.7` therefore holds by construction: the write never waits on AI.
**Rejected:** inline with a timeout (every save gets slower, and the timeout
becomes a tuning problem) and cron-only (the demo would show `uncategorised`
until a manual trigger).

### 6. Every model call ends up behind the AI Worker

- **Cluster D** has to call models from the app Worker's own `ai` binding,
  because the AI Worker doesn't exist until Cluster E and `REQ-M.2` forbids
  building it early. That covers the embeddings (D.7) and the OCR spike and
  flow (D.6).
- **At Cluster E**, every model call moves behind the AI Worker's service
  binding, and the app Worker **loses its `ai` binding**. That leaves one place
  for the shared secret, the `REQ-M.7` fallback, and the `REQ-F.4` gateway
  routing.
- **Accepted cost:** a planned refactor at E. It's in the build plan so it isn't
  forgotten. **Rejected:** keeping embeddings and OCR in the app permanently,
  because the fallbacks and gateway routing would then have to be done twice.

### 7. One vector per line item

A single index serves both consumers:

- **RAG** retrieves similar *items*.
- **`/search`** groups item hits back to their expense, so "the thing we
  bought for the kitchen" finds the item and shows its expense.

This means more embedding calls. It's also where the build plan expects D1's
transaction limit to bite (D.7). **Rejected:** one vector per expense (weaker
evidence for categorising a single item), and both kinds (double the cost, and
two indexes to keep in sync).

### 8. Retrieval scope: the group first, then a seed corpus

- Retrieval filters on the group's own items, using Vectorize metadata on
  `groupId`.
- If there are too few matches, it falls back to a curated **seed corpus** of
  about 50 labelled example items that we write, not any user's data. New
  groups get sensible categories on day one.
- **No data crosses group boundaries.** Retrieval across all groups was
  rejected because it would put other groups' item names into prompts, a
  data-boundary crossing in a finance app.
- The same group isolation is **mandatory for `/search`**. It's an invariant,
  not an option, so it wasn't put to a vote.

### 9. Evidence: a small labelled eval set, with numbers

- About **30 line items** with correct categories, run with and without
  retrieval, giving an accuracy figure for each.
- About **10 search queries** with expected hits, run semantic versus keyword.
- The results go in an evidence file and are re-runnable, which also makes
  them a regression check whenever the prompt changes.
- **Rejected:** curated live examples only. That's anecdote, and an 8B model
  is non-deterministic, so an example can flip on stage.

### 10. The vision model is chosen by a spike at D.6

Each vision model available *at that time* runs on the same ~10 receipts and
is scored on line-item and total accuracy. The winner gets its own ADR. The
catalogue changes fast, so the candidate list in the brief (written 2026-09-22)
is a starting point, not a shortlist. **Rejected:** defaulting to
`llama-3.2-11b-vision-instruct` because it has a tutorial.

### 11. Data: a synthetic seed plus a few real receipts

- A seeded demo group with realistic English expenses and items gives RAG its
  history and search its content.
- **5–10 real English receipts**, photographed by Raffaele, feed the OCR
  spike and the live "snap the bill" moment.
- Nothing personal goes into the eval set. **Rejected:** all-synthetic (OCR on
  generated images says little about crumpled paper) and all-real (personal
  spending in D1, Vectorize and the gateway logs, and an eval set that can't be
  shared).

### 12. C.4 spikes the real prompt, without RAG

The throwaway Worker's Llama call is a **no-RAG categoriser**: POST a line item
and get back a category from the list above. It measures real latency, output
format and failure modes of the 8B model on a disposable Worker, and those
findings feed the E.4 design. It also becomes the eval's *without-retrieval*
baseline. **Rejected:** a bare prompt passthrough (it would teach only that the
binding works) and both routes (more code in a Worker that gets deleted).

## Consequences

- **Build plan:** new tasks are added for the seed corpus, the eval set, the
  Cluster E refactor that moves model calls behind the AI Worker, and the
  item-level `category` column (`uncategorised` by default) in the `REQ-D.1`
  schema.
- **Schema (`REQ-D.1`):** `line_item.category` is a text column constrained to
  the 12 keys (the 11 model answers plus `uncategorised`). Adding a category
  later is a migration plus a prompt change, deliberately not free.
- **Demo story:** "The AI suggests, the human confirms money, and the write
  never waits." That's one sentence covering `REQ-M.7`, the trust boundary and
  why RAG is there.
- **Revisit if:** the eval shows RAG doesn't beat the no-RAG baseline, which
  would be a finding worth reporting rather than hiding. Also revisit if no
  vision model reaches usable accuracy at D.6 (ADR-0004 already names that
  trigger), or if a non-English demo becomes necessary (that would reopen
  decision 3 and the mandated embedding model).
