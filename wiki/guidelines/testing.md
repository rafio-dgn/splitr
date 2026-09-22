# Testing

> **⚠️ This page is a draft and needs rewriting for Splitr.**
>
> The course never mentions testing — there is no `REQ-*` for it. So this is a
> proposal, not a requirement, and the decision to adopt (or skip) it needs an
> ADR. Tracked in [`../todos/backlog.md`](../todos/backlog.md).
>
> It was written while surveying the reference build, so its tooling notes assume
> that stack. Splitr is a fresh `create-next-app` project — re-check what is
> actually installed before relying on anything below.

## Tooling available

| Tool | Where | Status |
|---|---|---|
| `vitest` `^4.1.5` | TanStack app | configured, `npm run test` |
| `@cloudflare/vitest-pool-workers` | DO worker (`vitest.config.mts`) | configured, runs tests *inside* the Workers runtime |
| `@testing-library/react`, `jsdom` | TanStack app | installed, unused |

`@cloudflare/vitest-pool-workers` is the important one: it gives real bindings —
a real DO, real D1, real KV — rather than mocks. Prefer it over hand-rolled fakes.

## What is worth testing here

Ranked by how much the test earns:

### 1. Pure logic — cheap, high value
- `lib/password.ts` — hash then verify round-trips; a wrong password fails; a
  malformed stored hash returns `false` rather than throwing.
- `lib/authz.ts` — the full matrix: self, admin-on-other, user-on-other.
- `lib/format.ts` — cents-to-display.
- Balance computation over a mixed transaction list, including the
  transfers-do-not-move-balance rule.

### 2. Durable Object behaviour — the real risk
Run in `vitest-pool-workers` against a live DO:
- Same idempotency key twice → one row, identical responses.
- Withdraw beyond balance → `INSUFFICIENT_FUNDS` with the correct balance.
- Withdraw exactly equal to balance → succeeds.
- AI service unreachable → transaction still succeeds with `category: null`.
- Queue binding absent → transaction still succeeds.
- Alarm evicts entries past TTL and re-arms while entries remain.

These encode the invariants of the contested write — see
[`../context/project-brief.md`](../context/project-brief.md). For Splitr the
equivalent list is: two concurrent settlements of the same debt → one wins;
replayed idempotency key → one write; settlement exceeding the debt → refused.
They are the tests worth having.

### 3. Boundary tests
- Input validators: negative and zero amounts, non-finite, unknown type, missing
  fields, empty description → `undefined`.
- Private workers reject a missing, wrong, and wrong-length secret.
- Receipts endpoint returns 404 — not 403 — for another user's key.
- Consumer retries then dead-letters after `max_retries`.

### 4. Session round-trip
Create → read (KV hit) → clear KV → read (D1 fallback, KV re-warmed) → destroy →
read returns `null`. Expiry is respected.

## What is not worth testing

- Rendering of hand-rolled UI components.
- Drizzle's own query building.
- Cloudflare's services.
- Anything asserting a `console.log` fired (except `[AUDIT]` lines, if the course
  requires them to be verifiable — that is a real requirement if it exists).

## Conventions

- Tests beside the code or in `test/`, named `*.spec.ts`.
- One behaviour per test; the name states the behaviour, not the function.
- No shared mutable state between tests — DO instances persist within a run, so
  use a distinct user id per test.
- No network in tests. Service bindings are stubbed at the binding, not by
  intercepting `fetch`.

## Manual verification

Some things are only provable against real infrastructure. Keep a checklist:

- [ ] `wrangler tail` shows the expected `[AUDIT]` line after a create
- [ ] `POST /daily-job/run` produces `daily_summary` rows; a second run changes
      nothing but `computed_at`
- [ ] A workflow instance survives a mid-run redeploy and resumes
- [ ] Rate limiting actually rejects the 6th login attempt within 60s
- [ ] `/admin/*` is unreachable without an Access session
- [ ] A forged `Cf-Access-Jwt-Assertion` is rejected by the Worker's verifier

Record the outcome of manual runs in [`../AI-AUDIT.md`](../AI-AUDIT.md) under
**Verification** — "I ran it and it worked" is only useful if it says what was run.
