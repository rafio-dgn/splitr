# Testing

**The course requires no tests.** There is no `REQ-*` for testing, so every test
on this project is scope we chose. The choice is recorded in
[ADR-0012](../decisions/0012-test-the-invariants-and-the-money-nothing-else.md);
this page is how to carry it out. If the two ever disagree, the ADR wins.

The rule in one line: **test the things that are wrong silently.** A wrong
balance, a double settlement and a replayed idempotency key all look like
success. Everything else on this project either fails loudly or is proved better
by [`../evidence/`](../evidence/).

---

## What we test

### Now — the money arithmetic

It already exists, and Cluster D is about to make it durable.

| Module | Property |
|---|---|
| `src/lib/schemas/expense.ts` → `equalShares` | the split sums **exactly** to the total, for every participant count; the remainder penny is distributed, never dropped or invented |
| `src/lib/schemas/expense.ts` → `parseAddExpense` | boundaries: zero, negative, three decimal places, non-numeric, empty string, missing field, the 2020 floor, the future-date ceiling |
| `src/lib/expenses/balances.ts` → `deriveBalances` | the group's net positions sum to **zero**, for any set of expenses |
| `src/lib/money.ts` → `formatGbp`, `describePosition` | integer minor units in, string out; direction in words, never a minus sign (`screens-cluster-b.md` §3) |

Each `parseAddExpense` case already has a matching curl payload in
[`../evidence/REQ-B.2-server-side-validation.md`](../evidence/REQ-B.2-server-side-validation.md).
The test is the cheap half of the same assertion — it does not replace the
evidence, which is what `REQ-B.2` is actually graded on.

### At `REQ-E.1` — the invariants of the contested write

These are the tests worth having. They are the reason Splitr exists.

- Two concurrent settlements of the same debt → **exactly one** succeeds.
- The loser gets a *useful* refusal, not a 500.
- A replayed `idempotencyKey` → one write, identical response.
- A settlement exceeding the debt → refused.
- The scheduled job run twice → identical result.
- The write still succeeds when the AI worker is down (`REQ-M.7`).

### At Cluster F — the trust boundaries

Assertions about *refusal*. A refusal that quietly stopped working looks exactly
like one that works.

- A private Worker rejects a **missing**, a **wrong**, and a **wrong-length** secret.
- Another user's resource returns **404, not 403**.

---

## What we deliberately do not test

Each of these is a decision, not an oversight. Say so if asked at the demo.

- **Component rendering and markup.** Copy is still moving, and Server Components
  need a harness we would have to build. `curl` already proves the page renders
  its content server-side, which is the only rendering claim any requirement
  makes (`REQ-B.3`).
- **Drizzle's query builder, and D1 itself.** Testing someone else's ORM.
- **Cloudflare's services** — KV, R2, Workers AI, Vectorize, Turnstile.
- **Better Auth.** `REQ-B.5` says black box. Testing its internals would
  contradict the requirement.
- **The `(app)` session gate.** One line of `curl` per route, kept as evidence,
  proves it better than a test would.
- **Anything in the evidence table below.** A passing test is not a substitute
  for the captured output, and would not be accepted as one at `REQ-X.8`.

---

## Tooling

Splitr is a fresh `create-next-app` tree. **Nothing test-related is installed,
and that is deliberate.**

| When | Tool | Install |
|---|---|---|
| Now | `node --test` — Node 24's built-in runner, with native TypeScript type-stripping | **nothing** |
| `REQ-E.1` | `@cloudflare/vitest-pool-workers` + `vitest` | installed then, not before |

### Running the money tests today

```bash
node --test src/lib/**/*.test.mts
```

Three sharp edges, all found by trying it rather than assuming:

1. **Test files must be `.mts`.** `package.json` has no `"type": "module"`, so a
   `.ts` test file is parsed as CommonJS and throws
   `SyntaxError: Cannot use import statement outside a module`. Do **not** add
   `"type": "module"` to fix this — it changes how Next.js loads its own config.
2. **The `@/*` alias does not resolve.** It is a `tsconfig.json` mapping and
   plain Node does not read `tsconfig.json`. Import by relative path.
3. **A module that does `import "server-only"` cannot be loaded.** If a test
   needs one, the logic under test is in the wrong file — move it.

Edge 2 confines this approach to modules with no alias imports, which is exactly
the pure-logic set above. `balances.ts` qualifies because its one import is an
erased `import type`.

### At Cluster E

Prefer `@cloudflare/vitest-pool-workers` over hand-rolled mocks: it runs tests
**inside** the real Workers runtime with real bindings — a real Durable Object,
real D1. For a requirement whose whole content is "what happens when two requests
race inside a DO", a mock assumes the answer.

Durable Object instances persist across a run. **Use a distinct group id per
test**, or tests will contaminate each other in an order-dependent way.

> Not yet verified. Nothing is installed and no DO exists. Confirm this section
> against reality at `REQ-E.1` before relying on it.

---

## Conventions

- Name the file `<module>.test.mts`, beside the module it tests.
- One behaviour per test. The name states the **behaviour**, not the function —
  "the remainder penny is distributed, never dropped", not "equalShares works".
- No shared mutable state between tests.
- No network. Service bindings are stubbed at the binding, never by intercepting
  `fetch`.
- A test that needs a comment explaining why it is skipped should be deleted
  instead. `wiki/todos/backlog.md` is where an untested worry goes.

---

## Evidence is the primary mechanism, not a fallback

Eleven requirements are satisfied **only** by running the thing and keeping the
output — never by implementing the feature, and never by a passing test. That is
the `demo-evidence` skill, and it outranks everything above.

| Evidence | Req |
|---|---|
| curl an invalid payload past the client; server rejects it | `REQ-B.2` |
| devtools showing no client-side data calls on the main page | `REQ-B.3` |
| the D1 transaction limit you hit, and how you avoided it | `REQ-D.6` |
| semantic search beating keyword search | `REQ-D.4` |
| double-settle failing **without** the DO, then refused **with** it | `REQ-E.1` |
| replayed idempotency key: one write, identical response | `REQ-E.2` |
| cron run twice, identical result | `REQ-E.6` |
| sixth rapid request returns 429 | `REQ-F.1` |
| forged Turnstile submit rejected server-side | `REQ-F.2` |
| `wrangler tail \| grep AUDIT` yielding parseable JSON | `REQ-F.3` |
| secret rotation done wrong, then right | `REQ-F.5` |

Store each under [`../evidence/`](../evidence/) as `<req-id>-<slug>.md` with the
exact command, the **real pasted output**, and the date.

### Two rules that cost us before

- **Re-run recorded evidence before trusting it, and re-run it in the mode you
  will demo in.** The `REQ-B.3` network log was captured on `next dev`, which
  disables `<Link>` prefetch. The same page in a production build makes nine
  `fetch` requests on load. The evidence was not wrong when written; it stopped
  being true when the build mode changed. See
  [`../evidence/REQ-B-cluster-verification.md`](../evidence/REQ-B-cluster-verification.md).
- **Capture failures where the requirement asks for them.** `REQ-F.5` wants the
  rotation done *wrong* first and the breakage observed; `REQ-E.1` wants the
  double-settle shown *before* the fix. The contrast is the demo.

---

## Manual checklist

Some things are only provable against real infrastructure. Record the outcome in
[`../AI-AUDIT.md`](../AI-AUDIT.md) under **Verification** — "I ran it and it
worked" is only useful if it says what was run and what it printed.

- [ ] `wrangler tail` shows the expected `[AUDIT]` line after a mutation
- [ ] The scheduled job run twice changes nothing but its timestamp
- [ ] Rate limiting rejects the 6th request within the window
- [ ] A forged Turnstile token is rejected server-side
- [ ] Rotating a secret the wrong way breaks the call, and the right way does not

**Never round a failure up to a pass.** A green report that was not actually
executed is the one thing that gets caught live in front of the panel.
