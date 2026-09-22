# Coding standards

## Layering

```
routes/     render and route. Nothing else.
server/     RPC boundary: session, input validation, redirect shaping.
services/   business logic: authorisation, queries, outbound calls. Framework-agnostic.
db/         Drizzle schema + client.
lib/        cross-cutting: session, password, authz, access, format.
```

Enforced by three rules:

1. A route component must not import from `db/`.
2. A file under `services/` must not import from `@tanstack/*` or `next/*`. If it
   needs request context, the caller passes it — which is why every service
   function takes `caller: SessionData` first.
3. A server function must not contain business logic. It validates, resolves the
   session, delegates, and shapes the response.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Service function | verb + noun | `listTransactionsForUser`, `computeBalanceCents` |
| Server function | verb + noun + `Fn` | `loginFn`, `getMyTransactionsFn` |
| Input validator | `validate` + name | `validateCreateInput` |
| Assertion | `assert` + condition | `assertAdmin`, `assertSelfOrAdmin` |
| Money | always suffixed `Cents` | `amountCents`, `balanceCents` |
| Timestamps | unix **seconds** unless suffixed `Ms` | `createdAt`, `durationMs` |
| DB columns | `snake_case` | `amount_cents` — Drizzle maps to camelCase |
| Types | exported `type` aliases; `interface` only for declaration merging | `SessionData`, `CreateInput` |

## Typing

- `strict: true`. No `any` crossing a module boundary.
- Cast only at a trust boundary, immediately followed by validation.
- Prefer discriminated unions over optional-field grab-bags.
- `satisfies` for handler and payload shapes; it checks without widening.
- Exhaustiveness-check every switch over a union:
  ```ts
  default: { const _exhaustive: never = event.type; … }
  ```
- Never annotate what is already inferred — especially TanStack Router types.
- Re-run `wrangler types` (`npm run cf-typegen`) after any binding change.

## Validation

Validate at **every** trust boundary, including internal ones. A service-binding
caller is still a caller.

```ts
const validateCreateInput = (raw: unknown): CreateInput => {
  const obj = raw as Partial<CreateInput>;
  if (!obj.type || !ALLOWED.includes(obj.type)) throw new Error("Invalid transaction type");
  const amountCents = Number(obj.amountCents);
  if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error("Amount must be a positive number");
  return { type: obj.type, amountCents, description: obj.description?.toString().trim() || undefined };
};
```

Normalise while validating: lowercase and trim emails, trim descriptions, coerce
empty string to `undefined`.

Zod is not required — a plain `(raw: unknown) => T` satisfies `inputValidator`.

## Errors

Three categories, handled differently:

| Category | Shape | Example |
|---|---|---|
| **Business outcome** | Typed error carrying data, mapped to a specific HTTP status | `InsufficientFundsError(balanceCents)` → 400 `{ error: "insufficient_funds", balanceCents }` |
| **Authorisation** | Named error class, logged with actor and target | `AuthorizationError` |
| **Fault** | Generic 500. Log internally, do not leak detail to the client | unreachable binding, malformed row |

Business outcomes must **never** be collapsed into a 500. If the user can act on
it, they need to know what it was.

Cross-worker errors travel as structured payloads, not messages:
```ts
// worker side
if (message.startsWith("INSUFFICIENT_FUNDS:")) {
  return Response.json({ error: "insufficient_funds", balanceCents }, { status: 400 });
}
// caller side
if ("balanceCents" in body && body.error === "insufficient_funds")
  throw new InsufficientFundsError(body.balanceCents);
```

## Degrading gracefully

Non-essential dependencies must never take down the essential path:

```ts
if (this.env.EVENTS) {                       // binding may not exist (free tier)
  try { await this.env.EVENTS.send(event); }
  catch (err) { console.log("queue send failed (non-fatal)", { error: String(err) }); }
}
```

Applies to: queue publishing, AI categorisation, Turnstile when unconfigured.
Does **not** apply to: authentication, authorisation, the balance check, the D1
write. Those fail loudly.

Type the binding optional (`EVENTS?: Queue`) so the compiler forces the guard.

## Money and time

- Money is integer cents, always. No floats, no decimals in the database.
  Formatting lives in `lib/format.ts` and nowhere else.
- Timestamps are `Math.floor(Date.now() / 1000)` — unix seconds. Variables holding
  milliseconds are suffixed `Ms`.
- Date arithmetic uses UTC methods (`setUTCDate`, `Date.UTC`). Workers run
  everywhere; local time is meaningless.

## Comments

The reference project comments *why*, not *what*, and it is worth matching:

```ts
// Rate limit BEFORE any DB work / password hashing — cheap reject path.
```

Header comments on workers and non-obvious modules should state the module's job
and its constraints. Skip comments that restate the code.
