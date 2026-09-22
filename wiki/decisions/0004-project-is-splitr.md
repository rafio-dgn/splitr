# ADR-0004: The project is Splitr

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Raffaele Di Gennaro
- **Requirement:** `REQ-P.1`, `REQ-P.2`, `REQ-P.3`, `REQ-0.5`

## Context

`REQ-P.1` requires picking a project idea; `REQ-P.3` requires it to have a
genuine contested write; `REQ-P.2` requires it to use about five of the eight
Cloudflare building blocks naturally. The course offers six suggested ideas
(§2.4) and the option of our own.

This choice gates almost the entire build: the route tree, the D1 schema, what
lives in KV / R2 / Vectorize, and — most importantly — what the Durable Object
arbitrates.

## Options considered

### Option A — ClaimCheck (MLR pre-flight)
- Pros: the course wires this one up in full (§2.5), so there is a worked
  reference architecture. Covers all eight blocks. Pharma-relevant to NewPage.
- Cons: the contested write (two reviewers, one verdict) is real but soft — a
  reviewer who claims and abandons an asset is an inconvenience, not a
  correctness bug. Demoing it needs several minutes of MLR context before the
  panel can see why any of it matters.

### Option B — TrialDesk (study inbox)
- Pros: claim-a-query is a clean contested write. Natural public intake form for
  Turnstile. Covers all eight blocks.
- Cons: same demo problem as ClaimCheck — clinical-operations context has to be
  explained first. RAG over a protocol is the most interesting part, and it is
  the part hardest to show working in 15 minutes.

### Option C — Splitr (snap the bill)
- Pros: the contested write is unambiguous — two people settling the same debt,
  the second **must** be refused, and merging is plainly wrong. Needs no domain
  explanation: a panel understands splitting a bill instantly. Receipt photos
  make `REQ-D.3` (presigned uploads) meaningful rather than contrived.
- Cons: requires a **vision model**, which is scope beyond the two models the
  course names. Vectorize does not fit naturally and needs a deliberate stretch
  feature.

### Option D — BenchBook / InsightDesk
- Not seriously considered: both require Whisper transcription, which is the same
  extra-scope cost as Splitr's vision model *plus* a harder demo.

## Decision

We chose **Option C — Splitr**.

Because: the contested write is the spine of this course, and Splitr's is the
only candidate where the correct behaviour is self-evident and the failure mode
is visible without explanation. `REQ-E.7` asks for the conflict in one sentence
and `REQ-X.8` allots 15 minutes — an idea that needs five of them on background
is spending its budget in the wrong place.

The contested write, stated once: **two group members recording the same
settlement at the same moment; the second must be refused, not merged.**

## Consequences

- **Makes easy:** the demo; justifying D1, DO, R2, KV, Cron and Workers AI as
  natural fits; showing the without-a-DO failure mode live.
- **Makes hard:** Vectorize has no natural home. Mitigated by a deliberate
  stretch feature — semantic search over past expenses, which is genuinely
  non-keyword because receipt merchant strings are cryptic (`SQ *TOAST LDN`).
  Recorded honestly in the brief; `REQ-M.4` is better served by admitting this
  than by inventing a rationale.
- **Adds scope:** a vision model for receipt OCR, on top of the course's named
  `@cf/meta/llama-3.1-8b-instruct` and `@cf/baai/bge-base-en-v1.5`. Accepted as
  inherent to the product. Model choice deferred to Cluster C/E.
- **Requires designing a public surface:** Turnstile (`REQ-F.2`) needs an
  unauthenticated form. The invite-link join-group page is it, and it must be
  designed deliberately rather than bolted on at Cluster F.
- **Implies auth is needed** (`REQ-B.5`) — groups presuppose identity. Per the
  course, a library used as a black box.
- Revisit if: receipt OCR quality proves unusable across candidate vision models,
  which would undermine the product's premise.

## Verification

Checked against the requirements before accepting:
- `REQ-P.3` — the contested write refuses rather than merges. ✅
- `REQ-P.2` — eight of eight blocks mapped, seven natural, one (Vectorize) via a
  declared stretch feature, as the requirement explicitly permits. ✅
- `REQ-0.5` — what it is / who it's for / the contested write are all written, in
  [`../context/project-brief.md`](../context/project-brief.md), ready for the
  repo README. ✅
- Vision-model availability confirmed against Cloudflare's live model catalogue
  rather than assumed: `@cf/meta/llama-3.2-11b-vision-instruct` and
  `@cf/llava-hf/llava-1.5-7b-hf` both exist, and Moondream 3 documents OCR and
  structured output.
