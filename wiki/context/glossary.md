# Glossary

Terms used without explanation elsewhere in this wiki.

## Cloudflare

| Term | Meaning |
|---|---|
| **Worker** | A deployable unit of code on a V8 isolate. Not a Node process. |
| **Isolate** | V8 sandbox. Sub-millisecond start, no filesystem, no native modules. |
| **Binding** | A capability injected into `env` (a database, bucket, namespace, another Worker). Declared in `wrangler.jsonc`. |
| **Service binding** | A binding to another Worker. `env.X.fetch(...)` stays inside Cloudflare's network. |
| **Durable Object (DO)** | A single-instance stateful actor addressed by id. Guarantees only one instance per id exists, so calls to it serialise. |
| **DO stub** | The client handle (`env.NS.get(id)`). Public methods on the class are callable as RPC through it. |
| **Alarm** | A timer on a DO instance. Fires `alarm()`. One pending alarm per instance. |
| **`idFromName(name)`** | Deterministic DO id from a string — the same name always resolves to the same instance. |
| **D1** | Cloudflare's SQLite. No interactive multi-statement transactions from Workers. |
| **KV** | Eventually-consistent key-value store. Fast reads, not a source of truth. |
| **R2** | S3-compatible object storage, zero egress fees. |
| **Queues** | Managed message queue. Requires Workers Paid. |
| **DLQ** | Dead-letter queue — where messages land after `max_retries`. A separate queue you must create. |
| **Workflows** | Durable multi-step execution. Each `step.do()` is checkpointed. Requires Workers Paid. |
| **Cron Trigger** | Scheduled invocation of a Worker's `scheduled()` handler. |
| **`workers_dev: false`** | Suppresses the public `*.workers.dev` URL. |
| **`compatibility_date`** | Pins runtime behaviour to a date. Raising it can change semantics. |
| **`nodejs_compat`** | Flag providing some Node built-ins. Not a Node runtime. |
| **Turnstile** | Cloudflare's CAPTCHA. Client widget + server `siteverify`. |
| **Cloudflare Access** | Zero-trust gateway. Challenges users, then injects signed identity headers. |
| **JWKS** | The public key set used to verify Access JWTs, at `https://<team>/cdn-cgi/access/certs`. |
| **Service token** | Machine credentials for Access (`CF-Access-Client-Id`/`-Secret`). Yields a JWT with `common_name`, no `email`. |
| **AUD tag** | The audience identifier of an Access application. Must be checked during JWT verification. |
| **`CF-Connecting-IP`** | The only trustworthy client-IP header behind Cloudflare. |
| **Wrangler** | The CLI: deploy, secrets, resource creation, type generation. |

## Framework

| Term | Meaning |
|---|---|
| **OpenNext** | Adapter building Next.js output for the Workers runtime. |
| **TanStack Start** | Full-stack React framework over TanStack Router, Vite-based. |
| **Server function** | `createServerFn()` — typed RPC from client to edge. |
| **Loader** | Route-level data fetch that runs before render. Where auth gates live. |
| **`loaderDeps`** | Declares which search params the loader depends on, so it re-runs when they change. |
| **Pathless route** | A route file prefixed `_` — contributes layout and guards but no URL segment. |
| **Splat route** | `$` — matches the rest of the path, read as `params._splat`. |
| **Drizzle** | TypeScript ORM. Schema as code, types inferred from it. |

## Project

| Term | Meaning |
|---|---|
| **EdgeLedger** | The application: a bank-style transaction ledger. |
| **Idempotency key** | A caller-supplied uuid making a retried create safe. Cached 24h in DO storage. |
| **Audit log** | `console.log("[AUDIT] <event>", {...})` — structured, greppable, no paid add-on. |
| **Daily job** | The nightly cron: aggregate yesterday into `daily_summary`, then backfill null categories. |
| **Category backfill** | Filling `category IS NULL` rows by calling the AI worker, 100 at a time. |
| **Enumeration defence** | Returning 404 for both "does not exist" and "exists but not yours". |
| **ADR** | Architecture Decision Record. See [`../decisions/`](../decisions/). |
