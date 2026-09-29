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
`splitr-ai` → **Observability**; they should say `key=2/2`), then retires K1.

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

## Part 1: the wrong way (production, 2026-09-28)

From `.data/rotation-drill-day1-2026-09-28T20-21-59.log`. The `splitr-ai`
lines are counted per step: the script logs each one, and they're grouped
here.

```
20:22:16  watching. Before anything changes: 6 by meaning, 0 fell back
━━ step 1: give splitr-ai K1 IN PLACE OF the old key (no window)
20:22:41  ✔ splitr-ai: AI_SHARED_SECRETS updated, a new version is live
20:22:46  ✘ search fell back to keyword: the AI Worker didn't answer
          splitr-ai: 15 × embed status=ok key=1/1       (the old version, still serving for a few seconds)
          splitr-ai: 16 × embed status=refused key=none/1
          splitr-ai:  1 × index status=refused key=none/1
          splitr-ai:  1 × categorise status=refused key=none/1
          the drill's lunch expense: saved → 201, its item → uncategorised
━━ step 2: recover, moving the app, then the cron, to K1
20:23:16  ✔ splitr: AI_SHARED_SECRET updated
20:23:18  ✔ splitr-cron: AI_SHARED_SECRET updated
20:23:21  ✔ search by meaning works again
          splitr-ai: embed status=ok key=1/1

PART 1 (the wrong way): 27 searches by meaning, 16 fell back, 0 errors
✘ fallback from 20:22:46 to 20:23:21 UTC (16 searches)
```

## Part 2: the right way, K1 → K2 with the window open (production, 2026-09-28)

```
━━ step 3: open the window, splitr-ai accepts K1 AND K2
20:24:16  ✔ splitr-ai: AI_SHARED_SECRETS updated
          splitr-ai: 23 × embed status=ok key=1/1       (the old version, K1 only, during the rollout)
          splitr-ai: 91 × embed status=ok key=1/2       (the new version: K1 is key 1 of 2)
━━ step 4: move the app to K2
20:27:18  ✔ splitr: AI_SHARED_SECRET updated
          splitr-ai: 18 × embed status=ok key=2/2
━━ step 5: move the cron to K2
20:27:45  ✔ splitr-cron: AI_SHARED_SECRET updated

PART 2: 132 searches by meaning, 0 fell back, 0 errors
✔ NO DOWNTIME: every search was answered by meaning
```

## Part 3: proof overnight, then retire K1 (production, 2026-09-29)

From `.data/rotation-drill-day2-2026-09-29T07-28-10.log`.

```
the drill's lunch item, left uncategorised yesterday, is now: eating_out
✔ the 02:30 cron categorised it, so its key was accepted
Did every 02:30 line say key=2/2? → yes      (Raffaele, from splitr-ai → Observability)
07:28:36  watching: 6 × embed key=2/2, 1 × index key=2/2
━━ step 7: retire K1, splitr-ai accepts K2 only
07:29:43  ✔ splitr-ai: AI_SHARED_SECRETS updated
          splitr-ai: 34 × embed status=ok key=2/2       (the old version, K1 and K2, during the rollout)
          splitr-ai: 15 × embed status=ok key=1/1       (the new version: K2 is key 1 of 1)

PART 3: 55 searches by meaning, 0 fell back, 0 errors
✔ NO DOWNTIME: every search was answered by meaning
```

Every test user was cleaned up: the watchers each day, and the cron probe
on day 2. Day 2 renames `.data/rotation-drill.json` only after cleanup
succeeds, and it did.

## What happened

**The wrong way (Part 1).** `splitr-ai` was given a new key *instead of*
the old one.
- Within 5 seconds of the new version going live, every AI call was refused
  (`key=none/1`), because the app and the cron still sent the old key.
- For **35 seconds** (20:22:46–20:23:21), search answered by keyword only.
  Saves carried on (the drill's expense: 201), but its item couldn't be
  categorised or indexed.
- Moving the producers to the new key ended it.
- **Nothing crashed, which is the fallbacks' doing (ADR-0025 §4), not the
  rotation's.** Without them, the same mistake would have been error pages.
- **The outage lasted exactly as long as it took to update the other side.**
  That was quick here, because a script was ready to do it. In a real
  incident it's however long it takes someone to notice, find the cause and
  update two Workers.

**The right way (Parts 2 and 3).**
- The receiver accepted both keys *before* either producer changed. Each
  producer then moved, and the old key was retired only once nothing sent it.
- **No search fell back:** 0 of 132 on day 1, and 0 of 55 on day 2.

**What the logs showed that the plan hadn't said:**
1. **For a few seconds after each `wrangler secret put`, the old version
   and the new one both serve calls.** Cloudflare rolls a new version out
   gradually:
   - after the window opened: 23 calls still on the old version (`key=1/1`),
     then 91 on the new one (`key=1/2`);
   - after K1 was retired: 34 calls still on the window version
     (`key=2/2`), then the new one (`key=1/1`).

   **That's why the order matters.** A producer moved while the old
   receiver version was still serving would have been refused by it. The
   receiver goes first, and it has to be fully live before the producers
   move.
2. **The easy producer to forget is the one that isn't running.** The cron
   calls once a night. Its proof came from two places: its 02:30 calls said
   `key=2/2` (Raffaele, in the dashboard), and the item the breakage left
   behind was categorised overnight (`eating_out`). Retiring K1 on day 1
   would have worked with nothing to show for it, until 02:30.
3. **You need the old key's value to open a window.** K0 couldn't be read
   back, so the wrong way's recovery produced K1, a key we held. Now the live
   key, K2, is in Raffaele's Keychain, so the next rotation can go straight to
   the right way.
