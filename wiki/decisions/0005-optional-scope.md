# ADR-0005: Cluster F is in scope; Queues is not

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Raffaele Di Gennaro
- **Requirement:** `REQ-E.8`, `REQ-F.1`–`F.6`

## Context

Two things in the course are marked `[OPTIONAL]`:

1. **Cluster F** in its entirety — rate limiting, Turnstile, AI Gateway, the
   secret-rotation drill. (`REQ-F.1`, `F.2`, `F.4`, `F.5`)
2. **Queues + DLQ consumer** within Cluster E. (`REQ-E.8`)

They have different costs. Cluster F is time. Queues is money: it requires a
Workers **Paid** plan, while `REQ-0.1` states the free tier is sufficient for the
whole path — which is only coherent because this item is optional.

One complication: `REQ-F.3` (structured `[AUDIT]` logging) sits inside the
optional Cluster F, but is also stated as `[MUST]` in the cross-cutting rules
(§13) and again in Cluster E (§8). It is not optional whichever way Cluster F
goes.

## Options considered

### Option A — MUSTs only
- Pros: smallest scope; still earns the certificate.
- Cons: skips the four security controls that are the difference between a demo
  and something defensible. `REQ-F.6` Q2 ("could you trace every change to a
  record from logs alone?") would be answerable, but Q1 on secret rotation would
  not.

### Option B — Cluster F in, Queues out
- Pros: keeps everything that costs only effort; drops the one thing that costs
  money and contradicts the free-tier premise. Turnstile has a natural home in
  Splitr's public join-group form. The secret-rotation drill is the single most
  transferable exercise in the course.
- Cons: no Queues means no exposure to batching, retry-with-backoff and DLQs —
  genuinely useful platform knowledge, and the discriminated-union exhaustiveness
  pattern it teaches is good TypeScript.

### Option C — Everything, including Queues
- Pros: complete coverage.
- Cons: requires paying for a Workers Paid plan for a training exercise, for one
  optional bullet.

## Decision

We chose **Option B — Cluster F in scope, Queues out of scope.**

Because: Cluster F's cost is effort and its payoff is the security posture that
makes the build defensible at the demo. Queues' cost is a paid plan for a single
optional item, in a course that explicitly says the free tier suffices.

## Consequences

- **In scope:** `REQ-F.1` (rate limiting, with written rationale), `REQ-F.2`
  (Turnstile on the public join-group form, with the forged-submit test),
  `REQ-F.4` (AI Gateway in front of every model call), `REQ-F.5` (the
  secret-rotation drill — done wrong first, then right).
- **`REQ-F.3` was never optional** and remains `[MUST]` via `REQ-M.5`. Every
  mutation emits a structured `[AUDIT]` line carrying actor, action, target,
  timestamp, outcome — from the first mutation in Cluster E, not deferred to F.
- **`REQ-E.8` → status `Dropped`.** Not "not started" — a recorded decision, so
  nobody re-opens it later wondering whether it was forgotten.
- Splitr's design must therefore **not** depend on async post-write work. Any
  nightly or deferred processing goes through the Cron handler (`REQ-E.6`)
  instead, which is free-tier and already required.
- `REQ-F.2` requires a genuinely public, unauthenticated surface. Splitr's
  invite-link join-group page must be designed for this from Cluster B, not
  retrofitted at Cluster F.
- **Stays on the Cloudflare free tier throughout.** No billing setup needed.
- Revisit if: a Paid plan becomes available anyway, in which case `REQ-E.8` can
  be reinstated as a bonus without disturbing anything else — the Cron path and
  the queue path are independent.

## Verification

- Free-tier sufficiency confirmed in the capture, §0.2: *"A Cloudflare account
  (free tier is sufficient for the whole path)."*
- Queues' Paid-plan requirement is why §8 marks it `[OPTIONAL]` — the two
  statements are only consistent under that reading.
- `REQ-F.3`'s `[MUST]` status cross-checked in three places in the capture:
  §9 (Cluster F), §8 (Cluster E), §13 (cross-cutting rules).
