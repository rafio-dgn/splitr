# ADR-0021: Receipt reading (D.6): two Llamas in the spike, raw + expanded lines, a "Read receipt" button

- **Status:** Accepted. **Model: `@cf/meta/llama-4-scout-17b-16e-instruct`**, chosen by Raffaele on 2026-09-24 from the spike ([evidence](../evidence/D.6-vision-spike.md)); see *Model choice* below
- **Date:** 2026-09-24
- **Deciders:** Raffaele, in structured questions on 2026-09-24 (ADR-0016's rule: AI decisions are his). The AI researched the options.
- **Requirement:** `REQ-D.3` (the receipt), [ADR-0004](./0004-project-is-splitr.md) (a vision model is inherent to Splitr), [ADR-0016](./0016-ai-integration-strategy.md) §2, §3, §10, `REQ-D.5`

## Context

ADR-0016 §10 says the vision model is chosen by a spike over the models
available *at that time*. On 2026-09-24, `wrangler ai models list` showed six
vision-capable models: Llama 3.2 11B Vision, Llama 4 Scout 17B, Mistral Small
3.1 24B, Moondream 3.1, GLM-5.3-flash and LLaVA 1.5. That's three more than
the brief of 2026-09-22 knew about.

Facts measured before any choice:

- **Both Llamas take the image only as a base64 `data:` URI** ("HTTP URL will
  not be accepted"). So for reading, the Worker fetches the photo through the
  `RECEIPTS` binding and passes its bytes to the model. That's allowed: the
  rule in ADR-0020 is about the *upload*, which still bypasses the Worker.
- **Only Llama 4 Scout supports `response_format` (JSON mode).** Llama 3.2
  Vision's output has to be parsed and validated.
- **Llama 3.2 Vision is gated by Meta's licence** (`AiError 5016`: "submit the
  prompt 'agree'"). Raffaele read the Llama 3.2 Community License and the
  Acceptable Use Policy and authorised acceptance, and `agree` was sent once
  on 2026-09-24. The reply was *"Thank you for agreeing to this model's
  terms."*
- Measured on a tiny test image: Llama 3.2 Vision took 1,908 ms and ~7.6
  neurons, and Scout took 390 ms and ~4.9 neurons.

## Decisions (Raffaele's)

1. **The spike compares the two Llamas only:** Llama 3.2 11B Vision and Llama
   4 Scout 17B. That's closest to the course's Llama theme, and the cheapest.
   The AI had recommended four (adding Mistral Small 3.1 and Moondream 3.1);
   that recommendation was declined, which is recorded here.
2. **Each line is stored both raw and expanded.** The model returns each
   line as printed (`INDOCAFE COFFEEMIX 3IN`) *and* as a readable description
   ("Indocafe coffee mix, 3-in-1"). The raw text is the paper's truth, and the
   expanded text is what categorisation (E.7) and search (D.7) use. That
   answers the C.4 finding (2/10 on shorthand) at the source.
   **`line_item` has one `description` column, so this needs a new column**,
   which is the natural, unanticipated schema change `REQ-D.5` asks for.
3. **Reading runs on a "Read receipt" button, and the user confirms the
   total.** After attaching a photo, the user asks for it to be read. The
   draft pre-fills the merchant (as the description), the **total** (as the
   amount) and an editable list of items. The total is the only money figure
   the user must check, since items are informational (ADR-0018 §1). A button
   means neurons are spent only when asked. **If reading fails, the manual
   form is simply left as it is** (ADR-0016 §2, `REQ-M.7`).
4. **The test receipts are a mix:** 3–5 English receipts from Raffaele, plus 6
   from **SROIE**, the ICDAR 2019 scanned-receipts set, under **CC-BY-4.0**
   (confirmed in the Hugging Face dataset metadata and its NOTICE; attribution
   is required). The SROIE six are the test split's indices 0, 60, 120, 180,
   240 and 300, evenly spaced so they aren't cherry-picked. Their published
   ground truth gives the **total**. Line items aren't in SROIE's labels, so
   they're hand-labelled from the images and checked by Raffaele. The images
   stay in `.data/receipts/` (gitignored) and aren't redistributed.
   SROIE receipts are Malaysian (RM), which doesn't matter for measuring
   reading.

## Scoring, in the order of ADR-0016 §10

1. **Total exactly right.** It's the only money figure, so it's decisive.
2. **Items:** the count found versus the labels, and whether the item amounts
   add up.
3. **Output validity:** parses to the expected JSON shape without repair.
4. **Latency and neurons** per receipt.

Both models get the **same prompt**, at `temperature: 0`, with their output
parsed the same way, so the comparison is fair. Scout's JSON mode is noted as
a production option, not used in the comparison.

## Consequences

- The winner, the numbers and the production prompt are recorded after the
  spike: in this ADR's Status or a successor, per ADR-0016 §10.
- `REQ-D.5` gets its schema change from a real need (decision 2), not a staged
  one.
- **Receipt size is a known risk:** SROIE index 300 is a 4961×7016 scan (1.9
  MB), and phone photos are similar. If a model rejects or degrades on large
  images, resizing becomes a question. It's a Cloudflare Images binding
  candidate, and would be raised then, not assumed now.

## Model choice (2026-09-24)

**Llama 4 Scout 17B**, chosen by Raffaele after a pros-and-cons comparison of
all six live vision models, of which two were measured.

- **Measured against Llama 3.2 11B Vision** on six SROIE receipts, over two
  prompts. Scout got the totals right 5/6 (Llama 3.2: 4/6, then 2/6 on the
  longer prompt), matched 14/14 items against 13/14, returned valid JSON 12/12
  against 9/12, and was about twice as fast. It costs about twice the neurons
  (~64–70 per receipt), which is roughly 140 free reads a day and can't be
  billed on the Free plan.
- **Deciding factors:** accuracy on the total (the only money figure);
  reliability under a growing prompt; a **JSON mode** (Llama 3.2 has none); and
  staying in the Llama family alongside the categoriser.
- **Declined:** adding Mistral Small 3.1 and GLM-5.3-flash to the spike. So the
  evidence supports "Scout beats Llama 3.2", **not** "Scout beats every vision
  model". That limit is stated here on purpose.
- **Correction recorded:** the AI had called GLM-5.3-flash "oversized and
  probably expensive". Its published price ($0.150 / $0.500 per M tokens,
  18B active) is lower than Scout's. That was corrected before this choice was
  made.
- **Confirmation still owed:** Raffaele's 3–5 English receipts. If they
  contradict the SROIE result, this choice is revisited.

