> 🔒 **QUARANTINED / OUT OF SCOPE.** TanStack Start does not appear anywhere in
> the course — it is an EdgeLedger extra. The course mandates Next.js App Router
> (`REQ-A.1`). Kept for the `REQ-X.6` comparison only.

# Frontend — TanStack Start

The primary frontend in the reference project. Vite-based, deployed straight to
Workers via `@cloudflare/vite-plugin`.

```jsonc
// wrangler.jsonc
"main": "@tanstack/react-start/server-entry"
```

```jsonc
// package.json
"dev":    "vite dev --port 3000",
"deploy": "vite build && wrangler deploy"
```

## File routing

`src/routes/`, generated into `src/routeTree.gen.ts` by `@tanstack/router-plugin`.
**Never hand-edit `routeTree.gen.ts`.**

Layout from the reference project:

```
routes/
  __root.tsx                    document shell
  index.tsx  login.tsx  register.tsx     public
  _app.tsx                      auth gate (pathless layout)
  _app/
    dashboard.tsx
    transactions.tsx            Outlet parent
    transactions/index.tsx      list
    transactions/new.tsx        create form
    admin.tsx                   admin gate (nested)
    admin/users.tsx             Outlet parent
    admin/users/index.tsx  admin/users/$id.tsx
    admin/daily-summary.tsx
  api/transactions/create.ts    server route
  api/receipts/$.ts             splat server route
```

Two conventions to internalise:

- **`_app` is pathless.** It contributes a layout and a guard but no URL segment —
  `/_app/dashboard` is served at `/dashboard`.
- **A parent with children needs its own file rendering `<Outlet />`,** plus an
  `index.tsx` for the parent's own page. `transactions.tsx` + `transactions/index.tsx`
  is what allows `transactions/new.tsx` to exist.

## Auth gating — one chokepoint

The guard is a `loader` on the layout route, so every child inherits it:

```tsx
const requireSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  if (!session) throw redirect({ to: "/login" });
  return session;
});

export const Route = createFileRoute("/_app")({
  loader: async () => await requireSession(),
  component: AppLayout,
});
```

`Route.useLoaderData()` then gives typed session data to the layout. The admin
gate nests the same way in `_app/admin.tsx` and adds two checks in order:
Cloudflare Access JWT verification, then app role.

`throw redirect()` **does** work inside a route loader. It does **not** propagate
cleanly out of an RPC call — see below.

## Server functions

```ts
export const loginFn = createServerFn({ method: "POST" })
  .inputValidator(validateAuthInput)
  .handler(async ({ data }): Promise<{ redirectTo: string }> => { … });
```

- Live in `src/server/*.ts` — the RPC layer.
- They call into `src/services/*.ts` — the business-logic layer.
- Route components call server functions; they never touch the database.

### The redirect rule

> Server functions return `{ redirectTo }` and the **client** navigates. They do
> not `throw redirect()`.

From `server/auth.ts`: *"We avoid `throw redirect()` from RPC functions because it
doesn't cleanly propagate across the network boundary back into the router."*

```tsx
const result = await logoutFn();
navigate({ to: result.redirectTo });
```

Note the asymmetry: `server/transactions.ts` *does* `throw redirect({ to: "/login" })`
for the unauthenticated case, because those functions are invoked from loaders
where the throw is caught by the router. Know which context you are in.

## Request context helpers

From `@tanstack/react-start/server` — **synchronous**, unlike Next 16's async
`cookies()`:

```ts
import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";

setCookie(COOKIE_NAME, sessionId, {
  httpOnly: true, secure: true, sameSite: "lax", maxAge: SESSION_DURATION_SECONDS, path: "/",
});

const ip = getRequest().headers.get("cf-connecting-ip");
```

## Server routes (API endpoints)

```ts
export const Route = createFileRoute("/api/receipts/$")({
  server: { handlers: { GET: async ({ params }) => {
    const key = params._splat ?? "";
    …
    return new Response(object.body, { headers });
  }}},
});
```

Splat segment is `$`, read as `params._splat`. Return a plain `Response`.

## Paginated lists

Search params are validated on the route and fed into `loaderDeps` so the loader
re-runs when the page changes:

```tsx
validateSearch: (search) => ({ page: Number(search.page) || 1 }),
loaderDeps: ({ search }) => ({ page: search.page }),
loader: ({ deps }) => getMyTransactionsFn({ data: { page: deps.page } }),
```

## Styling

Tailwind 4 via `@tailwindcss/vite`. `src/components/ui/*` are hand-rolled
(button, card, input, label, table) — deliberately **not** shadcn, to avoid the
dependency. The Next.js app does pull in shadcn/`@base-ui`; do not assume parity.

## Rate limiting binding

Declared under `unsafe.bindings` — not covered by `wrangler types`, so it is
hand-typed in `env.d.ts`:

```jsonc
"unsafe": { "bindings": [{
  "name": "LOGIN_LIMITER", "type": "ratelimit",
  "namespace_id": "1001", "simple": { "limit": 5, "period": 60 }
}]}
```
