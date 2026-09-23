# `REQ-C.1`: the Cluster B app, deployed to Cloudflare Workers

**Date:** 2026-09-23 · **Build:** `opennextjs-cloudflare build` (Next.js 16.3.5, `@opennextjs/cloudflare` 1.20.6, Wrangler 4.136.3)
**URL:** https://splitr.raffaele-digennaro.workers.dev · **Version:** `30839a6a-24af-4e43-9bd5-1a0405c7b883`
**Decides:** both acceptance criteria of `REQ-C.1`

---

## What is being proved

1. **It's reachable at a public URL.**
2. **It's the same app from Cluster B, not a rebuild.** OpenNext wraps the real
   `next build` ([ADR-0014](../decisions/0014-opennext-as-the-deploy-adapter.md)),
   and the build prints the same 15-route table as Cluster B. Only the database
   driver changed, and it changed in the one file built to contain it
   ([ADR-0015](../decisions/0015-one-database-driver-d1-everywhere.md)).
3. **Authentication works the way a browser uses it.** Each auth call below
   sends an `Origin` header. `REQ-B.5` was once marked Done on curl evidence
   while browser sign-in was broken, because curl sends no `Origin` and Better
   Auth's check never fired (F-1). These checks don't repeat that mistake.

## Commands

```bash
export U=https://splitr.raffaele-digennaro.workers.dev
curl -s -o /dev/null -w '%{http_code}\n' $U/                      # landing
curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' $U/groups   # gate, no session
curl -s -X POST $U/api/auth/sign-up/email -H 'Content-Type: application/json' \
  -H "Origin: $U" -c jar.txt \
  -d '{"name":"Deploy Tester","email":"deploy-test-2@example.com","password":"correct-horse-battery"}'
curl -s -o /dev/null -w '%{http_code}\n' -b jar.txt $U/groups      # gate, with session
curl -s -X POST $U/api/auth/sign-in/email -H 'Content-Type: application/json' \
  -H 'Origin: https://evil.example' \
  -d '{"email":"deploy-test-2@example.com","password":"correct-horse-battery"}'
```

## Results

| Check | Result |
|---|---|
| `GET /` | **200** |
| `GET /groups`, no session | **307** → `/login` |
| Sign-up, `Origin` = deployed origin | **200**, user and session returned. The user was written to remote D1 |
| `GET /groups`, with the session cookie | **200** |
| Sign-in, forged `Origin: https://evil.example` | **403** `{"code":"INVALID_ORIGIN"}` |

Test users were deleted from remote D1 afterwards (`DELETE FROM user WHERE email=…`,
which cascades to their sessions).

## The failure captured on the way

The first deploy had no `BETTER_AUTH_URL`. The same sign-up, with the deployed
`Origin`, returned:

```
{"message":"Invalid origin","code":"INVALID_ORIGIN"}  HTTP 403
```

`src/lib/auth.ts` only trusts loopback origins unless it's given a deployed
origin, so this is F-1 again on a new host. It was predicted before the probe
and confirmed by it. A curl without `Origin` would have returned 200 and hidden
it. It was fixed by adding `BETTER_AUTH_URL` to `wrangler.jsonc` `vars`.

The very first probe returned `error code: 1042` (HTTP 404). That's Cloudflare
reporting that a brand-new `workers.dev` route hadn't propagated yet, not an app
fault. It cleared in about 20 seconds.

## Also verified locally

| Mode | Result |
|---|---|
| `npm run preview` (local workerd, :8787) | sign-up 200 and gated route 200 with a cookie, rows in local D1. Needs `.dev.vars` with `BETTER_AUTH_URL=` blank, otherwise 403 (measured) |
| `next dev` (:3100) | sign-up 200, row in local D1 |
| Docker container (:3000) | signs in the user created on :3100, so both modes share one local D1 |

## Size

10,698 KiB raw and **2,123 KiB gzipped**, against the free plan's 3 MiB
compressed Worker limit. That's about 69% used before Cluster D.
