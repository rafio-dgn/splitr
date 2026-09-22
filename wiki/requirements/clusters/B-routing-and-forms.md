# Cluster B — Routing and forms

**Part 1 — Foundations.** Still local; still no Cloudflare. Part 1 ends here with
a typed, working application running locally.

Source: capture §5.

---

### REQ-B.1 — Build the route tree

**Statement:** Build the route tree: public routes plus the main `(app)` group.

**Acceptance criteria:**
- [ ] Public routes exist outside the `(app)` group
- [ ] The authenticated/main area is a route group named `(app)`
- [ ] Every route is placed by App Router convention, not by guesswork

**Source:** capture §5 · **Status:** Not started (unblocked — [ADR-0004](../../decisions/0004-project-is-splitr.md))

**Notes:** `(app)` is named explicitly. The reference architecture (§2.5) implies
a second public surface — an intake form — which is what `REQ-F.2`'s Turnstile
protects.

---

### REQ-B.2 — One form on a shared zod schema, proven on both sides

**Statement:** One form on a **shared zod schema**; prove it runs on both sides by
curl-ing an invalid payload past the client and confirming the server rejects it.

**Acceptance criteria:**
- [ ] A single zod schema is imported by **both** client and server
- [ ] The client validates against it and shows per-field errors
- [ ] The server validates against it independently
- [ ] **Demonstrated:** `curl` an invalid payload directly at the server,
      bypassing the client, and the server rejects it
- [ ] The curl command and its output are recorded as evidence

**Source:** capture §5 · **Status:** Not started (unblocked — [ADR-0004](../../decisions/0004-project-is-splitr.md))

**Notes:** The curl proof is the requirement, not a suggestion — the point is
that client-side validation is UX, never a control. Keep the command; it is demo
material (`REQ-X.8`).

---

### REQ-B.3 — Main page as a Server Component, with no client-side data calls

**Statement:** Make the main page a **Server Component** that fetches server-side;
verify in devtools that there are **no client-side data calls**.

**Acceptance criteria:**
- [ ] The main page is a Server Component
- [ ] Data is fetched server-side
- [ ] **Verified in devtools:** the Network tab shows no client-side data fetch
      on load

**Source:** capture §5 · **Status:** Not started (unblocked — [ADR-0004](../../decisions/0004-project-is-splitr.md))

---

### REQ-B.4 — `loading.tsx` and an error boundary

**Statement:** Add `loading.tsx` and an error boundary.

**Acceptance criteria:**
- [ ] `loading.tsx` present for the async route(s)
- [ ] An error boundary catches render/fetch failures
- [ ] Every async page has a loading, error **and empty** state

**Source:** capture §5 · **Status:** Not started

**Notes:** The empty state comes from the concepts list ("give every async page a
loading, error and empty state"), not the build list — worth doing anyway.

---

### REQ-B.5 — Authentication `[OPTIONAL]`

**Statement:** *If auth is needed*, drop in a library (Auth.js, Lucia, Clerk) as a
black box — just `getSession()` and route gating.

**Acceptance criteria (if in scope):**
- [ ] Auth comes from a library, treated as a black box
- [ ] Only `getSession()` and route gating are used
- [ ] No time spent building auth from scratch at this stage

**Source:** capture §5 · **Status:** ✅ **In scope** — Splitr has groups, so it
needs identity. Library still to choose (Auth.js / Lucia / Clerk) — needs an ADR.

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
