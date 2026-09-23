# `REQ-C.2`: the throwaway hello-world Worker, through its lifecycle

**Date:** 2026-09-23 · **Worker:** `splitr-hello` · **URL:** https://splitr-hello.raffaele-digennaro.workers.dev
**Directory:** `workers/hello/` ([ADR-0006](../decisions/0006-repo-layout.md)) · **Status:** ✅ **all 6 criteria met.** Torn down on 2026-09-23 (build plan C.5)

---

## 1. Created with `npm create cloudflare@latest`, in its own directory

```bash
npm create cloudflare@latest -- workers/hello --type=hello-world --lang=ts \
  --no-deploy --no-git --no-open --no-agents
```

The first attempt left out `--no-agents` and stopped at an interactive "add an
AGENTS.md?" prompt, leaving a half-made scaffold. It was deleted and re-run
rather than patched by hand, because the criterion is *created by* this command.

Every generated file was reviewed (`REQ-M.3`). These were pruned:

| Removed | Why |
|---|---|
| `test/`, `vitest.config.mts`, `vitest`, `@cloudflare/vitest-plugin` | [ADR-0012](../decisions/0012-test-the-invariants-and-the-money-nothing-else.md) scopes tests to the contested write and the money arithmetic, and this Worker is neither |
| `.vscode/`, `.prettierrc`, `.editorconfig` | Editor config for a throwaway; the repo root has none |

The root `tsconfig.json` and ESLint config now exclude `workers/`. Without
that, the root `tsc` would load this Worker's full workerd runtime types, which
collide with the DOM lib ([ADR-0015](../decisions/0015-one-database-driver-d1-everywhere.md) §4).

## 2. `wrangler.jsonc` configured

- `name` is `splitr-hello`, so its purpose is obvious in the account's Worker list.
- `observability.enabled` is on, which `wrangler tail` needs.
- **A var:** `GREETING`, public configuration that belongs in review.
- **No secret in the file.** `HELLO_KEY` exists only through
  `wrangler secret put`. For `wrangler dev`, the local value is in a gitignored
  `.dev.vars`.

## 3. A secret set with `wrangler secret put`

The value was generated into a scratch file outside the repo and piped in. It
was never printed, logged or committed.

```bash
npx wrangler secret put HELLO_KEY < <scratch>/hello-key
# ✨ Success! Uploaded secret HELLO_KEY
npx wrangler secret list        # → "name": "HELLO_KEY"  (names only; values can't be read back)
```

The same route, before and after:

| | `GET /secret` |
|---|---|
| Deployed, **before** `secret put` | `{"error":"HELLO_KEY is not configured"}` **500** |
| **After**, with the right `x-hello-key` | `{"ok":true,"message":"The secret matched. Its value is not in this response."}` **200** |
| After, with a wrong key | `{"ok":false,"error":"wrong or missing x-hello-key"}` **401** |

The key is compared with `crypto.subtle.timingSafeEqual`, a Workers extension
to Web Crypto rather than a Node API. That's relevant to `REQ-C.5` Q2.

## 4. Hit with `curl`

```
GET /              -> {"greeting":"Hello from the edge"} HTTP 200
GET /secret right  -> {"ok":true,...} HTTP 200
GET /secret wrong  -> {"ok":false,"error":"wrong or missing x-hello-key"} HTTP 401
GET /nope          -> {"error":"not found"} HTTP 404
```

The same four requests passed first under local `wrangler dev` on :8788.

## 5. Watched with `wrangler tail`

Captured while the curls above ran:

```
Successfully created tail, expires at 2026-09-23T15:22:53Z
Connected to splitr-hello, waiting for logs...
GET https://splitr-hello.raffaele-digennaro.workers.dev/ - Ok @ 9/23/2026, 10:22:56 AM
  (log) {"worker":"splitr-hello","method":"GET","path":"/","status":200,"colo":"MAD"}
GET https://splitr-hello.raffaele-digennaro.workers.dev/secret - Ok @ 9/23/2026, 10:22:57 AM
  (log) {"worker":"splitr-hello","method":"GET","path":"/secret","status":200,"colo":"MAD"}
GET https://splitr-hello.raffaele-digennaro.workers.dev/secret - Ok @ 9/23/2026, 10:22:57 AM
  (log) {"worker":"splitr-hello","method":"GET","path":"/secret","status":401,"colo":"MAD"}
GET https://splitr-hello.raffaele-digennaro.workers.dev/nope - Ok @ 9/23/2026, 10:22:57 AM
  (log) {"worker":"splitr-hello","method":"GET","path":"/nope","status":404,"colo":"MAD"}
Stopping tail...
```

I searched the tail output for the secret's value: 0 matches.

## 6. Torn down cleanly

Done on 2026-09-23, after C.4 had used the same Worker for the first LLM call
([`REQ-C.3-first-edge-llm-call.md`](./REQ-C.3-first-edge-llm-call.md)).
"Cleanly" is shown by recording the state before and after, not just the delete
command.

**Before:** the URL answered 200, `wrangler secret list` showed `HELLO_KEY`, and
`wrangler deployments list` showed several versions.

**The teardown:**

```bash
cd workers/hello
npx wrangler delete --dry-run      # --dry-run: exiting now.
npx wrangler delete                # Successfully deleted splitr-hello
```

`--force` was deliberately not used. It overrides the check for *other Workers
that depend on this one*, and nothing depends on it, so needing `--force` would
itself have been a finding.

**After, checked on each surface where the Worker could linger:**

| Surface | Result |
|---|---|
| Public URL | `error code: 1042`, **HTTP 404** |
| `wrangler deployments list` | `This Worker does not exist on your account. [code: 10007]` |
| `wrangler secret list` | `Worker "splitr-hello" not found.` The secret was deleted with the Worker |
| Splitr itself | https://splitr.raffaele-digennaro.workers.dev still **200**, untouched |
| `workers/hello/` | Deleted, including its gitignored `.dev.vars`, `.wrangler/` state and `node_modules`, per [ADR-0006](../decisions/0006-repo-layout.md). The code stays in git history (commit `f18efcd`) |
| Local scratch | The file holding `HELLO_KEY`'s value and the ADR-0017 probe Worker were deleted |

The root `tsconfig.json` and ESLint config still exclude `workers/`, because
Cluster E's Durable Object and AI Workers will live there.

## Observations for Raffaele's `REQ-X.2` notes

These are raw observations, not his notes. The "what surprised you" notes have
to be in his own words.

- **`wrangler tail` says `Ok` for a 401 and a 404.** The outcome describes the
  *invocation* (did the Worker throw?), not the HTTP status. A filter on
  outcome would miss every rejected request, which is why the Worker logs the
  status itself. That's relevant to `REQ-F.4`'s `grep AUDIT`.
- **The request was served from `MAD` (Madrid)**, the nearest colo, with no
  region chosen anywhere. The D1 database, by contrast, is in `WEUR`: a Worker
  runs everywhere, but its data doesn't. That's relevant to `REQ-C.5` Q5.
- **A secret that was never `put` is simply absent**, even though the generated
  `Env` types it as `string`. The type says it exists and the runtime says
  otherwise.
- **The whole Worker is 0.73 KiB gzipped.** Splitr's is 2,123 KiB.
