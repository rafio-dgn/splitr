# `REQ-F.5`: the secret-rotation drill, wrong then right

**Date:** 2026-09-28 (parts 1–2), 2026-09-29 (part 3) · **Decision:** [ADR-0032](../decisions/0032-secret-rotation-drill.md) · **Secret:** `AI_SHARED_SECRET`, sent by `splitr` and `splitr-cron`, checked by `splitr-ai` against `AI_SHARED_SECRETS`
**Run by:** Raffaele, on production. The AI wrote the commands and reads the output.

---

## The criteria

| Criterion | Where |
|---|---|
| The wrong way first, and the breakage observed | Part 1 |
| Then correctly: dual-key window → deploy consumer → update producer → retire old key | Parts 2 and 3 |
| No downtime during the correct rotation | Parts 2 and 3: the monitor with `EXPECT=clean` |
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

## The runbook (Raffaele)

**Three terminals, all in the repo, all signed in to wrangler.** Keep
terminal C open from start to finish: it holds the keys in shell variables,
and they're lost if it closes. Never echo them.

- **A, the monitor:**
  `node scripts/verify/rotation-monitor.mjs https://splitr.raffaele-digennaro.workers.dev`
  (Parts 2 and 3: prefix it with `EXPECT=clean`.)
- **B, the consumer's log:**
  `npx wrangler tail splitr-ai --format pretty | grep --line-buffered "\[ai\]"`
- **C, the commands below.**

### Part 1: the wrong way (swap the receiver's key only)

1. Start A and B. Wait for a line of dots in A.
2. In C:
   ```sh
   K1=$(openssl rand -hex 32)
   printf %s "$K1" | npx wrangler secret put AI_SHARED_SECRETS -c workers/ai/wrangler.jsonc
   ```
3. **Watch it break:**
   - A prints `KEYWORD FALLBACK`;
   - B prints `status=refused key=none/1`.
4. **On the live site, add an expense with an item** (say "Rotation drill
   lunch" £5, one item "sandwich"). It saves, and its item stays
   uncategorised: that's the work the cron will do at 02:30 (ADR-0032).
5. **Recover** by moving both producers to K1:
   ```sh
   printf %s "$K1" | npx wrangler secret put AI_SHARED_SECRET
   printf %s "$K1" | npx wrangler secret put AI_SHARED_SECRET -c workers/cron/wrangler.jsonc
   ```
6. A prints `✔ by meaning again`, and B prints `status=ok key=1/1`. Wait a
   minute, then Ctrl+C in A. **Paste A's summary and B's lines here.**

### Part 2: the right way, today (a dual-key window, then the producers)

1. Start A with **`EXPECT=clean`**. B keeps running.
2. **Open the window** (consumer first). In C:
   ```sh
   K2=$(openssl rand -hex 32)
   printf %s "$K1,$K2" | npx wrangler secret put AI_SHARED_SECRETS -c workers/ai/wrangler.jsonc
   ```
   B: `key=1/2`. A: still dots.
3. **Move the app:**
   ```sh
   printf %s "$K2" | npx wrangler secret put AI_SHARED_SECRET
   ```
   B: `key=2/2`. A: still dots.
4. **Move the cron:**
   ```sh
   printf %s "$K2" | npx wrangler secret put AI_SHARED_SECRET -c workers/cron/wrangler.jsonc
   ```
5. Wait a minute, then Ctrl+C in A. **Paste A's summary and B's lines here.**
6. **Keep K2 for tomorrow** in your password manager (you'll need it in Part
   3), then close C. **Leave the window open overnight.**

### Part 3: tomorrow, after 02:30 UTC (proof, then retire)

1. **Proof that nothing sends K1:** in the dashboard, open Workers →
   `splitr-ai` → Logs, around 02:30 UTC. The cron's calls should say
   `key=2/2`, and none should say `key=1/2`. Your drill-lunch item should now
   be categorised. **Paste or screenshot the lines.**
2. Start A with `EXPECT=clean`, and B.
3. **Retire K1:** in a new terminal C, paste K2 from your password manager
   when asked:
   ```sh
   npx wrangler secret put AI_SHARED_SECRETS -c workers/ai/wrangler.jsonc
   ```
   B: `key=1/1`. A: still dots.
4. Wait a minute, then Ctrl+C in A. **Paste A's summary and B's lines here.**

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
