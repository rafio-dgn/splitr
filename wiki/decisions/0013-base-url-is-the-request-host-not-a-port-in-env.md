# ADR-0013: Better Auth's local base URL is the request's host, not a port in `.env`

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** AI (backend agent), pending human review
- **Requirement:** `REQ-B.5` (QA finding F-1)

## Context

Better Auth derives its **trusted origin** from `baseURL`, which by default comes
from the `BETTER_AUTH_URL` environment variable. Its origin-check middleware
(`node_modules/better-auth/dist/api/middlewares/origin-check.mjs`,
`validateOrigin`) refuses any request whose `Origin` header does not match one of
the trusted origins, with `403 INVALID_ORIGIN`. This is CSRF protection and it is
correct — we want it.

`.env` shipped `BETTER_AUTH_URL=http://localhost:3000`. Splitr is run on **two**
ports, both legitimately:

- **3000** — the OrbStack container publishes it ([ADR-0007](./0007-docker-for-local-development.md)).
- **3100** — native `next dev`, which is what every evidence file and dispatch
  uses, precisely *because* the container holds 3000.

So on 3100 every browser-originated auth call was refused, and the register form
reported "Check your email and password" — pointing at the one thing that was not
wrong. `curl` never caught it because `curl` sends no `Origin` header and the
check only bites when one is present. QA found it in a real browser (finding
F-1, `wiki/evidence/REQ-B-cluster-verification.md`).

The constraint, therefore: **both ports must work, and no human may have to
remember to keep a port in step.** Changing `3000` to `3100` only decides which
of the two is broken.

## Options considered

### Option A — change `BETTER_AUTH_URL` to `http://localhost:3100`
- Pros: one-character-class change; the port everything is documented on.
- Cons: breaks the Docker container instead. Exactly the same defect, rotated.
  Leaves a value in `.env` that is silently wrong the moment anyone runs
  elsewhere — and its failure mode is a misleading error message, not a crash.

### Option B — keep `BETTER_AUTH_URL`, add `trustedOrigins: ["http://localhost:3000", "http://localhost:3100"]`
- Pros: minimal, uses the documented option, both ports work today.
- Cons: two lists to keep in step — `baseURL` still names one port and is
  therefore still *wrong* on the other, which matters as soon as the library has
  to build an absolute URL (verification links, OAuth callbacks, `callbackURL`
  validation). A third port — a colleague's, a second container, a tunnel —
  needs a code edit. And the `.env` line that caused F-1 survives, so the defect
  can be re-introduced by copying `.env.example`.

### Option C — dynamic `baseURL` with `allowedHosts` (Better Auth 1.7.5 `DynamicBaseURLConfig`)
- Pros: one setting. The base URL is resolved per request from the `Host` header
  against an allowlist (`resolveDynamicBaseURL`), and `getTrustedOrigins` derives
  the trusted origins from the same `allowedHosts`. `["localhost:*",
  "127.0.0.1:*"]` covers 3000, 3100 and every port nobody has thought of yet,
  with nothing to keep in step. When `baseURL` is a dynamic config, Better Auth
  ignores `BETTER_AUTH_URL` entirely, so the variable cannot re-pin the origin.
- Cons: a newer, less-travelled code path. A host that is *not* on the allowlist
  throws — mitigated with `fallback`. The allowlist is the whole of the security
  boundary, so it must stay tight.

### Option D — `advanced.disableCSRFCheck` / `skipOriginCheck`
- Pros: the defect disappears immediately.
- Cons: deletes the protection instead of configuring it. `REQ-B.5` says treat
  auth as a black box — not "switch its defences off because they fired".

## Decision

We chose **Option C**, plus one guard.

Because: it is the only option where **no port is written down anywhere**. A is
the same bug rotated; B leaves two lists and a stale `baseURL`; D trades a bug
for a vulnerability. C also removes the variable that caused F-1 from local
development altogether, which is the difference between "fixed" and "cannot
recur".

`src/lib/auth.ts`:

```ts
baseURL: deployedBaseURL ?? {
	allowedHosts: ["localhost:*", "127.0.0.1:*"],
	protocol: "http",
	fallback: "http://localhost",
},
```

The guard: a **loopback** `BETTER_AUTH_URL` is ignored, with a warning naming
F-1. Setting one can no longer be right — the config above already covers every
loopback port — so the exact line that caused the defect can be pasted back into
`.env` without breaking anything. A non-loopback `BETTER_AUTH_URL` (a real
deployment, Cluster C/D via `wrangler secret put`) is still honoured verbatim,
and keeps the strict single-origin behaviour.

This stays inside the black box: it is configuration passed to
`betterAuth()`. No token, cookie, hash or session logic was added.

## Consequences

- **Makes easy:** running on any loopback port, in a container or natively, in
  `next dev` or a production build, with no configuration at all. Reviewers and
  QA can pick a free port without editing anything.
- **Makes hard/impossible:** serving Splitr on a **non-loopback** host (a LAN IP,
  an ngrok tunnel, a phone on the same wifi) without setting `BETTER_AUTH_URL` —
  auth calls from that origin are refused, by design. That is a deployment, and
  a deployment should name its origin. Also impossible: pinning the local base
  URL to one loopback port, which is the point.
- **Revisit when:** Cluster C/D moves this to Workers. `BETTER_AUTH_URL` becomes
  a secret/var with exactly one correct value, the non-loopback branch takes
  over, and `allowedHosts` stays as the local-development path only. If we ever
  need a tunnel for a demo, add its host to `allowedHosts` — deliberately, in
  code, with a review.

## Verification

Real Chrome driven over the DevTools Protocol (a browser always sends `Origin`;
`curl` does not, which is why `curl` could not have caught F-1), on **both**
ports and in **both** build modes — 16 assertions each, all passing:

| run | result |
|---|---|
| `next dev -p 3100` | 16/16 |
| `next dev -p 3000` | 16/16 |
| `next build && next start -p 3100` | 16/16 |
| `next build && next start -p 3000` | 16/16 |
| `next dev -p 3100` with `BETTER_AUTH_URL=http://localhost:3000` re-added | 16/16 + the warning |

Origin check still bites (it was narrowed, not removed):

```console
$ curl -X POST localhost:3100/api/auth/sign-out -H 'content-type: application/json' -d '{}' \
    -H "cookie: $COOKIE" -H "origin: https://evil.example"
{"message":"Invalid origin","code":"INVALID_ORIGIN"}   HTTP 403

$ ... -H "origin: http://sub.localhost:3100"
{"message":"Invalid origin","code":"INVALID_ORIGIN"}   HTTP 403

$ ... -H "origin: http://localhost:3100"
{"success":true}                                       HTTP 200
```

Full transcript: [`../evidence/REQ-B-cluster-verification.md`](../evidence/REQ-B-cluster-verification.md),
section "F-1 — fix verified".
