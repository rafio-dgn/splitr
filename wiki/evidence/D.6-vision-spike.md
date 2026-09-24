# D.6: the vision-model spike (in progress)

**Date:** 2026-09-24 · **Decision:** [ADR-0021](../decisions/0021-receipt-reading-approach.md) · **Status:** 🟡 **interim**. SROIE's six are done; Raffaele's 3–5 English receipts are still to come
**Harness:** `scripts/vision-spike/` (a dev-only Worker plus `run.mjs`; re-run with `npx wrangler dev --port 8796` and `node run.mjs`)

---

## Inputs

- **Six SROIE receipts** (ICDAR 2019, CC-BY-4.0), at test-split indices 0, 60,
  120, 180, 240 and 300. The totals come from SROIE's published ground truth.
  The **14 line items were hand-labelled from the images before any model
  ran**, and are to be checked by Raffaele.
- **The same prompt for both models**, `temperature: 0`, and the same parser.
  Both models take the image as a base64 `data:` URI.
- Llama 3.2 Vision was unlocked by accepting Meta's licence (`agree`, sent
  once on Raffaele's instruction, 2026-09-24).

## Prompt v1

| Model | Totals right | Items matched | Valid JSON | Median latency | Median neurons |
|---|---|---|---|---|---|
| **Llama 4 Scout 17B** | **5/6** | **14/14** | 6/6 | **3.9 s** | 69.8 |
| Llama 3.2 11B Vision | 4/6 | 13/14 (reported extra lines) | 6/6 | 7.7 s | 35.6 |

The misses:

- **AEON (label 81.20): both answered 79.09.** The receipt's "GST Summary"
  table ends with `Total 79.09`, which is a tax base, and both models took it
  as the bill total.
- **99 Speed Mart (label 37.45): Llama 3.2 answered 37.44**, the pre-rounding
  figure. Scout got it right.

## Prompt v2 (targeting those failures)

| Model | Totals right | Items matched | Valid JSON | Median latency | Median neurons |
|---|---|---|---|---|---|
| **Llama 4 Scout 17B** | **5/6** | 13/14 | 6/6 | 3.2 s | 72.9 |
| Llama 3.2 11B Vision | **2/6** | **6/14** | **3/6** | 8.6 s | 42.5 |

- **The longer prompt broke the smaller model.** Llama 3.2 stopped returning
  JSON and wrote a Markdown report instead. That's not truncation (162
  completion tokens). It even printed `Rounding: 37.45` and then concluded
  "the total amount paid is 37.44".
- **The explicit "ignore the GST summary" rule fixed AEON for neither
  model.** That trap survives prompt engineering.

## Expansion quality ("keep raw and expanded", ADR-0021 §2)

The expansions are modest: mostly title-casing ("Cadbury Chocolate Hazel").
Scout made one real expansion: `COFFEEMIX 3IN` became "Coffee Mix 3 in 1". The
`raw` field was inconsistent in v1: Llama 3.2 sometimes gave the product code,
and Scout sometimes gave the whole line with its prices.

## What this suggests, so far (not a decision)

- **Scout leads on every correctness measure,** and it's about twice as fast,
  but it costs about twice the neurons (~70 per receipt, so about 140 reads
  a day on the free plan's 10k neurons).
- **Llama 3.2 is fragile to prompt length:** 12/12 → 9/12 valid JSON across
  the two prompts. Scout returned valid JSON 12/12, and it also offers a JSON
  mode that Llama 3.2 lacks.
- **The total is right on 5/6 even for the leader**, which is why the total is
  what the user must confirm (ADR-0021 §3). The confirm step is carrying real
  weight.

## Still to do

1. Raffaele's 3–5 English receipts go in `.data/receipts/mine/`, with totals
   and items labelled together.
2. Re-run v1 and v2 on all receipts, plus **Scout with JSON mode**.
3. Raffaele chooses the model; it's recorded in ADR-0021 (or a successor).
