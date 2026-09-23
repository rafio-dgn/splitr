# ADR-0017: `llama-3.1-8b-instruct-fp8` replaces the course's deprecated model; the eval picks E.4's model

- **Status:** Accepted
- **Date:** 2026-09-23
- **Deciders:** Raffaele. The AI measured the options and recommended.
- **Requirement:** `REQ-C.3`, `REQ-E.4`, `REQ-F.4`
- **Amends:** [ADR-0016](./0016-ai-integration-strategy.md) §9 and §12. The eval gains a model axis.

## Context

`REQ-C.3` names an exact model: *"have it answer with
`@cf/meta/llama-3.1-8b-instruct`"*. `REQ-E.4` reuses it for RAG ("generate with
Llama").

Cloudflare **deprecated that model on 2026-05-30**. It was one of eighteen in
the planned-deprecations changelog of 2026-05-08, which the course text
predates. None of this is inferred from docs alone; it was measured through a
real `ai` binding on 2026-09-23:

| Model id | Result |
|---|---|
| `@cf/meta/llama-3.1-8b-instruct` | ❌ `AiError: 5028: @cf/meta/infire-llama-3.1-8b-instruct was deprecated on 2026-05-30` |
| `@cf/meta/llama-3.1-8b-instruct-fp8` | ✅ answered in 311 ms |
| the same, with `response_format: json_schema` | ❌ `AiError: 5025: This model doesn't support JSON Schema.` |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, JSON mode | ✅ valid JSON, 467–1,786 ms, ~3.1 neurons per call |
| `@cf/baai/bge-base-en-v1.5` (`REQ-D.4`) | ✅ 768-dimension vector. Not affected |

**The docs were wrong twice.** The JSON-mode page lists the *deprecated* id as
supported and says nothing on `-fp8`. The `wrangler ai models schema` lookup for
the deprecated id returns `Model schema not found [code: 6002]`. The only
reliable source was a real call.

**An early accuracy signal:** with a thin one-line system prompt, the 70B model
categorised "Pad Thai x2" as `drinks`. That's one sample, not a result, but it's
a concrete reason for ADR-0016's eval.

## Options considered

### Option A — `-fp8` 8B now; the eval decides E.4's model
- Pros: it's the **same Llama 3.1 8B weights**, quantised to FP8, so it's the
  most faithful substitute for what the course named. It's also cheap and fast.
- Cons: no JSON mode. The prompt has to ask for the bare key, and the answer has
  to be parsed and validated in code. The Llama 3.1 family was partly
  deprecated, so `-fp8` may follow.

### Option B — `llama-3.3-70b-instruct-fp8-fast` everywhere
- Pros: still Llama, so "generate with Llama" holds. The platform guarantees
  structured output. It's likely more accurate.
- Cons: 0.5–1.8 s per call and ~3.1 neurons each (about 3,000 calls/day on the
  free 10k neurons). It's the furthest from the named model, and harder to
  defend at the demo.

### Option C — `-fp8` 8B everywhere, fixed
- Pros: the simplest option, and the closest to the course.
- Cons: if 8B proves too inaccurate for categorisation, we'd find out at E.4
  with no alternative measured.

## Decision

We chose **Option A**.

- **`REQ-C.3` (C.4)** uses `@cf/meta/llama-3.1-8b-instruct-fp8`. The Worker
  asks for a bare category key and validates it against the closed taxonomy
  (ADR-0016 §4). Anything invalid becomes `uncategorised`, which is the
  failure state the cron already backfills.
- **`REQ-E.4`'s production model is chosen by the eval.** The ~30-item set
  from ADR-0016 §9 runs on a 2×2 grid: {8B-fp8, 70B} × {no RAG, RAG}. The
  numbers pick the model, and the result is recorded in the E.4 ADR.

Because: it's the closest thing to what the course asked for that still works
today, and it doesn't lock E.4 in before we have evidence.

## Consequences

- **Structured output is our job, not the platform's.** Parsing and
  validating a free-text answer is the same pattern `REQ-M.7` needs anyway:
  model output is untrusted input.
- **The demo explanation:** "The course's model was retired in May 2026. We
  use the same weights, quantised, and measured the alternative." That's a
  `REQ-M.4` answer.
- **Model ids live in one constant per Worker.** When `-fp8` is eventually
  deprecated, the change is one line plus an eval run.
- **Worth telling the course owners.** Every learner following `REQ-C.3` as
  written will hit error 5028. Posting in `#project-jedi` is Raffaele's call.
- **Revisit if:** `-fp8` appears on a deprecation list (check the Workers AI
  changelog before the demo), or the eval shows neither model is usable.

## Verification

- Scratch probe outside the repo (`wrangler dev` with a real `ai` binding;
  calls run on the account) on 2026-09-23. Results are in the table above.
- `wrangler ai models list` shows the live Llamas as `3.2-1b`, `3.2-3b`,
  `3.1-8b-instruct-fp8`, `3.2-11b-vision`, `3.3-70b-instruct-fp8-fast`,
  `4-scout-17b` and `guard-3-8b`. There's no un-suffixed `3.1-8b-instruct`.
- The generated runtime types (workerd 1.20260921.1) list only the `-fp8` and
  `-awq` variants, and the changelog lists `-awq` as deprecated too.
