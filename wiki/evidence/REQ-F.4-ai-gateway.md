# `REQ-F.4`: AI Gateway in front of every model call

**Date:** 2026-09-28 · **Decision:** [ADR-0031](../decisions/0031-ai-gateway-and-neuron-cap.md) · **Gateway:** `splitr` (created by Raffaele in the dashboard)
**Verified:** locally, through the **real** `splitr` gateway (the AI binding is remote even in dev). **On production:** Raffaele checks the Logs tab after the merge.

---

## The criteria

| Criterion | Met by | Shown below |
|---|---|---|
| **Every** model call routes through AI Gateway | `metered()` in `workers/ai/src/index.ts` wraps all five operations. `splitr-ai` is the only place the app calls a model (ADR-0025 step 5) | §3: every call in the E2E has a gateway log id |
| Caching enabled | Gateway cache on (1 day). Text calls pass `cacheTtl: 86400`; receipt reads pass `skipCache: true` | §1, §3 |
| Logs visible | Gateway logs on, with `metadata.op` on each. Receipt reads pass `collectLog: false` | §3: read back with `getLog` |
| Rate limits configured | Gateway rate limit: 100 per minute | §2 |
| A spend cap on the LLM route | `NeuronBudget` DO, 8,000 neurons a day (UTC) | §4 |

## 1. Cache hits, Llama and embeddings (probe Worker, the `splitr` gateway)

The same Llama request was sent twice, 10 s apart, then the whole probe was run
again. Each call's log was read back with `env.AI.gateway("splitr").getLog(id)`.

```
--- run 1
llama 1   563 ms  'Probe closed.'  cached=False  neurons=0.3495  cost=3.84e-06
llama 2   387 ms  'Probe closed.'  cached=True   neurons=0.3495  cost=0
embed     90 ms                    cached=True   neurons=None    cost=0
embed     99 ms                    cached=True   neurons=None    cost=0
--- run 2
llama 1   122 ms  'Probe closed.'  cached=True   neurons=0.3495  cost=0
llama 2   237 ms  'Probe closed.'  cached=True   neurons=0.3495  cost=0
```

Two things were found:
- **A request repeated milliseconds later was not yet a hit.** In an earlier
  run with no pause, the second call was `cached=False`: the cache entry is
  written after the first response.
- **A cache hit still reports the original `usage.neurons`**, although the
  gateway logs its cost as 0. Our cap counts it anyway (Raffaele's choice,
  ADR-0031 §6): it over-counts, so it trips early and never late.

## 2. The rate limit (probe Worker, 120 simultaneous uncached calls)

```
16:00:26  110 identical (cached) embedding calls → {"ok": 110}
16:00:38  120 distinct uncached calls (skipCache) → {"ok": 99, "AiGatewayError: 2003: Rate limited": 21}
          5 more, immediately                   → {"AiGatewayError: 2003: Rate limited": 5}
```

The limit is about 100 a minute, and **cache hits don't count toward it**. The
test cost about $0.00004 in embeddings.

## 3. The full E2E through the gateway (`next dev` + the ledger + `splitr-ai`, locally)

```
$ node scripts/verify/e2e.mjs http://localhost:3100
  ✔ … (17 checks: sign-up, group, join, dinner, receipt read and confirm, settle race, search)
  · read: "CORNER CAFE", £9.50, 3 item(s)
  ✔ search "croissant" finds "CORNER CAFE"
cleanup: done, D1 re-checked (0 rows left)
e2e passed
```

The AI Worker's log, one line per model call:

```
[ai] gateway op=embed-index    log=01M3MBEW7296ZJ8MVV38B2MCN1 neurons=0.00
[ai] gateway op=read-receipt   log=01M3MBF0P2GB0F6MDGABQ791FP neurons=48.90
[ai] gateway op=embed-index    log=01M3MBF5Y5ZFZWS8W60MQY8C41 neurons=0.00
[ai] gateway op=embed-retrieve log=01M3MBF7N3AFHPDN16PYPYB16X neurons=0.00
[ai] gateway op=categorise     log=01M3MBF91BGNMG84WG10V4SMF1 neurons=5.04
[ai] gateway op=categorise     log=01M3MBF937BYYT76WYWD8VRMPY neurons=5.29
[ai] gateway op=categorise     log=01M3MBF934XYFV41HV091TX8M3 neurons=5.04
[ai] gateway op=embed-query    log=01M3MBFCJ6DEQ1QY0FJJSR3RQX neurons=0.00
[ai] gateway op=embed-query    log=01M3MBFR2E95KAHGNN5ZCSR3W8 neurons=0.00
… 15 more embed-query (the E2E polls search until Vectorize answers)
```

Those logs, read back from the gateway:

| Log | Op | Gateway says |
|---|---|---|
| `…F0P2GB0F6MDGABQ791FP` | read-receipt | **`AiGatewayLogNotFound`**: not logged, as intended |
| `…F91BGNMG84WG10V4SMF1` | categorise | `cached: false`, `model: @cf/meta/llama-3.1-8b-instruct-fp8`, `metadata: {op: categorise}` |
| `…FCJ6DEQ1QY0FJJSR3RQX` | embed-query | first search: `cached: false`, cost 3.3e-07 |
| `…FR2E95KAHGNN5ZCSR3W8` | embed-query | the repeat: **`cached: true`, cost 0** |
| `…N060WJFD48PZPPP68QZ8` | embed-query | the last repeat: **`cached: true`, cost 0** |

## 4. The spend cap, at 0 (locally, `AI_NEURON_CAP=0` in `workers/ai/.dev.vars`, since restored)

```
save with the cap at 0 → 201
category after 4 s: uncategorised
search → 200, keyword fallback note shown: true, hit found: true

[ai] neuron-cap reached op=embed-query spent=0.0 cap=0
[ai] index status=failed
[ai] neuron-cap reached op=embed-retrieve spent=0.0 cap=0
[ai] categorise status=failed items=1 ms=-
```

The expense still saves, the item waits for the nightly cron, and search still
answers by keyword. `neuron-budget.test.ts` covers the day key, the cap
parsing, the boundary (at the cap is refused) and reading the neurons (4 tests).

## On production (Raffaele, after the merge)

1. In the dashboard, open AI → AI Gateway → `splitr` → **Logs**.
2. On the live site, add an expense with an item, and search for it twice.
3. **Expected:** `categorise`, `embed-index`, `embed-retrieve` and
   `embed-query` rows with `metadata.op`, the second search marked cached, and
   no `read-receipt` rows.

**Raffaele's run, 2026-09-28** (after PR #22; the deploy finished at 16:11:18 UTC).
These are read off his screenshots of the dashboard's Logs tab. The dashboard
shows WEST (UTC+1); the times below are UTC.

| UTC | Model | In | Cost | ms | Status | What it is |
|---|---|---|---|---|---|---|
| 19:24:00–19:24:07 | bge-base-en-v1.5 (×7) | — | $0 | 7–20 | ✔ **cached** | repeat searches: cache hits |
| 19:23:57 | bge-base-en-v1.5 | 3 | $0.00000022 | 265 | ✔ | the first search: a miss |
| 19:19:14 | llama-3.1-8b-instruct (×2) | 352 / 365 | ~$0.000054 / ~$0.000056 | 725 / 636 | ✔ | categorising the two items |
| 19:19:11 | bge-base-en-v1.5 (×2) | 12 / 18 | $0.00000077 / $0.00000121 | 1057 / 1014 | ✔ | indexing and retrieval for the new expense |
| 16:10:58–16:11:00 | bge-base-en-v1.5 (×2) | 4 | $0.00000022 | 451 / 1473 | ✔ | the deploy's smoke test |
| 16:00:41 | bge-base-en-v1.5 (×5 visible) | — | — | 35–74 | ⚠ | **the rate-limit probe's refusals** (§2), as Cloudflare records them |
| 16:00:40 | bge-base-en-v1.5 (many) | 14 | $0.00000088 | 377–1171 | ✔ | the probe's allowed calls |

- **The rate limit, as saved:** "Limit to 100 requests every 1 minute
  (**sliding** period)" (Raffaele, from the gateway's settings).
- **No Llama 4 Scout rows.** No receipt was read in this run, so this shows
  nothing about receipt logging. The local `getLog` check (§3) is the proof of
  that.
- The dashboard banner: *"You're on the free plan with 200K events per day."*
- `metadata.op` isn't a column in this view. It was confirmed through `getLog`
  locally (§3).
- **Found:** search has **no link in the app**. It's reachable only at
  `/search`, and every script had opened it by URL.
