# `REQ-F.5`: the secret-rotation drill, wrong then right

**Date:** 2026-09-28 (parts 1–2), 2026-09-29 (part 3) · **Decision:** [ADR-0032](../decisions/0032-secret-rotation-drill.md) · **Secret:** `AI_SHARED_SECRET`, sent by `splitr` and `splitr-cron`, checked by `splitr-ai` against `AI_SHARED_SECRETS`
**Run by:** Raffaele, on production, with `scripts/verify/rotation-drill.mjs`. The AI wrote the script and reads its log.

---

## The criteria

| Criterion | Where |
|---|---|
| The wrong way first, and the breakage observed | Part 1 |
| Then correctly: dual-key window → deploy consumer → update producer → retire old key | Parts 2 and 3 |
| No downtime during the correct rotation | Parts 2 and 3: the script's "NO DOWNTIME" line (every search answered by meaning) |
| Both outcomes written up | "What happened", at the end |

## Local rehearsal (2026-09-28, before production)

```
rotation-monitor rot-mulnsg90-38b550 → http://localhost:3100
.......
19:47:25  ✘ KEYWORD FALLBACK: the AI Worker didn't answer
xxxxxxxxxxxxxxxx
19:48:00  ✔ by meaning again
......
summary: 31 searches: 14 by meaning, 17 keyword fallback, 0 errors
  ✘ fallback from 19:47:25 to 19:48:00 UTC (17 searches)

splitr-ai, with the stale key:   10 × [ai] embed status=refused key=none/1
splitr-ai, with the right key:    7 × [ai] embed status=ok key=1/1
```

---

## How to run it (Raffaele): one guided command per day

The first runbook (three terminals, hand-typed commands) was too hard to
follow (Raffaele, 2026-09-28), so `scripts/verify/rotation-drill.mjs` now
does the work. It runs every command itself and **pauses before each step**,
saying what it's about to do and what you should see.

**Day 1 (today, ~10 min):**

```sh
node scripts/verify/rotation-drill.mjs day1
```

Press Enter at each of the 5 pauses:
- steps 1–2 are Part 1, the wrong way, then recovering;
- steps 3–5 are Part 2, the right way.

**Day 2 (after 02:30 UTC, i.e. 03:30 WEST, ~3 min):**

```sh
node scripts/verify/rotation-drill.mjs day2
```

It asks you to check the 02:30 lines in the dashboard (Workers & Pages →
`splitr-ai` → Logs; they should say `key=2/2`), then retires K1.

**If something goes wrong:** `node scripts/verify/rotation-drill.mjs repair`
puts one fresh key on all three Workers.

What it takes care of:
- **The keys:** made in memory and piped into `wrangler secret put`, never
  printed or written to a file. The live one (K2) goes into your macOS
  Keychain as "splitr AI_SHARED_SECRET".
- **The watchers:** a test user searching every 2 s, and
  `wrangler tail splitr-ai` for the key positions.
- **The work for the cron:** an expense with an item, saved during the
  breakage.
- **Cleanup:** the test users, day 1's and day 2's.
- **A log:** `.data/rotation-drill-<day>-<time>.log`, with no secrets, which
  Claude reads for this file.

### Local rehearsal of the guided script (2026-09-28)

This used a stand-in `wrangler` whose "secret put" rewrites the local
`.dev.vars` and **restarts** that local server. Locally, then, each
"deploy" is a real gap. Production rolls out a new version without one.
Every step did what it said:

```
PART 1, step 1  ✘ search fell back to keyword
                splitr-ai: 6 × embed status=refused key=none/1, 1 × index refused, 1 × categorise refused
                the drill's lunch expense: saved → 201, its item → uncategorised
PART 1, step 2  ✔ search by meaning works again; splitr-ai: 6 × embed status=ok key=1/1
PART 2, step 3  splitr-ai: 10 × embed status=ok key=1/2
PART 2, step 4  splitr-ai: 8 × embed status=ok key=2/2
PART 3, step 7  splitr-ai: 15 × embed status=ok key=1/1
cleanup: done, D1 re-checked (0 rows left)
```

The few fallbacks in Parts 2 and 3 came during the local restarts (for
example 20:07:14–20:07:23, while `next dev` restarted). **On production, Parts
2 and 3 must show none.** Everything the rehearsal touched was restored: the
three `.dev.vars` files (checked with `cmp`), the rehearsal's Keychain item
(deleted), and its state files.

---

## Part 1 output

```
(paste here)
```

## Part 2 output

```
(paste here)
```

## Part 3 output

```
(paste here)
```

## What happened (written up after the runs)

(to be written from the outputs above)
