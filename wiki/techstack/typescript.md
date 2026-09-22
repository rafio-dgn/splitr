# TypeScript

## Baseline

- `strict: true`, `moduleResolution: "bundler"`.
- No `any` reaching module boundaries. Narrow at the edge, keep the interior typed.
- Path alias `@/*` → `src/*` (the TanStack app also declares `#/*` in
  `package.json` `imports`).

## Binding types are generated, not hand-written

```bash
wrangler types --env-interface CloudflareEnv worker-configuration.d.ts
```

This reads `wrangler.jsonc` and emits an interface covering D1, KV, R2, service
bindings, queues and DO namespaces. **Re-run it after every binding change** — the
generated file is the contract between config and code.

The npm script is `cf-typegen` in both frontends.

## Secrets are added by augmentation, not by editing the generated file

Secrets set via `wrangler secret put` are invisible to `wrangler types`, so they
are declared separately in `src/types/env.d.ts`:

```ts
declare global {
  interface CloudflareEnv {
    TANSTACK_LEDGER_SECRET: string;
    WORKFLOW_SECRET: string;
    // `unsafe.bindings` are not auto-generated either — type them by hand:
    LOGIN_LIMITER: { limit(opts: { key: string }): Promise<{ success: boolean }> };
    // Optional: present only when the feature is configured.
    TURNSTILE_SECRET?: string;
    CF_ACCESS_TEAM_DOMAIN?: string;
    CF_ACCESS_AUD?: string;
  }
}
export {};
```

Mark a binding optional (`?`) when the code must work without it. That forces the
call site to handle absence, which is how the reference project degrades
gracefully on the free tier (`if (this.env.EVENTS) { … }`) and during local dev
(`if (!env.TURNSTILE_SECRET) return;`).

## Reaching bindings from server code

In a Worker handler you get `env` as an argument. In framework server code you do
not, so use the virtual module:

```ts
import { env as workerEnv } from "cloudflare:workers";
export function getCfEnv(): CloudflareEnv {
  return workerEnv as unknown as CloudflareEnv;
}
```

Call it only from server-only code — loaders, `createServerFn` handlers, route
`server.handlers`. Calling it during client render is a build-time leak.

## Patterns worth copying

### Discriminated unions for identity
```ts
export type AccessIdentity =
  | { kind: "user";    email: string; sub: string }
  | { kind: "service"; commonName: string; sub?: string };
```
Branch on `kind`; the compiler narrows. Beats optional fields everywhere.

### Exhaustiveness checks on event handling
```ts
default: {
  const _exhaustive: never = event.type;   // compile error when a variant is added
  console.log("unknown event type", { type: _exhaustive });
}
```

### `satisfies` for handler and payload shapes
```ts
export default { async fetch(request, env) { … } } satisfies ExportedHandler<Env>;

JSON.stringify({ userId, role } satisfies SessionData)
```
Checks the shape without widening the inferred type.

### Typed errors carrying data
```ts
export class InsufficientFundsError extends Error {
  constructor(public readonly balanceCents: number) { super(`…`); this.name = "InsufficientFundsError"; }
}
```

### Enum-constrained columns
```ts
role: text("role", { enum: ["admin", "user"] }).notNull().default("user")
```
Drizzle propagates the literal union into the inferred row type, so
`session.role` is `"admin" | "user"` end to end — no casting at the auth check.

### Input validators as plain functions
`createServerFn().inputValidator(fn)` takes any `(raw: unknown) => T`. Zod is not
required; the reference project hand-writes them and throws on bad input:

```ts
const validateCreateInput = (raw: unknown): CreateInput => {
  const obj = raw as Partial<CreateInput>;
  if (!obj.type || !["deposit","withdraw","transfer"].includes(obj.type))
    throw new Error("Invalid transaction type");
  const amountCents = Number(obj.amountCents);
  if (!Number.isFinite(amountCents) || amountCents <= 0)
    throw new Error("Amount must be a positive number");
  return { type: obj.type, amountCents, description: obj.description?.toString().trim() || undefined };
};
```

Validate at **every** trust boundary: the RPC entry, and again in the worker that
receives the service-binding call. A caller being internal is not a reason to trust
its payload.

## Cross-worker type duplication

Backend workers do not import types from the frontends — each redeclares the
shapes it needs (`CreateInput`, `CreateResult`, `TransactionCreatedEvent`). That
is a deliberate trade: independent deployability over DRY. The cost is real —
these can silently drift. If you change a cross-worker payload, grep for every
copy. If that becomes painful, a shared types package is an ADR worth writing.
