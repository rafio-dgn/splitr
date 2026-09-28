# `REQ-F.1`: settle-up rate limit, six rapid requests, the sixth is 429

**Date:** 2026-09-28 · **Decision and rationale:** [ADR-0029](../decisions/0029-settle-up-rate-limit.md) · **Binding:** `SETTLE_LIMITER`, 5 per 60 s, key `settle:<userId>`
**Verified:** the production build (webpack) in the local Workers runtime. **On production:** Raffaele's, after the merge.

---

## The criteria

| Criterion | Met by |
|---|---|
| A rate-limit binding guards the busiest write route | `wrangler.jsonc` → `ratelimits` → `SETTLE_LIMITER`, checked first in `recordSettlement` (the form and the curl route) |
| Six rapid requests, the sixth 429 | Below |
| A production window and count | **5 per 60 s per signed-in user** |
| The rationale, written down | ADR-0029, "The rationale for 5 per 60 s" |

## HTTP (`scripts/verify/rate-limit.mjs`), on the production build

```
$ node scripts/verify/rate-limit.mjs http://localhost:8787
  · Alice's six rapid requests → 201, 201, 201, 201, 201, 429
  ✔ requests 1–5 are accepted (201)
  ✔ the 6th returns 429
  ✔ …with Retry-After: 60
  ✔ D1 holds exactly 5 settlements: the refused request wrote nothing
  ✔ Bob's request in the same minute is accepted: the limit is per user
rate-limit passed

[AUDIT] {"actor":"Op1B…","action":"settlement.record","target":"unknown","timestamp":"2026-09-28T11:55:24.102Z","outcome":"refused:rate-limited","persisted":false,"detail":{"limit":5,"periodSeconds":60}}
```

## The form, in a browser, on the production build

```
submit 1: Settled
submit 2: Settled
submit 3: Settled
submit 4: Settled
submit 5: Settled
submit 6: RATE-LIMITED message shown
```

The screen says: *"That's a lot of settle-up attempts in a short time. Nothing
was recorded. Wait a minute, then try again."* The form keeps its values, and
the balance shows £35 still owed (5 × £1 recorded, not 6).

## Found on the way

1. **The form had no message for the new result.** Each status renders its
   own message, so `rate-limited` would have rendered **nothing**. Added.
2. **Under `next dev`, the form path wasn't limited** (six "Settled"), although
   the HTTP path was. On the production build both are limited. This is a
   local-proxy artefact, not a code path that ships.
3. **`SETTLE_LIMITER` was typed `any`** (`RateLimit` wasn't aliased for the
   app's program). Caught by the lesson-6 probe, and fixed.

## On production (Raffaele, after the merge)

```
node scripts/verify/rate-limit.mjs https://splitr.raffaele-digennaro.workers.dev
```

Leave a minute after any other script that settles as the same user.

## Production, run 1 (2026-09-28, Raffaele): the binding alone let a burst through

```
$ node scripts/verify/rate-limit.mjs https://splitr.raffaele-digennaro.workers.dev
  · Alice's six rapid requests → 201, 201, 201, 201, 201, 201
✘ the 6th returns 429
```

- The deploy had finished 90 s before the run (the id `rl-mul7ju9i` decodes
  to 12:12:32Z, and the version was created at 12:11:00Z).
- `wrangler versions view` showed the binding live:
  `env.SETTLE_LIMITER (5 requests/60s)`.
- **Cause, from Cloudflare's docs:** the binding is "permissive, eventually
  consistent", with counters cached per machine and updated asynchronously.
- **Fix:** an exact per-user counter (the `SettleRateLimiter` Durable Object)
  behind the binding (ADR-0029 amendment).

After the fix, locally (both paths, refused at the 6th):

```
== form, under next dev
submit 1–5: Settled
submit 6: RATE-LIMITED message shown
== HTTP
  · Alice's six rapid requests → 201, 201, 201, 201, 201, 429
  ✔ …with Retry-After: 60 s (1–60)
  ✔ D1 holds exactly 5 settlements: the refused request wrote nothing
  ✔ Bob's request in the same minute is accepted: the limit is per user
rate-limit passed
```

In workerd, against the real Durable Object:
**20 simultaneous requests from one user → exactly 5 allowed.**

## Production, after the fix (2026-09-28, Raffaele): met

```
$ node scripts/verify/rate-limit.mjs https://splitr.raffaele-digennaro.workers.dev
rate-limit rl-mulaaoll-6a202f → https://splitr.raffaele-digennaro.workers.dev
  ✔ sign-up alice.rl-mulaaoll-6a202f@example.test → 200
  ✔ sign-up bob.rl-mulaaoll-6a202f@example.test → 200
  ✔ expense "RL dinner" £80.00 → 201
  · Alice's six rapid requests → 201, 201, 201, 201, 201, 429
  ✔ requests 1–5 are accepted (201)
  ✔ the 6th returns 429
  ✔ …with Retry-After: 58 s (1–60)
  ✔ D1 holds exactly 5 settlements: the refused request wrote nothing
  ✔ Bob's request in the same minute is accepted: the limit is per user
cleanup: 2 user(s), 1 group(s), 1 expense(s), 1 vector id(s), 0 receipt(s)
cleanup: done, D1 re-checked (0 rows left)

rate-limit passed
```

**`Retry-After: 58` shows which layer refused.** The binding always answers
60. The exact counter answers with the real time until its oldest slot
frees up. So on production the burst got past the binding (as in run 1), and
the per-user `SettleRateLimiter` refused the 6th. The two-layer design worked
exactly as the amendment intended.

