# ADR-0012: Test the invariants of the contested write and the money arithmetic — nothing else

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** AI (qa-test agent), pending human review
- **Requirement:** **none.** The course has no `REQ-*` for testing. Every test
  written under this ADR is scope we chose. That is the whole reason this file
  exists — see [ADR-0002](./0002-course-is-requirements-source-of-truth.md) and
  the standing rule in `CLAUDE.md` §6 about not inventing requirements.

## Context

`wiki/guidelines/testing.md` has been a draft since the wiki was seeded. It was
written while surveying the reference build, so it names a stack Splitr does not
have: `vitest ^4.1.5` "configured, `npm run test`", `@testing-library/react` and
`jsdom` "installed", a `vitest.config.mts` in a DO worker. None of that is true
here. Splitr is a fresh `create-next-app` tree; `package.json` has **no test
script and no test dependency**, and `workers/` does not exist yet. Following the
draft today would mean installing four packages to test code that has not been
written.

`wiki/todos/backlog.md` has carried *"Decide the test strategy and record it as an
ADR"* since the backlog was created. This closes it.

Three facts shape the answer.

**1. The course grades a demonstration, not a suite.** Assessment is a 15-minute
demo (`REQ-X.8`) plus the written deliverables (`REQ-X.2`, `REQ-X.6`). No marks
exist for coverage. Eleven requirements are satisfied *only* by running the thing
and keeping the output — the `demo-evidence` table. On a project graded that way,
executable evidence is the primary quality mechanism and automated tests are a
supporting one.

**2. Adversarial verification found things unit tests cannot find.** The Cluster B
re-verification on 2026-09-22 (see
[`../evidence/REQ-B-cluster-verification.md`](../evidence/REQ-B-cluster-verification.md))
turned up two real defects. Both were invisible to any unit test that could
reasonably have been written:

- `BETTER_AUTH_URL` in `.env` is pinned to `http://localhost:3000` while the
  documented run port is 3100, so every Better Auth mutation returns
  `403 INVALID_ORIGIN`. A configuration/environment mismatch. (Fixed 2026-09-22 —
  [ADR-0013](./0013-base-url-is-the-request-host-not-a-port-in-env.md); the
  argument it illustrates is unaffected.)
- The main page issues nine `fetch` requests on load **in a production build**
  (Next.js `<Link>` prefetch), where the recorded `REQ-B.3` evidence — captured
  on `next dev`, which disables prefetch — shows zero. A build-mode difference.

Neither is a wrong function. Both were found by starting the app and watching it.
That is evidence for keeping the automated surface narrow and the running-it
discipline strict, not for adding a component-test layer that would have caught
neither.

**3. Splitr's one genuinely hard problem is concurrency, and it does not exist
yet.** The contested write — two people settling the same debt at the same
instant — arrives at `REQ-E.1`. Its invariants are exactly the kind of thing that
is *silent* when wrong: a double settlement does not throw, it just produces a
balance that is quietly £40 out. Same for the money arithmetic: `equalShares`
dropping a remainder penny produces a plausible number, not an error. These are
the failures a test catches and a demo does not.

## Options considered

### Option A — No automated tests at all; rely on `wiki/evidence/`
- Pros: zero dependencies; zero scope invented; matches how the course is
  actually graded; the eleven evidence files already prove more about the
  requirements than a suite would.
- Cons: leaves the concurrency invariants of `REQ-E.1`/`REQ-E.2` unprovable
  except by hand, every time. "Two concurrent settlements, exactly one wins" is
  not something you can re-check by clicking, and it is the claim the whole
  project rests on. A regression there is silent and would surface live.

### Option B — Conventional pyramid: unit + component + integration
- Pros: familiar; reviewers recognise it; coverage number to quote.
- Cons: `@testing-library/react` + `jsdom` + a runner, to assert markup that the
  product designer will change twice more before the demo. Server Components
  cannot be rendered by `@testing-library/react` anyway without a harness we
  would have to build. Directly contradicts the qa-test brief ("do not test the
  exact markup of a component") and would have caught neither defect found above.
  Largest cost, least return.

### Option C — Test only the contested write's invariants and the money logic
- Pros: every test maps to a failure that is **silent and expensive**; the list
  is short enough to actually write and keep green; it is the same list the
  `qa-test` agent brief already ranks first and second.
- Cons: requires judgement about what counts as "the money logic", and leaves
  real code untested on purpose — which has to be written down or it reads as an
  oversight.

### Option D — Option C, but defer *all* of it to Cluster E
- Pros: nothing installed, nothing maintained, until the contested write exists.
- Cons: **this is where I disagree with the steer.** The money logic exists
  *today* and is already load-bearing: `toMinorUnits` deliberately avoids
  floating point, `equalShares` distributes the remainder penny, `deriveBalances`
  must net to zero across a group. Cluster D wires all three into a real database,
  where a wrong penny starts persisting. Deferring means the arithmetic goes
  through the cluster that makes it durable without ever being checked. And the
  stated reason to defer — "do not install a test framework until there is
  something worth testing" — turns out not to apply: **there is nothing to
  install.** Verified, not assumed:

  ```console
  $ node --test /…/money.probe.mts
  ✔ formatGbp renders integer minor units (0.919583ms)
  ✔ equalShares distributes the remainder penny (0.270167ms)
  ✔ describePosition never shows a minus sign (0.062958ms)
  ✔ parseAddExpense rejects three decimal places (1.646125ms)
  ℹ tests 4 · pass 4 · fail 0
  ```

  Node 24.21.0's built-in runner, importing Splitr's real `src/lib/money.ts` and
  `src/lib/schemas/expense.ts` through native TypeScript type-stripping, with
  `node_modules` untouched.

## Decision

We chose **Option C, starting now with zero new dependencies** — i.e. Option C
over Option D on timing, and Option C over A and B on scope.

Because: the deciding factor is *which failures are silent*. A wrong balance, a
double settlement and a replayed idempotency key all look like success. Everything
else on this project fails loudly, or is proved better by the evidence files the
course already demands. And the one argument for waiting — the cost of standing a
framework up — evaporated when `node --test` ran against our own modules with
nothing installed.

### What gets tested

**Now (Cluster B/C/D), with `node --test` and no new packages** — the money
arithmetic, because it is already wired into what the demo shows:

- `equalShares` — the split sums exactly to the total for every participant
  count; the remainder penny is distributed, never dropped or invented.
- `toMinorUnits` / `parseAddExpense` at the boundaries — zero, negative,
  three decimal places, non-numeric, empty string, missing, the 2020 floor, the
  future-date ceiling. Each of these already has a curl payload in
  [`../evidence/REQ-B.2-server-side-validation.md`](../evidence/REQ-B.2-server-side-validation.md);
  the test is the cheap half of the same assertion.
- `deriveBalances` — the group's net positions sum to **zero**, for any set of
  expenses. This is the invariant that makes a balance believable.
- `formatGbp` / `describePosition` — integer in, string out; direction in words,
  never a minus sign (`screens-cluster-b.md` §3).

**At Cluster E, with `@cloudflare/vitest-pool-workers`** — the invariants of the
contested write, which is the only place a real dependency is justified, because
mocking a Durable Object proves nothing about a Durable Object:

- Two concurrent settlements of the same debt → exactly one succeeds.
- The loser gets a useful refusal, not a 500.
- A replayed `idempotencyKey` → one write, identical response.
- A settlement exceeding the debt → refused.
- The scheduled job run twice → identical result.
- The write still succeeds when the AI worker is down (`REQ-M.7`).

**At Cluster F, in the same runner** — the trust boundaries, because they are
assertions about *refusal* and a refusal that quietly stopped working looks
exactly like one that works:

- A private Worker rejects a missing, wrong, and wrong-length secret.
- Another user's resource returns **404, not 403**.

### What deliberately goes untested

Each of these is a choice, not an omission:

- **Component rendering and markup.** The copy is still moving and Server
  Components need a harness we would have to build. `curl` already proves the
  page renders its content server-side, which is the only rendering claim any
  requirement makes (`REQ-B.3`).
- **Drizzle's query builder and D1 itself.** Testing someone else's ORM.
- **Cloudflare's services** — KV, R2, Workers AI, Vectorize, Turnstile. If KV
  loses a key, a test of ours will not have predicted it.
- **Better Auth.** `REQ-B.5` says black box; writing tests against its internals
  would contradict the requirement we are trying to satisfy.
- **The `(app)` session gate.** Its behaviour is a redirect, proved in one line
  of `curl` per route and recorded as evidence. A test would restate it less
  convincingly.
- **Everything in the `demo-evidence` table.** Those requirements are satisfied
  by a captured command and its real output. A passing test is not a substitute
  and would not be accepted as one at `REQ-X.8`.

### Tooling

| When | Tool | Installed? |
|---|---|---|
| Now | `node --test` (Node 24, native TS type-stripping) | **nothing to install** |
| `REQ-E.1` | `@cloudflare/vitest-pool-workers` + `vitest` | installed then, not before |

`@cloudflare/vitest-pool-workers` runs tests **inside** the real Workers runtime
with real bindings — a real DO, real D1 — rather than against mocks. For a
requirement whose entire content is "what happens when two requests race inside a
Durable Object", a mock would be assuming the answer.

## Consequences

- **Makes easy:** writing the money tests today, at zero dependency cost, in a
  tree that currently has no test story at all. Arguing at the demo that every
  test earns its place — the list is short enough to read aloud (`REQ-M.4`).
- **Makes hard:** any regression in component markup, copy or layout. We will
  find those by looking at the app, which is what caught both Cluster B defects
  anyway.
- **Known sharp edges of `node --test` here**, found while proving it works:
  - Test files must be `.mts`. `package.json` has no `"type": "module"`, so a
    plain `.ts` test is parsed as CommonJS and `import` throws
    `SyntaxError: Cannot use import statement outside a module`. Adding
    `"type": "module"` to fix it would change how Next.js loads its own config —
    not worth it for a test-file extension.
  - The `@/*` path alias is a `tsconfig.json` mapping and plain Node does not
    read it. Tests import by relative path. This limits the approach to modules
    with no alias imports — which is exactly the pure-logic set we are testing
    (`money.ts`, `schemas/expense.ts`, `schemas/group.ts`, and `balances.ts`,
    whose one import is an erased `import type`).
  - A module that does `import "server-only"` cannot be loaded this way. That is
    a feature: if a test needs one, the logic under test is in the wrong file.
- **Revisit if:** the `.mts` + relative-import friction starts costing more than
  a `vitest` install would (at which point install `vitest` once, at Cluster E,
  and move the money tests into it rather than running two runners); or if the
  course adds a testing requirement, which would make this ADR moot rather than
  wrong.

## Verification

- Confirmed the draft's premise was stale: `package.json` has no test script and
  no test dependency; `node_modules/.bin` contains no `vitest`, `jest`,
  `playwright` or `puppeteer`.
- Confirmed `node --test` runs against Splitr's real modules with nothing
  installed — the four-test and one-test runs quoted above, importing
  `src/lib/money.ts`, `src/lib/schemas/expense.ts` and
  `src/lib/expenses/balances.ts`. All passed.
- Confirmed the failure mode of the `.ts` extension
  (`SyntaxError: Cannot use import statement outside a module`) and of the `@/`
  alias (`ERR_MODULE_NOT_FOUND`), so both are recorded as known edges rather than
  discovered again later.
- Hand-checked `equalShares` across six totals (`4250/3`, `1/3`, `0/3`, `100/7`,
  `5/2`, `1000/1`): every split sums exactly to its total. This is the property
  the first test encodes, and it holds today — the test protects it, it does not
  discover it.
- **Not verified:** `@cloudflare/vitest-pool-workers`. Nothing is installed and
  no Durable Object exists yet. The claim that it runs tests inside the real
  runtime with real bindings is taken from the `qa-test` agent brief and the
  draft this ADR replaces; it must be confirmed at `REQ-E.1` before being relied
  on.
