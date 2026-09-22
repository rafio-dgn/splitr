# Security

The posture is **defence in depth**: every control assumes the one in front of it
has already failed.

## Non-negotiables

1. **Secrets never enter a file.** Not `wrangler.jsonc`, not `.env`, not a commit.
   `wrangler secret put` only.
2. **No secret in a log line.** Log an 8-character preview of a session id if you
   must correlate; never the id in full, never a token, never a hash.
3. **Every SQL parameter is bound.** No interpolation, anywhere, ever.
4. **Every secret comparison is constant-time.** Password verification and shared
   headers both.
5. **Authorisation lives in the service layer**, below the routes. A new route
   that forgets its guard must still be unable to leak data.
6. **404, never 403, for someone else's resource.** A 403 confirms existence.

## The layers

### 1. Network
`workers_dev: false` on every private worker — no public URL, reachable only via
service binding. Necessary, **not sufficient**: any Worker in the same account
could still call it. Hence layer 2.

### 2. Shared secret between workers
Every private worker checks a header before doing anything:

```ts
const provided = request.headers.get("x-ledger-secret");
if (!provided || !acceptedSecrets.some(s => s && timingSafeStringEqual(provided, s))) {
  return new Response("Unauthorized", { status: 401 });
}
```

Accept an **array** of valid secrets so rotation is possible without downtime:
add the new, roll the callers, remove the old.

### 3. Authentication
- **PBKDF2-SHA256, 100,000 iterations, 16-byte random salt, 32-byte output.**
  Web Crypto — bcrypt and argon2 need native bindings that do not exist in a
  Worker. Stored as `pbkdf2$<iterations>$<salt>$<hash>`; the iteration count is in
  the string so it can be raised later without invalidating old hashes.
- **Session ids are 32 random bytes**, base64url. Opaque, unguessable, carrying no
  information.
- **Cookie:** `httpOnly`, `secure`, `sameSite: "lax"`, `path: "/"`, `maxAge` matching
  the session.
- **Verification is constant-time.** A byte-by-byte early return leaks the hash.

### 4. Abuse controls on auth routes
- **Rate limiting first**, before Turnstile, before the DB lookup, before hashing.
  PBKDF2 at 100k iterations is expensive on purpose; letting an unauthenticated
  caller trigger it is the DoS. 5 attempts / 60s, keyed by `CF-Connecting-IP`.
- **Turnstile** on register and login, verified server-side via `siteverify`.
- Use `CF-Connecting-IP`. `X-Forwarded-For` is attacker-controlled.

### 5. Authorisation
```ts
assertAdmin(caller)                  // admin-only operations
assertSelfOrAdmin(caller, ownerId)   // per-resource ownership
```
Called in `services/`, not in routes. Both log the decision — allow and deny —
with actor, target and the reason it passed.

### 6. Zero trust on `/admin/*`
Three gates, in order:
1. Cloudflare Access challenges at the edge (One-Time PIN, policy on `@newpage.io`).
2. The Worker independently verifies `Cf-Access-Jwt-Assertion` against the team's
   JWKS, checking issuer and AUD. **Do not trust the header without verifying the
   signature** — if Access is misconfigured, forged headers walk in.
3. The app checks `session.role === "admin"`.

Service tokens authenticate the same application with `CF-Access-Client-Id`/
`-Secret` and produce a JWT with `common_name` instead of `email`. One verifier
handles both via a discriminated union.

### 7. Data access
- **Enumeration defence:** 404 for both "does not exist" and "exists but is not
  yours". The receipts endpoint is the model — it checks ownership via the
  transaction row, not via the R2 key.
- **Explicit projections** in every query (`select({ … })`). The password hash
  never enters a result type it does not need to be in.
- Never derive authorisation from a client-supplied identifier. The user id comes
  from the session, not the request body.

### 8. Idempotency
A caller-supplied uuid per submission, cached 24h in DO storage. Makes retries and
double-clicks safe. Cleanup runs on a DO alarm.

## Handling AI output

Model output is untrusted input:
- Constrain the prompt to a closed set.
- Match the response against that set; never store it raw.
- Default on no match, `null` on error.
- Never let it reach SQL, a template, or a filesystem path.
- Never put user PII in a prompt beyond what the feature needs.

## Review checklist

Before any change lands, confirm:

- [ ] No secret in a file, a log, or a commit
- [ ] Every new query uses bound parameters
- [ ] Every new endpoint or server function resolves a session and asserts authorisation
- [ ] Resource lookups return 404, not 403, for other users' data
- [ ] Any new secret comparison is constant-time
- [ ] Any new binding is declared optional if the code must run without it
- [ ] `wrangler types` re-run after binding changes
- [ ] The change is in `CHANGELOG.md` and `AI-AUDIT.md`
