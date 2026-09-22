# Frontend — Next.js 16 on Workers (OpenNext)

The parallel build. Same D1, same DO worker, same domain model — a different
framework over the identical backend. Useful as a comparison exercise; confirm
against `../requirements/` whether *both* frontends are actually required.

## ⚠️ First, the warning the reference project ships

`nextjs-edgeledger-flare/CLAUDE.md` is one line: `@AGENTS.md`. And `AGENTS.md` says:

> **This is NOT the Next.js you know.** This version has breaking changes — APIs,
> conventions, and file structure may all differ from your training data. Read the
> relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed
> deprecation notices.

Take this literally. Next.js is pinned to exactly `16.2.6`, React to exactly
`19.2.4`. Read the installed docs before writing a line.

## Deployment

```jsonc
// wrangler.jsonc
"main": ".open-next/worker.js",
"assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
"compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"]
```

```jsonc
// package.json
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy":  "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

`@opennextjs/cloudflare` adapts the Next build output to the Workers runtime.
Config lives in `open-next.config.ts`.

`global_fetch_strictly_public` matters: without it, a `fetch()` to your own
hostname loops back into the same Worker instead of going out to the internet.

## Structural differences from the TanStack app

| Concern | Next.js 16 here | TanStack Start |
|---|---|---|
| Routing | App Router, route groups `(app)` / `(auth)` | File routes, pathless `_app` |
| Auth gate | `layout.tsx` — **not** edge `middleware.ts` | `loader` on `_app.tsx` |
| Mutations | Server Actions in `actions.ts` | `createServerFn` in `src/server/` |
| Cookies | `cookies()` — **async** in Next 16 | `getCookie`/`setCookie` — sync |
| Bindings | `getCloudflareContext()` | `getCfEnv()` wrapping `cloudflare:workers` |
| Dynamic segment | `[id]`, catch-all `[...key]` | `$id`, splat `$` |
| UI kit | shadcn + `@base-ui/react` + `sonner` | hand-rolled `components/ui/*` |

The move of auth gating out of `middleware.ts` and into layouts is the single
biggest departure from conventional Next.js advice. Do not reintroduce
`middleware.ts` for auth.

## What stays identical

`src/db/schema.ts`, `src/services/*.service.ts`, `src/lib/{authz,password,format}.ts`
are essentially the same files in both apps. Only `lib/session.ts` and the
binding accessor differ, because those touch framework request context.

That split is the lesson: **framework-agnostic business logic in `services/` and
`lib/`, framework-specific glue in `server/` or `actions.ts`.** If a file in
`services/` imports from `next/*` or `@tanstack/*`, the layering has broken.
