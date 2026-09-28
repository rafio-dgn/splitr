# ADR-0029: Rate-limit settle-up: 5 requests per 60 s per signed-in user

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Raffaele (three structured questions: the route, the key and
  the limit). The AI proposed the options and recommended; he chose the
  recommendation on all three.
- **Requirement:** `REQ-F.1`

## Context

`REQ-F.1`: put a rate-limit binding on the busiest write route; six rapid
requests must get **429** on the sixth. Pick a production window and count,
and **write the rationale**. The requirement's notes say "five per minute"
without a reason doesn't satisfy it.

The Workers rate-limit binding (`ratelimits`, `simple: { limit, period }`)
counts requests per **key** you choose, over a window of **10 or 60 seconds
only**. It counts per Cloudflare location and is approximate. That's right for
abuse protection, and wrong for an exact quota.

## Decisions

1. **The route: settle-up** (`POST /api/groups/:id/settlements` and the settle
   form's Server Action). Adding expenses is more frequent in normal use, but
   settle-up is the **contested write**: each request runs the GroupLedger's
   critical section and reads and writes D1. Hammering it is the abuse case
   worth stopping, and it's the centre of the demo.
2. **The key: the signed-in user** (`settle:<userId>`). Every settle request is
   authenticated, so this is fair: flatmates behind one Wi-Fi don't share a
   budget, as they would with an IP key.
3. **The limit: 5 per 60 s.**

## The rationale for 5 per 60 s

- **A person records a handful of settlements at most at once.** A settle-up
  session means paying back one or two people. Even someone clearing a debt in
  several groups makes a few requests a minute, well under 5.
- **Double-clicks and retries aren't the limit's job.** The idempotency key
  (ADR-0023 §3) already turns them into replays without a second write. The
  limit is for *different* requests arriving too fast.
- **At 6 or more a minute from one person, it's a script or a stuck client**,
  not a human settling debts. Refusing is cheap: the check comes first, so
  the refused request never reaches the ledger or D1.
- **60 s, not 10 s:** a 10 s window allows 30 a minute in sustained bursts,
  which is too permissive for that argument.
- **It's demonstrable on production with the real setting.** The 6th rapid
  request is refused, so there's no separate "demo" configuration.
- **It's approximate by design.** Counting is per location. A user spread
  across locations could slightly exceed 5, and that's acceptable for abuse
  protection.

*Rejected:*
- guarding "add expense": busier, but it would need a much higher, receipt-sized
  allowance, and it isn't the contested write;
- guarding both: two rationales, and more configuration for little gain;
- a per-IP key: it penalises shared households and offices;
- per user and group: more permissive, with no clear gain;
- 5 per 10 s: too permissive when sustained;
- 20 per 60 s: the 6th request wouldn't be refused, so the demo would need a
  setting production doesn't use.

## Where it's enforced

**First** in `recordSettlement`, the one service both the form and the curl
route call:
- before parsing, the membership check and the ledger;
- a refusal is `status: "rate-limited"`, which becomes **429 with
  `Retry-After: 60`** on the HTTP route, and a message on the form;
- the audit line is `outcome: "refused:rate-limited"`.

## Consequences

- `race.mjs` is capped at 5 rounds, since each round is one settle request per
  person per minute.
- **A `next dev` artefact:** under `next dev`, the form path wasn't limited,
  although the HTTP path was. The production build in the Workers runtime
  limits both. It's the third local-proxy artefact found in this project, after
  the service-binding block and `.dev.vars` in remote mode.
- **A type trap, caught:** `SETTLE_LIMITER` was silently `any` until
  `RateLimit` was added to `cloudflare-globals.d.ts`. The one-line probe from
  lesson 6 caught it.

## Verification

In the evidence: [REQ-F.1](../evidence/REQ-F.1-settle-rate-limit.md).
