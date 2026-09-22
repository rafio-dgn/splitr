# Cluster B — Routing and forms

**Part 1 — Foundations.** Still local; still no Cloudflare. Part 1 ends here with
a typed, working application running locally.

Source: capture §5.

---

### REQ-B.1 — Build the route tree

**Statement:** Build the route tree: public routes plus the main `(app)` group.

**Acceptance criteria:**
- [x] Public routes exist outside the `(app)` group — `/` (`src/app/page.tsx`),
      `/login` and `/register` in the `(auth)` group, and `/join/[inviteCode]`,
      which is the one that matters: an invite link inside `(app)` would be
      bounced to `/login` by the session gate, destroying the surface `REQ-F.2`
      exists to protect. Verified: `curl` to `/join/7fK2pQvm` with no cookie →
      `200` and the group card; `/groups` with no cookie → `307 → /login`.
- [x] The authenticated/main area is a route group named `(app)` — parentheses,
      so it adds no URL segment (`/groups`, not `/app/groups`), and one
      `getSession()` gate in `src/app/(app)/layout.tsx` covers all eight screens
      inside it
- [x] Every route is placed by App Router convention, not by guesswork — 15
      routes in the `next build` output, matching
      [`screens-cluster-b.md`](../../context/screens-cluster-b.md) §1's tree.
      Conventions checked against `node_modules/next/dist/docs/` before use, not
      recalled: `error.tsx` takes **`retry`**, not the `reset` of earlier
      versions; layout props are the generated `LayoutProps<"/groups/[groupId]">`;
      `params` and `searchParams` are promises; `headers()` is async.

**Source:** capture §5 · **Status:** ✅ **Done** — 2026-09-22. One structural
finding worth keeping: `notFound()` thrown in a **layout** is not caught by the
`not-found.tsx` beside it (that boundary renders inside the layout that threw) —
it bubbles to the parent segment. The group 404 therefore lives at
`(app)/groups/not-found.tsx`. See [ADR-0011](../../decisions/0011-one-membership-check-per-request.md).

**Notes:** `(app)` is named explicitly. The reference architecture (§2.5) implies
a second public surface — an intake form — which is what `REQ-F.2`'s Turnstile
protects.

---

### REQ-B.2 — One form on a shared zod schema, proven on both sides

**Statement:** One form on a **shared zod schema**; prove it runs on both sides by
curl-ing an invalid payload past the client and confirming the server rejects it.

**Acceptance criteria:**
- [x] A single zod schema is imported by **both** client and server —
      `src/lib/schemas/expense.ts`, imported by `add-expense-form.tsx` (client)
      and by `src/lib/expenses/add-expense.ts` (server). The module imports only
      `zod`, which is what keeps it importable from both sides.
- [x] The client validates against it and shows per-field errors — **verified in
      a real browser**, 2026-09-22. Chrome driven over the DevTools Protocol
      against `/groups/grp_demo/expenses/new`: eleven field states exercised, each
      message produced by `parseAddExpense` from `@/lib/schemas/expense` and none
      of them a hand-written copy. Errors are tied to their field by
      `aria-describedby` with `aria-invalid="true"`; an untouched form shows
      none; an invalid submit is stopped in the browser (`0` requests) and focus
      moves to the first bad field; a `paidById` the client cannot fault comes
      back from the server into the *same* place. Transcript in
      [`wiki/evidence/REQ-B.2-server-side-validation.md`](../../evidence/REQ-B.2-server-side-validation.md).
- [x] The server validates against it independently — `addExpense()` parses the
      raw body with the same schema before reading a property off it
- [x] **Demonstrated:** `curl` an invalid payload directly at the server,
      bypassing the client, and the server rejects it — 10 payloads, `HTTP 400`
      with per-field messages, plus the membership rejection the client cannot
      make
- [x] The curl command and its output are recorded as evidence —
      [`wiki/evidence/REQ-B.2-server-side-validation.md`](../../evidence/REQ-B.2-server-side-validation.md)

**Source:** capture §5 · **Status:** ✅ **Done** — 2026-09-22. The server half was
demonstrated by curl on 2026-09-22; the client half was exercised in a browser
the same day and the last criterion closed.

**Notes:** The curl proof is the requirement, not a suggestion — the point is
that client-side validation is UX, never a control. Keep the command; it is demo
material (`REQ-X.8`).

The Server Action could not be the curl target: its action id is encrypted and
rotated by Next.js at least every 14 days. One service function
(`src/lib/expenses/add-expense.ts`) with two thin entry points — the Server
Action and `POST /api/groups/[groupId]/expenses` — keeps a single validation path
behind a stable URL. See [ADR-0010](../../decisions/0010-validation-entry-points.md).

---

### REQ-B.3 — Main page as a Server Component, with no client-side data calls

**Statement:** Make the main page a **Server Component** that fetches server-side;
verify in devtools that there are **no client-side data calls**.

**Acceptance criteria:**
- [x] The main page is a Server Component — `src/app/(app)/groups/[groupId]/page.tsx`
      has no `"use client"`, so React hooks are not available to it at all. The
      one piece of client code the route ships is `SectionErrorBoundary`, a class
      error boundary with no data of its own; its `children` — the expense feed —
      still render on the server.
- [x] Data is fetched server-side — `requireSession()`, `resolveGroup()` and
      `listGroupExpenses()` are all `await`ed during the render, and the balance
      is derived there too
- [x] **Verified in devtools:** the Network tab shows no client-side data fetch
      on load — 23 requests on load, **0 `fetch`, 0 `xhr`**; every one is the
      document or a static asset. Confirmed twice more: the page renders in full
      with JavaScript disabled, and `curl` alone returns every word it displays.
      Recorded in
      [`wiki/evidence/REQ-B.3-no-client-side-data-calls.md`](../../evidence/REQ-B.3-no-client-side-data-calls.md).

**Source:** capture §5 · **Status:** ✅ **Done** — 2026-09-22

---

### REQ-B.4 — `loading.tsx` and an error boundary

**Statement:** Add `loading.tsx` and an error boundary.

**Acceptance criteria:**
- [x] `loading.tsx` present for the async route(s) — five: `/groups`,
      `/groups/[groupId]`, `.../members`, `.../expenses/[expenseId]`, `/search`,
      plus the public `/join/[inviteCode]`. Verified by slowing the fixture read
      to 2.5s and reading the first two seconds of the stream: `/groups/grp_demo`
      sent the group header **and its actions** from the layout, then 30 skeleton
      elements and the live-region line "Working out where everyone stands…",
      which is exactly the behaviour
      [`screens-cluster-b.md`](../../context/screens-cluster-b.md) §5.5 asks for.
- [x] An error boundary catches render/fetch failures — six `error.tsx` files,
      each a Client Component (Next.js requires it) taking **`retry`**, the
      Next.js 16 prop. Verified by injecting a throw into the group's data read:
      the page was replaced by "We couldn't work out the balance / Your expenses
      are safe — we just couldn't add them up." Injecting the throw one level
      lower, inside the expense feed, was caught by the **section-scoped**
      boundary instead: "We couldn't load the expenses / The balance above is
      still accurate", with `Everyone's square` still on screen above it (§5.6).
- [x] Every async page has a loading, error **and empty** state — the thirteen
      surfaces of §5 are tabulated in the changelog entry for this change. Three
      are coded but not reachable in Cluster B and are listed there rather than
      claimed: the "You're the only member" split-picker empty, the "It's just
      you in here so far" members empty (the fixture group has three people) and
      the expense-detail "No line items" empty (no expense can exist before
      `REQ-D.1`).

**Source:** capture §5 · **Status:** ⚠️ **In progress** — downgraded from Done by the tech lead on QA finding F-3.
Four of thirteen empty states are coded but have **never rendered** — unreachable
until `REQ-D.1` replaces the group fixture with real tables. "Compiled" is not
"has". Reachable again at `REQ-D.1`.

**Notes:** The empty state comes from the concepts list ("give every async page a
loading, error and empty state"), not the build list — worth doing anyway.

---

### REQ-B.5 — Authentication `[OPTIONAL]`

**Statement:** *If auth is needed*, drop in a library (Auth.js, Lucia, Clerk) as a
black box — just `getSession()` and route gating.

**Acceptance criteria (if in scope):**
- [x] Auth comes from a library, treated as a black box — **Better Auth 1.7.5**,
      mounted at `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`
- [x] Only `getSession()` and route gating are used — `src/lib/session.ts`
      exports exactly `getSession()` and `requireSession()`; the gate is
      `src/app/(app)/layout.tsx`
- [x] No time spent building auth from scratch at this stage — no hashing, no
      session tokens, no cookie handling and no crypto anywhere in `src/`.
      Verified: sign-up → sign-in → session → gated route → sign-out → session
      revoked, all through the library's own endpoints

**Source:** capture §5 · **Status:** ✅ **Done** — restored 2026-09-22 after QA
finding F-1 was fixed and re-verified. F-1 had two independent defects: the
trusted origin was pinned to one port (`BETTER_AUTH_URL=…:3000` while the app ran
on 3100 → `403 INVALID_ORIGIN`), and **sign-out failed silently** — the user
landed on `/login` still signed in. Both are fixed: the port is gone from
configuration entirely ([ADR-0013](../../decisions/0013-base-url-is-the-request-host-not-a-port-in-env.md)),
and `sign-out-button.tsx` now checks `signOut()`'s `{ data, error }` result and
tells the user when it fails instead of redirecting. Re-verified in **real
Chrome** (curl cannot catch this — it sends no `Origin` header) on **both 3000
and 3100**, in dev and in a production build: register → sign in → sign out →
`/groups` redirects to `/login`, plus the sign-out failure path. Transcript:
[`REQ-B-cluster-verification.md` § "F-1 — fix verified"](../../evidence/REQ-B-cluster-verification.md).
The library choice and what it persists against before D1 exists are
recorded in [ADR-0009](../../decisions/0009-better-auth-on-local-sqlite-via-drizzle.md).

**Notes:** The course explicitly steers *away* from hand-rolled auth here, and
adds: *"The reference build EdgeLedger ships Workers-native auth (Web Crypto
hashing, sessions in KV); read it afterwards."* — i.e. EdgeLedger's PBKDF2 +
KV-session implementation is **afterwards reading**, not a pattern to copy now.
This is the clearest instance of the rule in
[ADR-0003](../../decisions/0003-edgeledger-is-comparison-not-template.md).

---

### REQ-B.6 — Answer the cluster questions

**Statement:** Be able to answer, unaided:
1. For any component: server, client, or both — and why?
2. Where does your form's validation actually run?
3. What happens to your loading state on a flaky network?

**Acceptance criteria:**
- [ ] All three answered without notes

**Source:** capture §5 · **Status:** Not started

---

## Concepts to master

| Concept | What it gets you |
|---|---|
| The App Router | Place every route in the right file without guessing. |
| Server vs client components | Decide which side each component belongs on, and say why. |
| Server Actions | Wire forms to server mutations with no API route and no manual fetch. |
| One shared zod schema | Validate the same way on client and server, with clean field errors. |
| Suspense & error boundaries | Give every async page a loading, error and empty state. |

**Optional refresher:** Master Next.js the easy way — App Router & Server Actions.

---

## ✅ Part 1 exit criteria

A typed, working application running locally. No Cloudflare services yet.
