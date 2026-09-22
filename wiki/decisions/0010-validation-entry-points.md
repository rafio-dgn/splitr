# ADR-0010: One validation path, two entry points — a Route Handler is the curl target, not the Server Action

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** AI (backend), pending human review
- **Requirement:** `REQ-B.2`

## Context

`REQ-B.2` is not satisfied by writing validation. Its acceptance criteria demand
a **demonstration**:

> **Demonstrated:** `curl` an invalid payload directly at the server, bypassing
> the client, and the server rejects it. The curl command and its output are
> recorded as evidence.

The form is a Server Action (`REQ-B.2`'s cluster teaches Server Actions, and
`wiki/context/screens-cluster-b.md` §7 specifies the add-expense form). The
product-designer flagged the problem and handed it here: **a Server Action has no
stable URL to curl.**

That is not a guess. `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`
says it directly:

> "A Server Action runs as a POST request against the page that invokes it. At
> build time, the `'use server'` directive tells the compiler to swap the
> function's implementation in client bundles for a reference (an action ID plus
> a dispatcher) that POSTs back to the server." (line 78)

and, on stability:

> "Each Server Action is identified by the action ID that is part of its build
> artifacts. New deployments typically generate new IDs (**Next.js rotates them
> at most every 14 days, even when the source is unchanged**)" (line 174)

Action IDs are also **encrypted at build time** (line 84). So a curl command
against a Server Action is a command that (a) has to be reverse-engineered out of
a client bundle, (b) breaks on the next build, and (c) breaks again on a 14-day
timer with no source change at all. As demo evidence for `REQ-X.8` — a command
Raffaele types in front of a panel — it is the worst possible choice.

## Options considered

### Option A — Curl the Server Action directly
Extract the action ID from the built client chunk, POST to the page URL with the
`Next-Action` header and an RSC-encoded body.
- Pros: tests literally the same endpoint the browser uses. No extra code.
- Cons: the ID rotates (see above), so the recorded evidence expires. The body
  encoding is React's internal RSC action format, not a documented contract.
  Producing the command requires grepping build output. It would make the
  strongest acceptance criterion in Cluster B the most fragile artifact in the
  repo.

### Option B — A Route Handler that duplicates the validation
`POST /api/groups/[groupId]/expenses`, parsing and validating on its own.
- Pros: trivially curlable and stable.
- Cons: **two validation implementations.** The curl would then prove that the
  *API route* rejects bad input, which says nothing about the form's path. It
  would satisfy the letter of `REQ-B.2` and defeat its point.

### Option C — Make the form POST to the Route Handler; drop the Server Action
- Pros: one path, one entry point, trivially curlable.
- Cons: throws away Server Actions, which are an explicit Cluster B concept
  ("wire forms to server mutations with no API route and no manual fetch"), and
  loses progressive enhancement.

### Option D — One service function, two thin entry points
`addExpense(rawInput: unknown, actor)` in `src/lib/expenses/add-expense.ts` owns
**all** validation and returns a discriminated result. Two callers:
1. the Server Action `src/app/(app)/groups/[groupId]/expenses/new/actions.ts`,
   used by the form;
2. the Route Handler `src/app/api/groups/[groupId]/expenses/route.ts`, used by
   curl.

Both are a few lines: authenticate, hand the raw body over, shape the result.
- Pros: the curl genuinely exercises the form's validation code, because there is
  only one copy of it. Stable URL, stable command, stable evidence. Matches the
  backend rule that *authorisation lives in the service layer, below the routes*,
  so a new route that forgets to guard itself still cannot leak.
- Cons: one more file than strictly necessary; a second public POST surface that
  has to be authenticated and rate-limited in its own right (`REQ-F.1`).

## Decision

We chose **Option D**.

Because: the deciding factor is what the evidence has to *prove*. `REQ-B.2`
exists to establish that client-side validation is UX and never a control. That
claim is only demonstrated if the bytes curl sends reach the same validator the
form reaches. Option B produces a passing test that proves nothing; Option A
proves the right thing with an artifact that decays on a 14-day timer.

The Route Handler is the idiomatic Next.js 16 answer to "a stable public HTTP
endpoint" — `node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`
line 48: *"Route Handlers are public HTTP endpoints. Any client can access
them."* There is no documented stable addressing scheme for a Server Action in
this version; that was checked before deciding, not assumed.

### The exact evidence command

```bash
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST $ORIGIN/api/groups/grp_demo/expenses \
  -H 'content-type: application/json' \
  -H "cookie: $COOKIE" \
  -d '{"description":"","amount":"-5.00","currency":"GBP","spentAt":"2099-01-01","paidById":"usr_not_a_member","participantIds":[]}'
```

→ `HTTP 400` with a per-field JSON body. `groupId` is taken from the URL, not the
body, so the URL is the only place it can be set. Full transcript, including the
six other payloads and the valid one, in
[`wiki/evidence/REQ-B.2-server-side-validation.md`](../evidence/REQ-B.2-server-side-validation.md).

## Consequences

- **Makes easy:** the `REQ-B.2` demo is one copy-pasteable command that keeps
  working across rebuilds and redeploys.
- **Makes easy:** Cluster E's Durable Object call has an obvious seam — the
  service function, not the route, is where the DO binding will be invoked, so
  both entry points inherit it at once.
- **Makes hard:** there are now two authenticated POST surfaces for one
  operation. Both must stay thin. **Rule: no validation, authorisation or
  business logic may live in either entry point.** If a rule appears in the route
  handler that is not in the service, the evidence silently stops being evidence.
- **Makes hard:** `REQ-F.1`'s rate limiting has to cover the route handler too,
  not only the form.
- **Revisit if:** Next.js ships a documented stable address for Server Actions,
  or if the two entry points start to diverge — at which point the honest fix is
  Option C, and a superseding ADR.

## Verification

- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` lines 78, 84
  and 174 read on 2026-09-22 — the source of the action-ID rotation claim.
- `node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md` line 48
  and `01-getting-started/15-route-handlers.md` confirm the `route.ts`
  convention, the supported methods, and that handlers are uncached for POST.
- The curl command above was run against `next build` output; the transcript is
  recorded in [`wiki/evidence/REQ-B.2-server-side-validation.md`](../evidence/REQ-B.2-server-side-validation.md).
