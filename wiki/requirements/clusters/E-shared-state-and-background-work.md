# Cluster E — Shared state and background work

**Part 3 — Going further.** *"The hard, interesting part: correctness under
concurrency, background work, and hardening."*

Durable Objects · Queues · Workers AI · Cron. Source: capture §8.

---

### REQ-E.1 — The contested-write Durable Object

**Statement:** Build the contested-write Durable Object: one instance per owning
entity via `idFromName`; it validates pre-conditions, writes to D1, returns the
result.

**Acceptance criteria:**
- [x] One DO instance per owning entity, addressed via `idFromName`
- [x] It validates pre-conditions before writing
- [x] It writes to D1
- [x] It returns the result to the caller
- [x] It genuinely arbitrates the contested write from `REQ-P.3` — a second
      concurrent writer is refused, not merged

**Source:** capture §8 · **Status:** ✅ **Done**, 2026-09-25. [ADR-0023](../../decisions/0023-group-ledger-arbitrates-settlements.md); [evidence](../../evidence/REQ-E.1-group-ledger-refuses-the-double-settlement.md): one winner in 5/5 production rounds

**Notes:** "One instance per **owning entity**" — the entity being contested, not
necessarily the user. In EdgeLedger it is the user (their own balance); in
ClaimCheck it would be the asset, contested by two reviewers. Choose the id by
asking *what is being fought over*.

---

### REQ-E.2 — Idempotency key with a 24h cache

**Statement:** Accept an `idempotencyKey` header and cache the response for **24h**:
a replay returns the cached result, never a duplicate write.

**Acceptance criteria:**
- [x] The key arrives as a **header** named `idempotencyKey`
- [x] The response is cached for **24 hours**
- [x] A replay returns the cached result byte-for-byte
- [x] A replay produces **no** second write
- [x] Expired entries are cleaned up

**Source:** capture §8 · **Status:** ✅ **Done**, 2026-09-25. The header `idempotencyKey`; a byte-identical replay with no second write (on production); alarm eviction proved in workerd

**Notes:** Header, not body field. 24h is specified exactly. The concepts list
pairs this with alarms — *"idempotency keys & alarms: make retries safe; schedule
deferred work without a scheduler"* — so a DO alarm is the intended cleanup
mechanism.

---

### REQ-E.3 — `[AUDIT]` line on every mutation

**Statement:** Emit an `[AUDIT]` line on **every** mutation.

**Acceptance criteria:**
- [x] Every mutation emits one
- [x] Emitted after the write is durable
- [x] Fields: actor, action, target, timestamp, outcome (per `REQ-F.3`)

**Source:** capture §8, §13 · **Status:** ✅ **Done**, 2026-09-25. Every mutation (group create/join, expense add, settlement) emits `[AUDIT]` after the durable write; the settlement line now comes from the DO

---

### REQ-E.4 — RAG in the AI Worker

**Statement:** Make the AI Worker do **RAG**: retrieve similar records from
Vectorize, generate with Llama grounded in your own data.

**Acceptance criteria:**
- [ ] Retrieves similar records from the Vectorize index (`REQ-D.4`)
- [ ] Generates with Llama, grounded in the retrieved records
- [ ] **No public URL** — `workers_dev: false`
- [ ] A shared-secret check on every request
- [ ] A fallback so its failure **never blocks the primary write**

**Source:** capture §8 · **Status:** 🟡 In progress (2026-09-25). `splitr-ai`
retrieves (Vectorize, group first, then the seed), generates with Llama 3.1 8B
grounded in the retrieved items, has `workers_dev: false`, and checks the
shared secret on every call. Verified locally through a real service binding,
with an eval of 28/30 against 23/30 without RAG
([evidence](../../evidence/REQ-E.4-rag-categorisation-eval.md)). **Left:** the
first deploy, and the app wiring with its write-path fallback (ADR-0025 steps
4–5).

**Notes:** Four sub-requirements in one bullet. The fallback clause is the same
rule as `REQ-M.7` — the write path must survive the AI Worker being down or slow.

---

### REQ-E.5 — Call the DO through a service binding

**Statement:** Call the DO from your Server Action through a **service binding**,
not over HTTP.

**Acceptance criteria:**
- [x] The Server Action reaches the DO worker via a service binding
- [x] No public hostname, no HTTPS hop
- [x] The DO worker sets `workers_dev: false`

**Source:** capture §8, §13 · **Status:** ✅ **Done**, 2026-09-25. Service binding `LEDGER` → `splitr-ledger#LedgerService`; `workers_dev: false` (Cloudflare 1042)

---

### REQ-E.6 — `scheduled()` handler with UPSERT-on-conflict, proven idempotent

**Statement:** Add a `scheduled()` handler using **UPSERT-on-conflict**; run it
twice and confirm the result is identical.

**Acceptance criteria:**
- [ ] A `scheduled()` handler exists, wired to a cron trigger
- [ ] Writes use UPSERT-on-conflict
- [ ] **Demonstrated:** run twice, results identical
- [ ] A manual trigger exists so this can be shown without waiting for the cron

**Source:** capture §8 · **Status:** Blocked on `REQ-D.1`

**Notes:** The double-run proof is the requirement. Deterministic composite keys
are what make the UPSERT idempotent. Remember `ctx.waitUntil` (`REQ-C.5` Q3).

---

### REQ-E.7 — Answer the cluster questions

**Statement:** Be able to answer, unaided:
1. **In one sentence, what conflict does your DO prevent?**
2. What happens if the AI or service Worker is slow or down?
3. Why is it safe to run your scheduled task twice?

**Acceptance criteria:**
- [ ] All three answered without notes
- [ ] Q1 answered in genuinely one sentence

**Source:** capture §8 · **Status:** Not started

**Notes:** Q1 is the whole project in one sentence, and it traces straight back
to `REQ-P.3` and `REQ-0.5`. If it is hard to answer crisply, the project idea was
the problem, not the code.

---

### REQ-E.8 — Queue + consumer `[OPTIONAL]`

**Statement:** The DO emits events after each mutation; the consumer batches,
retries with backoff, dead-letters failures. Type events as a **discriminated
union** so exhaustiveness checks catch unhandled cases.

**Acceptance criteria (if in scope):**
- [ ] The DO emits an event after each mutation
- [ ] The consumer batches
- [ ] Retries with backoff
- [ ] Failures dead-letter to a DLQ
- [ ] Events typed as a discriminated union with an exhaustiveness check

**Source:** capture §8 · **Status:** ❌ **Dropped** — out of scope.
[ADR-0005](../../decisions/0005-optional-scope.md). Requires a Workers Paid plan;
we stay on the free tier. Deferred work goes through Cron (`REQ-E.6`) instead.

**Notes:** ⚠️ Queues requires a **Workers Paid** plan, while §0.2 says the free
tier suffices for the whole path. That is consistent only because this item is
optional. If we stay on the free tier, this is out of scope — record it as an ADR
rather than leaving it ambiguous.

---

## Concepts to master

| Concept | What it gets you |
|---|---|
| Durable Objects: single-writer | Recognise a contested write on sight; know when a DO is the answer. |
| Idempotency keys & alarms | Make retries safe; schedule deferred work without a scheduler. |
| Service bindings | One Worker calls another: no public URL, no HTTPS hop. |
| Scheduled handlers | Recurring work that is safe to run twice. |
| Queues: retry & DLQ | Async work that survives a consumer crash. |
| Workers AI + RAG | Inference without a third-party key; with Vectorize, answers grounded in your own data. |

**Optional refreshers:** Durable Objects (Theo's intro) · Private AI chatbot with
Llama 3.1 on Workers · Workers AI in 3 minutes.
