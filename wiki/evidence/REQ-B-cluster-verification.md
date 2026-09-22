# Cluster B — independent adversarial re-verification

**Date:** 2026-09-22 · **Agent:** qa-test · **Server:** `next dev -p 3100`
(Next.js 16.3.5) and, where noted, `next build && next start -p 3100`
**Browser:** real Chrome 
(`/Applications/Google Chrome.app`), driven over the DevTools Protocol by a
zero-dependency Node 24 script — no `puppeteer`, which is not installed here.

Every criterion of `REQ-B.1` … `REQ-B.5` was marked `Done` before this run. The
brief was to **try to prove them wrong**, trusting neither the requirement file,
nor the changelog, nor the existing evidence files — the commands in those were
re-run and their output compared.

**Result: 21 of 23 criteria hold. Two do not, and a third is a wording defect.**
Statuses were **not** changed; the tech lead decides. Nothing was fixed.

> **Added 2026-09-22 by the backend agent, after the tech lead dispatched F-1:**
> QA's findings below are unchanged. A **"F-1 — fix verified"** section is
> inserted after F-1 with the root cause, the fix and a browser transcript on both
> ports. F-2, F-3 and O-1…O-4 are untouched and still open.

---

## Findings

### 🔴 F-1 — `BETTER_AUTH_URL` is pinned to port 3000; on any other port all authentication is broken, and sign-out fails *silently*

Contradicts `REQ-B.5`'s third criterion: *"Verified: sign-up → sign-in → session
→ gated route → sign-out → session revoked."*

`.env` ships `BETTER_AUTH_URL=http://localhost:3000`. The documented run port —
in [`REQ-B.2-server-side-validation.md`](./REQ-B.2-server-side-validation.md),
in [`REQ-B.3-no-client-side-data-calls.md`](./REQ-B.3-no-client-side-data-calls.md),
and in the dispatch that produced this file — is **3100**, because the OrbStack
container from [ADR-0007](../decisions/0007-docker-for-local-development.md)
holds 3000. Better Auth derives its trusted origin from `BETTER_AUTH_URL`, so
every browser request carries `Origin: http://localhost:3100` and is refused.

**Registering in a real browser on :3100**

```
=== network during register submit ===
  403 Fetch      /api/auth/sign-up/email :: {"message":"Invalid origin","code":"INVALID_ORIGIN"}
url: /register
page text: … | We couldn't create your account. Check your email and password and try again. | …
```

The email and password were fine. The message sends the user to fix the one thing
that is not wrong.

**Sign-out, same config, with a valid session cookie injected**

```
1. signed in, on /groups: Splitr | Your groups | qa-so2-1790100316@splitr.test | Sign out | Your groups
2. click Sign out: clicked
3. network during sign-out:
   403 /api/auth/sign-out :: {"message":"Invalid origin","code":"INVALID_ORIGIN"}
   200 /login?_rsc=eIawQQIY9r2x3FPV :: …
4. url after clicking Sign out: /login
5. page says: Splitr | Log in | Email | Password
6. navigate back to /groups -> pathname: /groups
7. body: Splitr | Your groups | qa-so2-1790100316@splitr.test | Sign out | Your groups | Create a group
```

**Step 6 is the finding.** The user clicked "Sign out", landed on the login page,
and is still signed in. On a shared machine that is a real problem.

**Root cause confirmed** by restarting the same tree with the origin corrected
and changing nothing else:

```console
$ BETTER_AUTH_URL=http://localhost:3100 npm run dev -- -p 3100
=== network during register submit ===
  200 Fetch      /api/auth/sign-up/email :: {"token":"wJ5siXAr…","user":{…}}
url: /groups
page text: Splitr | Your groups | qa-b-1790100274057@splitr.test | Sign out | Your groups | …
```

**Two independent defects here, and the second survives fixing the first.**
`src/components/sign-out-button.tsx` does not check the result:

```tsx
await signOut();
router.replace("/login");
router.refresh();
```

`signOut()` returns `{ data, error }` and does not throw, so *any* failure —
403, network, server error — presents to the user as a successful sign-out.
`login-form.tsx` and `join-form.tsx` both check `result.error`; only this one
does not.

Why curl missed it: Better Auth applies its origin check only when an `Origin`
header is present *or* required for that endpoint. `sign-up` and `sign-in` over
curl send no `Origin` and pass; `sign-out` refuses either way
(`MISSING_OR_NULL_ORIGIN` without the header, `INVALID_ORIGIN` with it). A
browser always sends one. Verifying this criterion by curl could not have caught
it.

### ✅ F-1 — fix verified

**Date:** 2026-09-22 · **Agent:** backend · **QA's findings above are unchanged** —
this section records the fix and its proof. Both halves of F-1 were real and both
are fixed; the two defects were independent and were fixed independently.

#### Defect 1 — origin mismatch. Root cause and fix

`BETTER_AUTH_URL` is what Better Auth derives its *trusted origin* from
(`getTrustedOrigins` in `node_modules/better-auth/dist/context/helpers.mjs`,
enforced by `validateOrigin` in
`.../dist/api/middlewares/origin-check.mjs` — read, not recalled). Pinning it to
one port breaks every other port.

Fixed by **removing the port from configuration entirely**, not by changing it:
`src/lib/auth.ts` now passes Better Auth 1.7.5's dynamic `baseURL` form, which
resolves the base URL per request from the `Host` header against an allowlist and
derives the trusted origins from the same list:

```ts
baseURL: deployedBaseURL ?? {
	allowedHosts: ["localhost:*", "127.0.0.1:*"],
	protocol: "http",
	fallback: "http://localhost",
},
```

`BETTER_AUTH_URL` is gone from `.env` and `.env.example`. A *loopback*
`BETTER_AUTH_URL` is now **ignored with a warning**, because it can no longer be
right — so pasting the original F-1 line back in cannot re-break auth (probe
below). A non-loopback value — a real deployment, Cluster C/D — is still honoured
verbatim. Options weighed and rejected: [ADR-0013](../decisions/0013-base-url-is-the-request-host-not-a-port-in-env.md).

#### Defect 2 — silent sign-out. Root cause and fix

`signOut()` resolves to `{ data, error }` and does **not** throw, so
`await signOut(); router.replace("/login")` reported success for every failure.
`src/components/sign-out-button.tsx` now checks the result the same way
`login-form.tsx`, `register-form.tsx` and `join-form.tsx` do, and additionally
`.catch()`es a rejected promise:

```tsx
const result = await signOut().catch(() => null);
setBusy(false);
if (result === null || result.error) {
	setError("We couldn't sign you out — you're still signed in. Try again.");
	return;   // deliberately no redirect
}
router.replace("/login");
```

A failed sign-out now keeps the user where they are and says so, in a
`role="alert"`. It no longer claims success. This fix is independent of defect 1
and survives it: it was exercised with the origin problem already fixed, by
blocking the endpoint at the network layer.

#### How this was verified — a real browser, on both ports

QA's point stands: **`curl` cannot catch this**, because it sends no `Origin`
header and the check only bites when one is present. So the proof is real Chrome
(`/Applications/Google Chrome.app`) driven over the DevTools Protocol by a
zero-dependency Node 24 script — no `puppeteer` — using Node's built-in
`WebSocket`, `Target.attachToTarget` with `flatten: true`, `Network.enable` for
the request log and `Network.setBlockedURLs` to force the failure path.

Five runs, 16 assertions each, **all passing**:

| run | result |
|---|---|
| `next dev -p 3100` | 16/16 |
| `next dev -p 3000` | 16/16 |
| `next build && next start -p 3100` | 16/16 |
| `next build && next start -p 3000` | 16/16 |
| `next dev -p 3100` with `BETTER_AUTH_URL=http://localhost:3000` re-added | 16/16 |

Full transcript of the `next dev -p 3100` run (the others differ only in the port
and the generated email):

```
================ http://localhost:3100 ================

1. REGISTER as fix-f1-1790101910480@splitr.test
  200 /api/auth/sign-up/email :: {"token":"G9NkI9c3gggXm6cNrF9fn1TAmD2iJoIR","user":{"name":"Fix F1","email":"fix-f1-1790101910480@splitr.test",…}
  PASS  register lands on /groups :: /groups
  PASS  header shows the signed-in user :: Splitr Your groups fix-f1-1790101910480@splitr.test Sign out Your groups Create a group Flat 3B 3 people Square
  PASS  get-session returns a session :: {"session":{"expiresAt":"2026-09-29T18:31:51.570Z","token":"G9NkI9c3gggXm6cNrF9fn1TAmD2iJo

2. SIGN OUT (expected to succeed)
  200 /api/auth/sign-out :: {"success":true}
  PASS  sign-out lands on /login :: /login
  PASS  navigating back to /groups redirects to /login :: /login
  PASS  no user email on the page :: Splitr Log in Email Password Log in No account yet? Sign up
  PASS  get-session is empty :: "null"

3. SIGN IN
  200 /api/auth/sign-in/email :: {"redirect":false,"token":"JnymhfpOGKX6WFnYNdEg7qqxVMd9M96Q","user":{…}}
  PASS  sign-in lands on /groups :: /groups
  PASS  header shows the signed-in user :: Splitr Your groups fix-f1-1790101910480@splitr.test Sign out …

4. SIGN OUT with /api/auth/sign-out blocked (failure path)
  --- /api/auth/sign-out :: request failed: blocked (inspector)
  PASS  stays on /groups :: /groups
  PASS  the user is told sign-out failed :: … We couldn't sign you out — you're still signed in. Try again. …
  PASS  message is announced (role=alert) :: We couldn't sign you out — you're still signed in. Try again.
  PASS  still signed in, honestly :: … fix-f1-1790101910480@splitr.test …

5. RETRY sign-out once unblocked
  PASS  retry signs out :: /login
  PASS  and /groups is gated again :: /login

================ http://localhost:3100: ALL CHECKS PASSED ================
```

**Step 2's third line is QA's finding, inverted.** Where QA recorded
`6. navigate back to /groups -> pathname: /groups` with the user still in the
header, the same navigation now lands on `/login` and `get-session` returns
`null`.

**Step 4 is the second defect's proof.** The endpoint is blocked at the network
layer, so the failure is genuine and has nothing to do with origins. The user
stays on `/groups`, is told in a `role="alert"` that they are still signed in —
which is true — and the retry after unblocking works.

#### Negative control — the CSRF check was narrowed, not removed

```console
$ COOKIE=... # from a fresh sign-up
$ curl -s -X POST localhost:3100/api/auth/sign-out -H 'content-type: application/json' \
    -d '{}' -H "cookie: $COOKIE" -H "origin: https://evil.example"
{"message":"Invalid origin","code":"INVALID_ORIGIN"}       HTTP 403

$ ... -H "origin: http://sub.localhost:3100"
{"message":"Invalid origin","code":"INVALID_ORIGIN"}       HTTP 403

$ ... -H "origin: http://localhost:3100"
{"success":true}                                           HTTP 200
```

Only loopback origins were added. The wildcard covers the **port**, not the host:
`http://sub.localhost:3100` and `https://localhost:3100` are both still refused —
checked directly against the installed matcher
(`matchesOriginPattern`, `matchesHostPattern`) before writing the config.

#### Regression probe — re-introducing the original mistake

The exact line that caused F-1 was pasted back into `.env` and the app restarted
on 3100:

```console
$ printf 'BETTER_AUTH_URL=http://localhost:3000\n' >> .env && npx next dev -p 3100
[splitr] Ignoring BETTER_AUTH_URL=http://localhost:3000: a loopback base URL pins
Better Auth's trusted origin to one port and breaks every other one (QA finding
F-1). Local development needs no BETTER_AUTH_URL — see src/lib/auth.ts.

$ node browser-verify.mjs http://localhost:3100
================ http://localhost:3100: ALL CHECKS PASSED ================
```

`.env` was restored afterwards (`grep -n "^BETTER_AUTH_URL=" .env` → no match).

#### An unknown `Host` no longer 500s

Measured before and after adding `fallback`, with a forged header:

```console
# before fallback                        # after fallback
GET /groups  -H 'Host: evil.example'  500     GET /groups  -H 'Host: evil.example'  307 → /login
GET /login   -H 'Host: evil.example'  200     GET /login   -H 'Host: evil.example'  200
```

`resolveDynamicBaseURL` throws for a host that is not on the allowlist; the
`fallback` turns that into "render the page, refuse the untrusted origin", which
is the honest outcome. Serving Splitr on a non-loopback host (a LAN IP, a tunnel)
is a deployment and must set `BETTER_AUTH_URL`.

#### Checks

```console
$ npx tsc --noEmit     # clean
$ npm run lint         # clean
$ npm run build        # clean, same 15 routes as REQ-B.1 above
```

#### What could not be verified, and one new problem found

- **Port 3000 was verified with native `next dev -p 3000` / `next start -p 3000`,
  not inside the OrbStack container.** The container cannot currently serve the
  app at all, for a reason that has nothing to do with F-1: its `node_modules`
  volume was built before `better-auth` and `better-sqlite3` were added, so it
  answers `500 Module not found: Can't resolve 'better-auth/react'`, and
  `docker compose up --build` fails because `Dockerfile.dev` has no Python or
  C toolchain for `better-sqlite3`'s `node-gyp rebuild`
  (`gyp ERR! find Python`). **This predates and is independent of this fix** —
  it was already failing when this task started. Logged in
  `wiki/todos/backlog.md`; not fixed here (out of scope, and it touches
  [ADR-0007](../decisions/0007-docker-for-local-development.md)).
  What the browser runs proves is the property F-1 is about: the app serves
  authentication correctly on **whatever port it is given**, 3000 and 3100
  included.
- **Every other failure mode of `signOut()`.** The failure path was forced by
  blocking the request. A 500 from the endpoint, or a rejected promise from a
  different cause, take the same two branches (`result.error` / `.catch`), but
  only the blocked-request path was driven in a browser.
- Nothing in F-2, F-3, O-1…O-4 was touched. They remain as QA recorded them.

#### How to re-run

```bash
npx next dev -p 3100          # or -p 3000, or: npm run build && npx next start -p 3100
node browser-verify.mjs http://localhost:3100 9333
```

The driver script is a throwaway (it lives outside the repo, like QA's); its
mechanism is described above — CDP over Node's built-in `WebSocket`,
`Runtime.evaluate` to fill and submit the real forms, `Network.setBlockedURLs`
for the failure path.

---

### 🔴 F-2 — `REQ-B.3`'s "0 fetch, 0 xhr" is true on `next dev` only; a production build makes **nine** `fetch` requests on load

Contradicts `REQ-B.3`'s third criterion: *"Verified in devtools: the Network tab
shows no client-side data fetch on load — 23 requests on load, **0 `fetch`, 0
`xhr`**."*

The recorded evidence was captured on `next dev`, which disables `<Link>`
prefetching. `next build && next start` re-enables it. Same page, same cookie,
same recorder:

```
URL: http://localhost:3100/groups/grp_demo        [next start — production build]
Document    GET /groups/grp_demo
Fetch       GET /groups?_rsc=dFn0sm-NL8wwpyVW
Fetch       GET /groups?_rsc=-TB1lHYdKXycIuKh
Other       GET /favicon.ico
Fetch       GET /groups/grp_demo/expenses/new?_rsc=dFn0sm-NL8wwpyVW
Fetch       GET /groups/grp_demo/settle?_rsc=dFn0sm-NL8wwpyVW
Fetch       GET /groups/grp_demo/members?_rsc=dFn0sm-NL8wwpyVW
Fetch       GET /groups/grp_demo?_rsc=-TB1lHYdKXycIuKh
Fetch       GET /groups/grp_demo/expenses/new?_rsc=-TB1lHYdKXycIuKh
Fetch       GET /groups/grp_demo/settle?_rsc=-TB1lHYdKXycIuKh
Fetch       GET /groups/grp_demo/members?_rsc=WAbtidhQ_3Dh32JF

TOTAL 26 requests; fetch/xhr: 9
```

Every authenticated page, production build:

```
/groups                                    TOTAL 21 requests; fetch/xhr: 5
/groups/new                                TOTAL 18 requests; fetch/xhr: 2
/groups/grp_demo                           TOTAL 26 requests; fetch/xhr: 9
/groups/grp_demo/members                   TOTAL 26 requests; fetch/xhr: 9
/groups/grp_demo/settle                    TOTAL 25 requests; fetch/xhr: 9
/groups/grp_demo/expenses/new              TOTAL 28 requests; fetch/xhr: 9
/search                                    TOTAL 17 requests; fetch/xhr: 2
```

**What these actually are, stated fairly.** They are Next.js `<Link>` navigation
prefetches, not the page fetching its own data. One response body captured in the
browser shows only the loading boundary:

```
FETCH /groups/grp_demo/members?_rsc=WAbtidhQ_3Dh32JF
  bytes: 2762
  contains: ["Loading"]
```

So the *substance* of `REQ-B.3` survives: the page's own content is entirely in
the document, proved below. But the criterion as written is about what the
Network tab shows, and in the build we will demo it shows nine `fetch` rows —
one of them for `/groups/grp_demo` itself. A panel asked to look at the Network
tab will see them.

**This is a demo-safety finding.** Either demo on `next dev` and say why, or
re-word the criterion to "no client-side fetch of this page's own data" and
record the production log alongside the dev one.

### 🟡 F-3 — `REQ-B.4` says "three" unreachable empty states; there are four

The requirement file reads: *"Three are coded but not reachable in Cluster B"*,
and names the split-picker, the members empty and the expense-detail empty.

The changelog table it points to lists **four**, adding §5.3 *"No groups yet"* —
*"unreachable: the fixture puts every viewer in one group"*. Confirmed against
`src/lib/groups/membership.ts`: `getGroupsForViewer` returns `grp_demo` for every
signed-in viewer, so the group-list empty state cannot render.

The requirement file undercounts its own evidence. Whatever is decided about
whether "coded but unreachable" may sit under `Done`, the count should match.

---

## What holds — re-run, not taken on trust

### `REQ-B.1` — route tree

**15 routes in the build output**, matching the claim exactly:

```
$ npm run build
Route (app)
┌ ○ /                                        ├ ƒ /groups/[groupId]/expenses/new
├ ○ /_not-found                              ├ ƒ /groups/[groupId]/members
├ ƒ /api/auth/[...all]                       ├ ƒ /groups/[groupId]/settle
├ ƒ /api/groups/[groupId]/expenses           ├ ƒ /groups/new
├ ƒ /groups                                  ├ ƒ /join/[inviteCode]
├ ƒ /groups/[groupId]                        ├ ○ /login
├ ƒ /groups/[groupId]/expenses/[expenseId]   ├ ○ /register
                                             └ ƒ /search
```

Eight screens inside `(app)`, four public, two API routes, plus Next's
`/_not-found`.

**The session gate, no cookie:**

```
/                                        200  
/login                                   200  
/register                                200  
/groups                                  307  location: /login
/groups/grp_demo                         307  location: /login
/groups/new                              307  location: /login
/groups/grp_demo/members                 307  location: /login
/groups/grp_demo/settle                  307  location: /login
/groups/grp_demo/expenses/new            307  location: /login
/search                                  307  location: /login
/join/7fK2pQvm                           200
```

One `requireSession()` in `src/app/(app)/layout.tsx` covers all eight. `/join`
is outside the gate and reachable without a session — the thing `REQ-F.2` will
need.

**`/join/[inviteCode]` with a session** also works, which the criterion does not
state but which would break the flow if it did not:

```
--- rendered text ---
You're already in Flat 3B.
Open Flat 3B
```

Invalid code, no session:

```
This invite isn't valid
The link may have been mistyped, or turned off by the group.
Ask whoever sent it to send you a fresh one.
Go to Splitr
```

`error.tsx` prop is **`retry`** in all six files, checked against
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`
— which records `v16.3.0 | retry prop became stable` and says of `reset`: *"In
most cases, you should use retry() instead."* Not recalled; read.

### `REQ-B.2` — one shared schema, both sides

**The schema is genuinely one module, not a copy.** Only two files import it:

```
$ grep -rn "schemas/expense" src/
src/app/(app)/groups/[groupId]/expenses/new/add-expense-form.tsx:37:} from "@/lib/schemas/expense";
src/lib/expenses/add-expense.ts:25:} from "@/lib/schemas/expense";
```

— the Client Component and the server service. The schema module imports
**only zod** (`grep '^import' src/lib/schemas/expense.ts` → one line), which is
what keeps it importable from a browser. And no schema message is restated in the
form: grepping the form for the eight error strings returns nothing.

**All eleven curl payloads re-run, byte-identical to the recorded evidence.**
Same commands, new session, `next dev -p 3100`:

```
--- headline (every field wrong)
{"error":"invalid","fieldErrors":{"description":["Say what this was for — 'Tesco run', 'taxi to the airport'."],"amount":["Amounts can't be negative. If someone paid you back, record that as a settlement instead."],"spentAt":["An expense can't be dated in the future."],"participantIds":["Pick at least one person to split this with."]},"formErrors":[]}
HTTP 400
--- 0 no session        {"error":"unauthenticated"}                                          HTTP 401
--- 1 negative          {"…amount":["Amounts can't be negative. …"]}                          HTTP 400
--- 2 three dp          {"…amount":["Amounts can have at most two decimal places."]}          HTTP 400
--- 3 zero              {"…amount":["An expense has to be more than £0.00."]}                 HTTP 400
--- 4 empty desc        {"…description":["Say what this was for — …"]}                        HTTP 400
--- 5 empty split       {"…participantIds":["Pick at least one person to split this with."]}  HTTP 400
--- 6 non-member payer  {"…paidById":["That person isn't in this group. Refresh …"]}          HTTP 400
--- 7 future            {"…spentAt":["An expense can't be dated in the future."]}             HTTP 400
--- 8 USD               {"…currency":["Splitr only handles pounds at the moment."]}           HTTP 400
--- 9 not json          {"error":"invalid","formErrors":["Body must be valid JSON."]}         HTTP 400
--- 10 other group      {"error":"not-found"}                                                 HTTP 404
--- VALID
{"status":"accepted","persisted":false,"expense":{…,"amount":4250,…},"shares":[{"…","shareMinorUnits":1417},{"…","shareMinorUnits":1417},{"…","shareMinorUnits":1416}]}
HTTP 202
```

`1417 + 1417 + 1416 = 4250`. Hand-checked across six more splits — `1/3`, `0/3`,
`100/7`, `5/2`, `1000/1`, `4250/3` — every one sums exactly to its total.

**`[AUDIT]` lines still emitted**, 11 of them for the 13 calls (the
unauthenticated call and the malformed-JSON call are refused before
`addExpense()` runs):

```
[AUDIT] {"ts":1790099779,"actor":"Fz9pE5OHzC39GaJEpUCTGXUzX86YNiAq","action":"expense.add","target":"grp_someone_elses","outcome":"rejected:not-found","persisted":false}
[AUDIT] {"ts":1790099779,"actor":"Fz9pE5OHzC39GaJEpUCTGXUzX86YNiAq","action":"expense.add","target":"grp_demo","outcome":"accepted:not-persisted-until-REQ-D.1","persisted":false,"detail":{"amountMinorUnits":4250,"currency":"GBP","participants":3}}
```

**Not re-verified:** the eleven browser field-state transcripts in the existing
evidence file. `REQ-B.2`'s client half was re-established indirectly — the form
renders, imports the shared module, and shows no hand-written copies of its
messages — but the per-field blur/change/focus sequence was not re-driven. The
original transcript is plausible and its mechanism is confirmed; it was not
independently reproduced.

### `REQ-B.3` — Server Component, no client data calls

**`src/app/(app)/groups/[groupId]/page.tsx` has no `"use client"`.** A `grep -rl`
appears to match it, but the hit is line 8 of its own doc comment explaining the
absence. Line 1 is `/**`. The claim is true; the grep is a trap.

**No `useEffect` and no `fetch` anywhere in the route's subtree.** Project-wide
there is exactly one of each: `src/components/copy-link-button.tsx` uses
`useEffect` for a 2-second "Copied." timer (no network), and `src/lib/fetch.ts`
exports `fetchJson`, which **nothing imports** — a Cluster A teaching artefact.

**Network log on `next dev`, reproduced independently** (my own CDP recorder, not
the original script):

```
TOTAL 23 requests; fetch/xhr: 0
```

Every request the document or a static asset. Same count as the recorded
evidence. **And every other authenticated page, also zero on dev:**

```
/groups  0 · /groups/new  0 · /groups/grp_demo/members  0 · /groups/grp_demo/settle  0
/groups/grp_demo/expenses/new  0 · /search  0 · /search?q=tesco  0
/  0 · /login  0 · /register  0 · /join/7fK2pQvm  0 · /join/badcode  0
```

**`curl` returns every word the page displays** — no browser involved:

```
Splitr Your groups qa-1790099738@splitr.test Sign out Flat 3B Add an expense
Settle up Invite someone Everyone's square Nothing is owed in Flat 3B right now.
What's been spent No expenses yet Add the first one and the balance starts working.
```

See **F-2** for what changes in a production build.

### `REQ-B.4` — loading, error, empty

**Six `loading.tsx`, six `error.tsx`, two `not-found.tsx`**, all present, and each
loading file's live-region copy was found in the served HTML:

```
/groups                                    'Loading your groups…'             -> 1
/groups/grp_demo                           'Working out where everyone stands…' -> 1
/groups/grp_demo/members                   'Loading the members…'             -> 1
/search                                    'Searching…'                       -> 1
/join/7fK2pQvm                             'Checking this invite…'            -> 2
/groups/grp_demo/expenses/exp_nope         'Loading this expense…'            -> 1
```

**Error boundaries re-verified by injection**, not taken on trust. Injected
`throw new Error("QA INJECTED FAILURE — deriveBalances")` into
`src/lib/expenses/balances.ts`:

```
Flat 3B | Add an expense | Settle up | Invite someone
We couldn't work out the balance
Your expenses are safe — we just couldn't add them up. Try again.
Try again
```

The group layout's chrome survives; only the page is replaced. `/groups/grp_demo/settle`,
which has no `error.tsx` of its own, **inherits** the same boundary — identical
output. So "every async page has an error state" holds by segment inheritance,
not only by file count.

Injected into `ExpenseFeed`'s render instead — the **section-scoped** boundary
catches, with the balance intact above it:

```
Everyone's square
Nothing is owed in Flat 3B right now.
WHAT'S BEEN SPENT
We couldn't load the expenses
The balance above is still accurate.
Try again
```

Both files restored; `shasum -c` verified.

**Not-found states, rendered:**

```
/groups/not_a_group  ->  We can't find that group /
                         It may have been deleted, or you may not be a member of it.
/groups/grp_demo/expenses/exp_nope
                     ->  We can't find that expense /
                         It may have been deleted, or it may belong to a different group.
```

Neither distinguishes "missing" from "not yours" — the enumeration defence holds.

### `REQ-B.5` — auth as a black box

```
$ grep -rn -iE "crypto|pbkdf2|bcrypt|scrypt|argon|createHash|hmac|jwt|jose|randomBytes|subtle|setCookie|session_token" src/
src/lib/auth.ts:38:	// `nextCookies()` must be the last plugin: it flushes Set-Cookie headers
src/lib/auth.ts:40:	plugins: [nextCookies()],
src/lib/session.ts:5: * parsing, no cookie reading, no expiry arithmetic and no crypto — if any of
```

Two comments and one plugin registration. **No hashing, no token handling, no
cookie parsing, no crypto anywhere in `src/`.** `src/lib/session.ts` exports
`getSession()`, `requireSession()` and the `AppSession` type — nothing else.
`auth-client.ts` re-exports `useSession`, but nothing imports it, so no
client-side session fetch exists.

The library's own endpoints behave (`.env` as committed, curl, no `Origin`):

```
1) sign-up            200
2) get-session        {"session":{…},"user":{…}}
3) /groups            200
7) sign-in            200
9) wrong password     {"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"} HTTP 401
10) password < 12     {"message":"Password too short","code":"PASSWORD_TOO_SHORT"}               HTTP 400
```

Sign-out is the exception — **F-1**.

---

## Lower-severity observations

Not criteria failures. Recorded so they are not re-discovered.

**O-1 — a missing group returns HTTP 200, not 404.** The `not-found.tsx` content
renders correctly, but the status line has already been flushed with the
streaming shell, so Next cannot revise it. Reproduced in the production build:

```
/groups/not_a_group                        200
/groups/grp_demo/expenses/exp_nope         200
/nosuchpage                                404      ← the static 404 does return 404
```

Human-visible behaviour is right; a crawler or a `curl -f` sees success.

**O-2 — the gate drops the return path.** `screens-cluster-b.md` §1 specifies
`redirect("/login?next=<path>")`; the implementation redirects to `/login` flat,
and `grep -rn "next=" src/` finds nothing. After signing in you land on `/groups`,
not where you were headed. A deviation from the design spec, not from any
`REQ-B` criterion.

**O-3 — `listGroupExpenses` is read twice per render, and the section boundary
cannot catch a feed *data* failure.** `page.tsx:59` awaits it for the balance and
`ExpenseFeed` awaits it again for the list; neither call is `cache()`d (unlike
`resolveGroup`). Consequences: in Cluster D that is two D1 queries per page view;
and because the page's call comes first, a genuine failure of the feed's data
source is caught by the **page-level** boundary, never the section-scoped one —
which is why the injection above had to be placed in the component's render to
reach it. The isolation the `SectionErrorBoundary` was added for does not apply
to the failure it was added for.

**O-4 — the non-empty balance branch is currently unreachable.**
`listGroupExpenses` returns `[]` unconditionally until `REQ-D.1`, so
`deriveBalances` always yields zeros: the "You're owed £…" headline and the
"Everyone's position" list have never rendered with data. Same class as the four
empty states of F-3, in the other direction.

---

## What could not be verified here

- **The eleven browser field-state transcripts of `REQ-B.2`'s client half.** Not
  re-driven. See the note in the `REQ-B.2` section above.
- **`REQ-B.3`'s prefetch payloads in full.** Chrome evicts response bodies once a
  navigation settles; two of the nine were captured in time, and both contained
  only the loading boundary. The remaining seven are assumed to be the same kind
  of response — assumed, not observed.
- **Anything about the demo machine.** All of the above is macOS 25.6, Node
  24.21.0, Chrome headless, `.data/splitr.db` on local SQLite. The `REQ-F.2`
  Turnstile surface and every Cloudflare binding are still absent.

## How to re-run this

```bash
npm run dev -- -p 3100                   # or: npm run build && npm run start -- -p 3100
curl -s -X POST localhost:3100/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"name":"QA","email":"qa-'$(date +%s)'@splitr.test","password":"correct-horse-battery"}' \
  -c /tmp/qa.txt
export COOKIE="better-auth.session_token=$(awk '/session_token/{print $7}' /tmp/qa.txt)"
```

Then the payload table of
[`REQ-B.2-server-side-validation.md`](./REQ-B.2-server-side-validation.md), and
for the network logs any CDP recorder that prints `request.type` per
`Network.requestWillBeSent`. **Record which build mode you ran in** — F-2 is
entirely a build-mode difference.
