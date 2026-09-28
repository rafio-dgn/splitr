# ADR-0032: The secret-rotation drill, on production: break it by swapping the receiver's key, then rotate it with a dual-key window, watched by a monitor

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Raffaele, in three structured questions: where, which wrong
  way, and how to prove "no downtime". The AI proposed the options and
  recommended; he chose the recommendation each time.
- **Requirement:** `REQ-F.5`

## Context

`REQ-F.5`: rotate a secret the wrong way first and watch it break, then the
right way (a dual-key window, the consumer deployed first, then the producer,
then the old key retired), with no downtime. Write up both.

The secret is **`AI_SHARED_SECRET`**, the one checked on every call to
`splitr-ai` (ADR-0025 §3):
- **The consumer is `splitr-ai`.** It accepts any key in `AI_SHARED_SECRETS`,
  a comma-separated list, and that list is what makes a dual-key window
  possible.
- **There are two producers**, both sending `AI_SHARED_SECRET`:
  - the app (`splitr`), on every save, search and receipt read;
  - `splitr-cron`, at 02:30 UTC, for the items and expenses left to
    categorise or index.

A wrong key doesn't take the app down, because every AI call already has a
fallback (ADR-0025 §4):
- items stay uncategorised, and the cron retries them;
- search falls back to keyword, with a note;
- "Read receipt" shows its error.

So the breakage is visible and mild, and saving expenses is never affected
(`REQ-M.7`).

A secret's value can't be read back, and the current one (K0) was never kept.
A dual-key window needs the old value, so the drill must *start* by creating a
key we hold.

## Decisions

1. **Both halves run on production (Raffaele).** The breakage is real but
   degrades rather than fails. The only data on production is Raffaele's and
   test data.

2. **The wrong way: swap the receiver's key only (Raffaele).** `splitr-ai`
   gets a new key K1 **in place of** the old one, with no window. Both
   producers still send K0, so every AI call is refused at once. The recovery
   is the one people reach for under pressure: move the producers to K1 too.
   That ends the outage, and leaves K1 as a key we hold.

3. **The right way, from K1 to K2:**

   | Step | Command target | Monitor should show |
   |---|---|---|
   | a. Open the window | `splitr-ai`: `AI_SHARED_SECRETS=K1,K2` | by meaning throughout, `key=1/2` in the log |
   | b. Move the producer | `splitr`: `AI_SHARED_SECRET=K2` | by meaning throughout, `key=2/2` |
   | c. Move the other producer | `splitr-cron`: `AI_SHARED_SECRET=K2` | (the cron runs at 02:30 UTC) |
   | d. **Wait for proof** | the next nightly run's `splitr-ai` log shows `key=2/2` | nothing still sends K1 |
   | e. Retire the old key | `splitr-ai`: `AI_SHARED_SECRETS=K2` | by meaning throughout, `key=1/1` |

   Step d is why the window stays open overnight. The cron is the producer
   that's easy to forget, and it only calls at 02:30. Retiring K1 before
   seeing it on K2 would be the subtler wrong way, one that fails at night
   with nobody watching.

4. **The proof of "no downtime" (Raffaele): a monitor and a key-position
   log.**
   - **A search watch** (`scripts/verify/rotation-watch.mjs`, run by the
     guided script, or by hand with `rotation-monitor.mjs`) searches by
     meaning as a test user every 2 s and reports every keyword fallback,
     with its start and end.
   - **`splitr-ai` logs which key in the list matched**, on every call:
     `key=2/2`, or `key=none/2` for a refusal. It logs the position, never
     the key (`keyLabel()` in `secret.ts`, 1 new test). Before step e, the
     logs show that nothing sends the old key any more.

*Rejected:*
- **The wrong way locally:** no real deploy, so it isn't the failure
  `REQ-F.5` describes.
- **Updating the app first, as the wrong way:** a breakage too, but only on
  one producer, so it's less clear.
- **Forgetting the cron, as the wrong way:** the most realistic mistake, but
  it only shows at 02:30. Step d guards against it instead.
- **Retiring K1 on the same day:** it assumes the cron was updated. Seeing it
  in the log is the point.
- **No key-position log:** it would mean trusting that both producers were
  updated.

## How the keys are handled

- **Amended the same day (Raffaele: "the instructions are not clear"):** a
  guided script, `scripts/verify/rotation-drill.mjs` (`day1`, `day2`,
  `repair`), replaces the three-terminal runbook. It generates the keys in
  memory (`crypto.randomBytes(32)`) and pipes them into `wrangler secret put`.
  They are never printed, logged or written to a file.
- **The live key (K2) goes into Raffaele's macOS Keychain**, because day 2
  needs it. So does the *next* rotation, since a dual-key window needs the old
  value, and K0's loss is what forced K1 into this drill. *Accepted trade-off:*
  `security add-generic-password -w <value>` takes the value as an argument,
  so it's visible to `ps` on that Mac for a moment. That's accepted on a
  single-user machine.
- Each `wrangler secret put` deploys a new version of that Worker with the
  new value, which is the "deploy" of each step.
- `repair` puts one fresh key on all three Workers, in case the drill
  stops halfway through the breakage.

## Consequences

- **The drill spans two days:** steps a–c today, and d–e after the 02:30 UTC
  run.
- **The cron needs work to do,** or it never calls `splitr-ai` and step d
  shows nothing. During the breakage, an expense with an item is saved on the
  live site. It can't be categorised or indexed then, so the cron has it to
  do at 02:30.
- **The monitor has a known blind spot:** a fallback can also be an
  embedding slower than the app's 3 s budget. The log separates the two
  (`status=refused` against `status=ok`).
- Local rehearsal needs a restart, because `wrangler dev` doesn't reload
  `.dev.vars` (measured).

## Verification

A local rehearsal (2026-09-28): with the monitor running, the local
`splitr-ai` was restarted with a stale key, then with the right one.
- The monitor showed **one fallback window, 19:47:25–19:48:00** (17 searches).
- The log showed **`status=refused key=none/1` ×10**, then `status=ok key=1/1`.

The production runs are in the evidence:
[REQ-F.5](../evidence/REQ-F.5-secret-rotation.md).
