# Security services

Cloudflare's security products as used here. The *why* behind the layering is in
[`../guidelines/security.md`](../guidelines/security.md); this page is the
mechanics.

## Turnstile — CAPTCHA on register/login

Widget component (`components/TurnstileWidget.tsx`) renders with the site key and
yields a token; the server verifies it:

```ts
async function verifyTurnstile(token: string | undefined): Promise<void> {
  const env = getCfEnv();
  if (!env.TURNSTILE_SECRET) return;             // feature-flagged off by absent secret
  if (!token) throw new Error("CAPTCHA challenge required");

  const form = new URLSearchParams({
    secret: env.TURNSTILE_SECRET, response: token, remoteip: getClientIp(),
  });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form });
  const result = await res.json() as { success: boolean; "error-codes"?: string[] };
  if (!result.success) throw new Error("CAPTCHA verification failed");
}
```

Secrets: `TURNSTILE_SECRET`, `TURNSTILE_SITEKEY`. Both optional — absent secret
means the check is skipped, so local dev works without configuring Turnstile.
**Verify this is genuinely intended before shipping;** a missing secret in
production silently disables the protection.

## Rate Limiting — login brute-force

```jsonc
"unsafe": { "bindings": [{
  "name": "LOGIN_LIMITER", "type": "ratelimit",
  "namespace_id": "1001", "simple": { "limit": 5, "period": 60 }
}]}
```

```ts
const limit = await env.LOGIN_LIMITER.limit({ key: `login:${ip}` });
if (!limit.success) throw new Error("Too many login attempts. Try again in a minute.");
```

Called **first** in `loginFn` — before Turnstile, before the DB lookup, before
password hashing. PBKDF2 at 100k iterations is expensive by design; letting an
attacker trigger it is the DoS. Reject cheaply.

Client IP comes from `CF-Connecting-IP` — the only client-IP header trustworthy
behind Cloudflare. `X-Forwarded-For` is attacker-controlled; do not use it.

`unsafe.bindings` are not covered by `wrangler types`; hand-declare in `env.d.ts`.

## Cloudflare Access — SSO on `/admin/*`

Configured in the dashboard (Zero Trust → Access → Applications), not in
`wrangler.jsonc`. The reference setup uses One-Time PIN with a policy restricting
to `@newpage.io` addresses, plus a second policy for service tokens.

Access injects headers on requests that passed the challenge:
- `Cf-Access-Authenticated-User-Email`
- `Cf-Access-Jwt-Assertion` — a signed JWT

## Verifying the Access JWT in the Worker (`jose`)

**Trusting the headers is the mistake.** If Access is ever misconfigured or
bypassed, forged headers walk straight in. Verify the signature:

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
const { payload } = await jwtVerify(token, jwks, {
  issuer:   `https://${teamDomain}`,
  audience: env.CF_ACCESS_AUD,
});
```

Cache the JWKS in module scope keyed by team domain — re-creating it per request
re-fetches the key set.

Two identity shapes come back, distinguished by which claims are present:

```ts
type AccessIdentity =
  | { kind: "user";    email: string; sub: string }        // human: email + sub
  | { kind: "service"; commonName: string; sub?: string }; // service token: common_name, no email
```

Check `common_name` first — service tokens have no `sub` or `email`.

Secrets: `CF_ACCESS_TEAM_DOMAIN` (e.g. `yourteam.cloudflareaccess.com`),
`CF_ACCESS_AUD` (the AUD tag from the Access application).

## Service tokens — machine-to-machine

A second policy on the same Access application. Callers send:
```
CF-Access-Client-Id: <id>
CF-Access-Client-Secret: <secret>
```
Access exchanges them for a JWT with `common_name`. The same verifier handles both
shapes — that is the point of the discriminated union above.

## Shared secrets between workers

Private workers additionally require a shared-secret header, compared in constant
time:

```ts
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
```

| Header | Secret | Guards |
|---|---|---|
| `x-ledger-secret` | `TANSTACK_LEDGER_SECRET` / `LEDGER_SHARED_SECRET` | `edgeledger-transaction-do` |
| `x-ai-secret` | `AI_SERVICE_SECRET` | `edgeledger-ai` |
| `x-workflow-secret` | `WORKFLOW_SECRET` | `edgeledger-workflow` |

The DO worker accepts an **array** of valid secrets, which is what makes secret
rotation possible without downtime: add the new one, roll callers, remove the old.

## Secret inventory

All set with `wrangler secret put`, per worker. Never in `wrangler.jsonc`, never
in `.env`, never committed.

| Secret | Set on |
|---|---|
| `TANSTACK_LEDGER_SECRET` | tanstack, nextjs, transaction-do |
| `AI_SERVICE_SECRET` | transaction-do, ai |
| `WORKFLOW_SECRET` | tanstack, workflow |
| `TURNSTILE_SECRET`, `TURNSTILE_SITEKEY` | frontends (optional) |
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` | frontends (optional) |

Pipe from a file to avoid a trailing newline getting into the secret:
```bash
tr -d '\n' < ~/.edgeledger-internal-secret.txt | wrangler secret put TANSTACK_LEDGER_SECRET
```
A stray `\n` makes the length comparison fail and every call 401 — with no useful
error. This has cost people hours.
