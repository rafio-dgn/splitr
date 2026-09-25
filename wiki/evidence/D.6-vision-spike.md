# D.6: the vision-model spike (in progress)

**Date:** 2026-09-24 · **Decision:** [ADR-0021](../decisions/0021-receipt-reading-approach.md) · **Status:** ✅ spike done on SROIE, **model chosen: Llama 4 Scout** (Raffaele), **built into the app**. Raffaele's own receipts are still owed as confirmation
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

---

## In the app: "Read receipt" (2026-09-24, deployed version `7d800ed8`)

Scout with **JSON mode**, prompt v1, a 30-second timeout, and the answer
narrowed by `toReceiptDraft()` (7 unit tests). A real browser, locally and on
**production**:

```
✔ unreadable photo → "We couldn't read the total on that photo. Enter the expense yourself…" (1816 ms)
  form untouched? description = "typed by hand", amount = ""
✔ read in 2800 ms → description "99 Speed Mart", amount "37.45", 2 items
  printed as: "0857 INDO CAFE COFFEE MIX 3IN" · "407 CADBURY CHOCOLATE HAZEL"
✔ save blocked until the total is confirmed? true
✔ after ticking "I've checked the amount": save enabled? true
✔ saved
```

What production D1 stored: the expense at **3745** (the rounded total, correct),
and two `line_item` rows, each with `description`, **`raw_text`** (the printed
original) and `amount_cents`. Locally, the 4961×7016 restaurant scan read
correctly in 7.2 s: total 38.35, merchant "Lemon Tree Restaurant", and 3 of 4
items (it missed *Green Apple Juice*, and merged the unpriced add-ons into one
description).

### Two bugs found by the browser test, not by `tsc` or the unit tests

1. **The confirm gate didn't gate.** The "can't save until the amount is
   confirmed" rule landed on the *file input*, not the submit button: the
   same string appeared twice, and my edit changed the first one. The
   browser test showed the button enabled before ticking. **Fix:** the right
   element, *and* the rule is now **enforced on the server**, in
   `addExpenseSchema`. Line items without `amountConfirmed` get a 400 (a
   curl that bypasses the UI was refused), with 2 new unit tests. A UI bug
   can no longer remove the money-needs-a-human rule.
2. **That server rule broke the page at runtime.** Zod 4 refuses `.pick()`
   on a refined schema, and the form picks a subset. `tsc` passed, and the
   page rendered an error. **Fix:** a plain `addExpenseFields` object for
   `.pick()`, with `addExpenseSchema` as its refinement.

Production test data was deleted, including an **orphaned photo** (uploaded and
read, never attached), which was found by listing the group's R2 prefix
through the S3 API, since D1 had no record of it. So the orphan case in the
backlog is real.

