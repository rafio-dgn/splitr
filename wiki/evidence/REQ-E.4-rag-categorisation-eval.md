# `REQ-E.4`: RAG categorisation, the eval that picked the model

**Date:** 2026-09-25 · **Decision:** [ADR-0025](../decisions/0025-rag-worker-eval-seed-secret-fallback.md) · **Labels approved by:** Raffaele
**Where it ran:** `splitr-ai` under `wrangler dev` (local), reached through a real **service binding** from the dev-only harness `scripts/categorise/eval-worker`. Workers AI and Vectorize are remote (the real index).

---

## The set

30 items in `scripts/categorise/eval-set.json`:
- **10 clean** descriptions;
- **10 receipt shorthand** items, where the model sees only the raw print (the
  worst case);
- **10 group-dependent** items: 5 identical texts, each in two groups with
  opposite habits (a flatshare and a holiday), with 20 planted history items
  per group.

Clean and shorthand items run against an empty group, so their RAG examples
come from the 50-item seed corpus only. The runner refuses to start unless the
labels are approved and no eval item can be retrieved (no leakage).

## Results: 3 runs per cell

```
$ node scripts/categorise/run-eval.mjs --runs 3
| Model | RAG | Overall | Clean | Shorthand | Group | Median ms | p95 ms | Median neurons | Timeouts/failures |
|---|---|---|---|---|---|---|---|---|---|
| 8b | no | **23.0/30** (runs: 23/23/23) | 10.0/10 | 8.0/10 | 5.0/10 | 501 | 847 | 4.21 | 0 |
| 8b | yes | **28.0/30** (runs: 28/28/28) | 10.0/10 | 10.0/10 | 8.0/10 | 1136 | 1516 | 5.08 | 0 |
| 70b | no | **24.7/30** (runs: 25/24/25) | 10.0/10 | 10.0/10 | 4.7/10 | 394 | 1324 | 9.15 | 0 |
| 70b | yes | **26.0/30** (runs: 26/26/26) | 10.0/10 | 10.0/10 | 6.0/10 | 981 | 3058 | 10.80 | 0 |

Threshold sweep (8B + RAG, group set, 1 run):
  threshold 0.5: 8/10 correct, seed topped up for 0/10
  threshold 0.6: 8/10 correct, seed topped up for 3/10
  threshold 0.7: 6/10 correct, seed topped up for 10/10
  threshold 0.8: 5/10 correct, seed topped up for 10/10

Misses in the best RAG cell's first run:
  8b g03 (group): expected gifts, got groceries (raw "groceries")
  8b g06 (group): expected travel_lodging, got transport (raw "transport")
```

(`ms` is the whole AI Worker call: embed, retrieval, D1/metadata resolution
and generation.)

## What it shows

1. **RAG earns its place.** Group-dependent items go from 5/10 (a coin flip,
   which is what "no history" should score) to 8/10. RAG also lifts 8B's
   shorthand from 8/10 to 10/10.
2. **The bigger model is worse at following a group.** 70B + RAG scores 6/10
   on group habits: it leans on its general knowledge over the examples, at
   twice the neurons and twice the p95.
3. **The threshold matters, and 0.6 holds.** At 0.7 and above, the group's
   own history stops counting and the seed floods in, and accuracy falls to the
   no-RAG level.
4. **8B is deterministic here** (`temperature: 0`): identical scores in all
   3 runs. 70B varied by one item.
5. **The budget holds:** 0 timeouts in 400 calls, with a p95 of 1.5 s for the
   chosen cell against the 8 s budget.

**Raffaele chose 8B + RAG with a 0.6 threshold** (structured question,
2026-09-25). Those are the code's defaults.

## The AI Worker's boundaries, through the real binding

```
wrong secret (harness started with --var AI_SHARED_SECRET:not-the-secret):
{"status":"refused"}
AI Worker log:  [ai] categorise status=refused      (the secret itself is never logged)
plain HTTP to the AI Worker:  404
```

In production, `workers_dev: false` means there's no URL at all. That's
proved for the ledger (Cloudflare 1042), and will be for `splitr-ai` at its
first deploy.

## Unit tests (`node --test`, fakes for every binding)

These 16 tests cover: the secret check (list, blanks, fail closed), the
answer parsing (noise tolerated; sentences, two keys and `uncategorised`
refused), prompt ordering, the seed top-up asking only for what's missing, the
item itself and uncategorised neighbours never used as examples, the no-RAG
baseline, a timeout, and a throwing binding. **Mutation-checked:** always
querying the seed, and skipping the secret check, each fail a test.

## Cost

About 1,100 neurons per full run of the grid plus the sweep. About 4,000 in
total today (1 + 3 runs), inside the free 10k per day.
