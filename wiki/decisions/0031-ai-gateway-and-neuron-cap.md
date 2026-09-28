# ADR-0031: Every model call through the `splitr` AI Gateway, with our own daily neuron cap

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Raffaele, in five structured questions: caching, logging, the
  gateway rate limit, the spend cap, and how the cap counts cache hits. He also
  made the choices on the gateway's form. The AI proposed the options and
  recommended; he chose the recommendation each time.
- **Requirement:** `REQ-F.4`

## Context

`REQ-F.4`: put AI Gateway in front of every model call, with caching, logs,
rate limits, and a spend cap on the LLM route.

Since ADR-0025 step 5, **every model call Splitr makes lives in one file**,
`workers/ai/src/index.ts` (`splitr-ai`):
- embeddings for search queries, indexing and retrieval;
- Llama for categorising;
- Llama 4 Scout for reading receipts.

The app has no `ai` binding. So "every call" means one change in one place:
the `gateway` option on `env.AI.run`.

Three facts shaped the design:
1. **The gateway must exist first.** A probe with an unknown id failed every
   call with `AiGatewayError: 2001: Please configure AI Gateway in the
   Cloudflare dashboard`. So Raffaele created `splitr` in the dashboard
   *before* this merges.
2. **AI Gateway's Spend Limits are documented for models "with known
   pricing"**, and the docs don't say whether that includes Workers AI
   neurons. A cap we can't show working doesn't meet the criterion.
3. **Workers AI includes 10,000 neurons a day free**, on both plans. Above that,
   the Paid plan charges $0.011 per 1,000.

## Decisions

1. **The gateway `splitr`**, created by Raffaele in the dashboard:

   | Setting | Value |
   |---|---|
   | Collect logs | on (10,000 kept, oldest deleted) |
   | Cache responses | on (1 day) |
   | Rate limit | 100 requests per minute |
   | Spend limits | off |
   | Retries | off (ADR-0025: the nightly cron is the retry) |
   | Authenticated gateway | on (a Worker binding is authenticated automatically, so no token is needed) |
   | Billing | standard |

   The id is a var, `AI_GATEWAY_ID`, in `workers/ai/wrangler.jsonc`.

2. **One wrapper, `metered(env, op, call)`**, through which every model call
   goes. It:
   1. checks the day's cap;
   2. passes the gateway options for that operation, with `metadata: { op }` so
      the gateway's logs say what each call was for;
   3. adds the neurons the call reports;
   4. logs `[ai] gateway op=… log=<gateway log id> neurons=…`.

   The operations are `categorise`, `embed-query`, `embed-index`,
   `embed-retrieve` and `read-receipt`, passed explicitly by each caller and
   never guessed.

3. **Caching (Raffaele):** text calls are cached for **1 day**
   (`cacheTtl: 86400`). **Receipt reads are never cached** (`skipCache: true`):
   a photo never repeats, and it shouldn't sit in a cache.
   - The cache key is the whole request. A categorise prompt includes its
     retrieved neighbours, so when the corpus changes, the key changes too. A
     cached answer is never one computed from different examples.

4. **Logging (Raffaele):** everything is logged **except receipt reads**
   (`collectLog: false`), so photos never reach the gateway's log storage.

5. **The spend cap is our own (Raffaele): 8,000 neurons a day (UTC)**.
   - It's 80% of the free 10,000. The headroom covers embeddings, which
     report no neurons.
   - It's held in a `NeuronBudget` Durable Object, **one per UTC day**. A
     Durable Object handles one event at a time, so concurrent additions never
     lose a count. An alarm deletes each day's storage two days later.
   - It's set by the `AI_NEURON_CAP` var (default 8,000).
   - At the cap, calls are refused with `NeuronCapReached`. Every caller
     already falls back on a model failure:
     - the item stays `uncategorised`, and the nightly cron retries it;
     - search falls back to keyword, with the note;
     - "Read receipt" shows its error, and the person types the expense.
   - It's a soft cap by design: calls already in flight when the total crosses
     8,000 still finish.

6. **Cache hits are counted too (Raffaele).** Measured: a cached Llama
   response still carries its original `usage.neurons`, although the gateway
   logs it as `cached: true, cost: 0`. So the cap over-counts: it trips early,
   never late.
   - *Rejected:* checking each call's log with `getLog` and counting only
     misses. It costs a round trip per call, and logs are written
     asynchronously (seconds later, in the probe), so a call could still be
     counted wrongly.

*Rejected:*
- **the gateway's Spend Limits (beta):** it isn't documented for Workers AI.
  It can be added later on top of our cap;
- **gateway retries:** they would spend neurons on failures ADR-0025 already
  handles (no inline retries);
- **caching receipts:** no hits, and photos kept in a cache;
- **no cap of our own, relying on the rate limit:** 100 calls a minute is not
  a daily budget.

## Scope: what "every model call" covers

Every call **the app makes**, all of which are in `splitr-ai`. The offline
eval harness (`scripts/categorise/eval-worker/`) and the D.6 vision spike
(`scripts/vision-spike/`) call Workers AI directly. They are dev tools that
Raffaele runs by hand, never deployed with the app, and are deliberately left
as they were: their results are the historical record of ADR-0021/0025.

## Consequences

- **A deploy order:** the gateway must exist before `splitr-ai` deploys (error
  2001 otherwise). `splitr` exists now. A new environment would need it created
  first, which is written in the `wrangler.jsonc` comment.
- **The rate limit is gateway-wide**, not per user: 100 real (uncached) calls
  a minute across all of Splitr. Cache hits don't count (measured). When it
  trips, calls fail with `2003: Rate limited`, and the same fallbacks apply. A
  large nightly sweep could reach it. The cron then retries the rest the next
  night, which is ADR-0025's design.
- **Cost:** AI Gateway's caching, rate limiting and analytics are free. Logs
  follow Workers Logs pricing (200,000 events a day free; the Paid plan
  includes 20 million a month), far above Splitr's volume. Workers AI stays
  under the free 10,000 neurons a day, because the cap is 8,000.
- **The cap is per account-day, not per user.** One heavy user could use up
  the day's budget for everyone. That's acceptable at this scale; per-user
  quotas would be a new decision.

## Verification

In the evidence: [REQ-F.4](../evidence/REQ-F.4-ai-gateway.md).
- 4 pure tests for the budget (`neuron-budget.test.ts`).
- With the cap set to 0 locally: the save still succeeds, the item stays
  uncategorised, and search falls back to keyword.
- Probes against the real `splitr` gateway: cache hits for Llama and
  embeddings, and the rate limit refusing 21 of 120 uncached calls.
- The full E2E through the gateway, with the logs read back: the receipt read
  not logged, and search repeats served from the cache.
- **Production, after the merge:** Raffaele checks the gateway's Logs tab in
  the dashboard.
