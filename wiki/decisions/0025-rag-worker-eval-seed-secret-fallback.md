# ADR-0025: The RAG AI Worker: eval set, seed corpus, shared secret, timeouts

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Raffaele, in structured questions on 2026-09-25. The AI proposed
  the options and recommended; he chose the recommendation on all five.
- **Requirement:** `REQ-E.4`, `REQ-M.7`, `REQ-M.8` (and it prepares `REQ-F.5`)
- **Builds on:** [ADR-0016](./0016-ai-integration-strategy.md) (RAG categorises
  line items; group first, then a seed corpus; after the write; every model
  call behind the AI Worker) and [ADR-0017](./0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md)
  (the eval picks 8B-fp8 or 70B)

## Context

ADR-0016 left four things open for E.7. They shape what the eval can prove,
what RAG retrieves on day one, how the AI Worker is protected, and what
happens when a model is slow.

The measured starting point: the C.3 spike (no RAG, 8B-fp8) got **14/15 on
clean descriptions and 2/10 on receipt shorthand**, at a median of 426 ms and
2.9 neurons. In the D.6 spike, Scout read a receipt in a median of 3.2–3.9 s.

## Decisions

### 1. The eval set: 3 × 10 items, labels approved by Raffaele

| Set | Example | What it tests |
|---|---|---|
| 10 clean descriptions | "Pad Thai for two" | The baseline |
| 10 receipt shorthand | "SNSBRY SEMI SKMD 2PT" | The known weakness (2/10) |
| 10 **group-dependent** | "Peroni 4pk": `groceries` in a flatshare, `drinks` on a trip | Where only history can decide, and so where RAG must win |

- The group-dependent set runs against a **planted history of about 40
  items** in a synthetic eval group (reserved `groupId`s, never a real
  `grp_…`). No user data is involved.
- **The AI drafts the labels, and Raffaele approves or corrects each one.**
  The ground truth is his.
- The runner fills the {8B-fp8, 70B} × {no RAG, RAG} grid with accuracy,
  median and p95 latency, and neurons. It **runs each cell 3 times** (the
  models aren't deterministic).
- **No leakage:** the runner refuses to start if an eval item appears in the
  seed corpus or in the planted history.
- *Rejected:* only clean plus shorthand items (RAG's value would barely show),
  and labels without human review.

### 2. The seed corpus: about 50 items in the same index

- About 4–5 hand-written items per category, **half in UK receipt
  shorthand**, including deliberate traps ("Uber" → `transport` against
  "Uber Eats" → `eating_out`).
- The items go in the **same Vectorize index**, with `groupId: "seed"`
  (reserved; it can't collide with a `grp_…` id).
- **Retrieval:** the group's top 5 first. If fewer than about 3 clear a
  similarity threshold, the rest is topped up from the seed corpus. **The
  threshold is measured in the eval, not guessed.** The prompt labels group
  items "how this group categorises" and seed items "general examples", so
  the group's habits win.
- It's kept as JSON in the repo and loaded by an idempotent script, so it's
  reviewable and rebuildable.
- *Rejected:* a separate seed index (one more binding for no gain), and always
  mixing the seed in (it can drown the group's own habits).

### 3. The shared secret: an RPC argument, checked against a list

- The app reaches the AI Worker the way it reaches the ledger: a **service
  binding with a typed RPC entrypoint**, and `workers_dev: false`.
- Every RPC method takes the secret and checks it first, **in constant time,
  against `AI_SHARED_SECRETS`**: a comma-separated list, set with
  `wrangler secret put`. The app sends its single `AI_SHARED_SECRET`.
- **Why a list:** `REQ-F.5`'s correct rotation needs a dual-key window, where
  the consumer accepts old and new. With a list, the drill is configuration,
  not code.
- *Rejected:* one secret in a `fetch` header (rotation would need a code
  change at F.5), and HMAC with timestamps (replay protection against a
  surface that doesn't exist, and more to explain).

### 4. Timeouts and fallbacks: a budget per call, no inline retries

| Call | Does the user wait? | Budget | On failure or timeout |
|---|---|---|---|
| Categorise a line item | No (`waitUntil`, after the save) | ~8 s, including embed and retrieval | Stays `uncategorised`, with an `[AUDIT]` line; the nightly cron (E.8) backfills it |
| Embed for the search index | No (after the save) | ~5 s | Logged; the cron re-embeds |
| Embed a search query | **Yes** | ~3 s | **Keyword search**, which already exists, with a "showing keyword results" note |
| Read a receipt | **Yes** | ~30 s (~8× Scout's median) | The form stays manual, as today |

- Model output is untrusted input: zod-validated against the closed taxonomy
  (ADR-0016 §4), and anything else becomes `uncategorised`.
- **No inline retries:** the cron is the retry. *Rejected:* one inline retry
  (more neurons and latency for a label the cron fixes anyway), and no search
  fallback (an error where a worse answer is available).

### 5. The retrieved neighbours' text and category come from D1

Asked separately on 2026-09-25, once it was clear that the search vectors
hold ids only (ADR-0022).

- **Real users' vectors stay ids-only**, so ADR-0022 is unchanged. The AI
  Worker gets a **D1 binding and only reads with it**: the neighbours'
  description and category, never `uncategorised`. **The app writes the
  result**, as it writes everything else. D1 stays the single truth, so a
  corrected category is used the next time.
- **Reference vectors** (the seed corpus and the eval groups) have no D1 rows.
  They carry `text` and `category` in their own metadata, under reserved
  `groupId`s (`seed`, `eval-flat`, `eval-trip`), which no search can reach,
  because search filters on the viewer's `grp_…` ids.
- *Rejected:* text and category in every vector's metadata. It's least
  privilege and one hop, but it duplicates user text into Vectorize and goes
  stale when a category changes.

## Order of work

1. The seed corpus and the eval set (**Raffaele approves the labels**).
2. The AI Worker with RAG, the secret check and the budgets.
3. The 2×2 eval. **Its numbers choose the production model**, recorded in the
   evidence and in a note on this ADR.
4. Wire categorisation into the app (after the write).
5. Move embeddings and OCR behind the AI Worker, and remove the app's `ai`
   binding (ADR-0016 §6).

## The eval's result (2026-09-25): 8B + RAG, threshold 0.6

The 2×2 eval over 3 runs gave: 8B no RAG 23/30; **8B + RAG 28/30** (group
habits 8/10); 70B no RAG 24.7/30; 70B + RAG 26/30 (group habits 6/10). The
threshold sweep: 0.5 and 0.6 both 8/10, 0.7 gave 6/10 and 0.8 gave 5/10.
**Raffaele chose 8B + RAG with a 0.6 threshold** (structured question). The
70B's lower score on group habits is the notable finding: the bigger model
follows the group less. Full output:
[the evidence](../evidence/REQ-E.4-rag-categorisation-eval.md).

## Consequences

- **The eval can show RAG losing,** and that would be reported, not hidden
  (ADR-0016's revisit trigger).
- **Search degrades instead of failing** when embeddings are down: a
  user-visible behaviour, and a demo line.
- **`REQ-F.5` is prepared,** not done: the drill (the wrong way first) still
  happens at F.
- **More moving parts at E.7:** a third Worker, a secret on two Workers, and a
  reserved `groupId` convention in the index.

## Verification

Decisions 1 and 2 are verified by the eval (above). Decision 3: a wrong secret
was refused through the real binding, and there are unit tests for the list
and for failing closed. Decision 4: unit tests for the timeout and failure
paths, and 0 timeouts in 400 real calls. When this was written: The eval evidence will verify decisions 1
and 2, and the E.7 tests (a wrong secret refused, an empty list refusing
everything, each timeout falling back) will verify 3 and 4.
