# Versions

Read from `package.json` and `wrangler.jsonc` in `typescript-cloudflare-project/`
on 2026-09-22.

## TanStack app (`tanstack-edgeledger-flare`)

| Package | Version |
|---|---|
| `@tanstack/react-start` | `latest` (unpinned) |
| `@tanstack/react-router` | `latest` (unpinned) |
| `@tanstack/router-plugin` | `^1.132.0` |
| `react` / `react-dom` | `^19.2.0` |
| `vite` | `^8.0.0` |
| `typescript` | `^6.0.2` |
| `wrangler` | `^4.90.1` |
| `@cloudflare/vite-plugin` | `^1.36.4` |
| `tailwindcss` | `^4.1.18` |
| `vitest` | `^4.1.5` |
| `jose` | `^6.2.3` |
| `nitro` | `nitro-nightly@latest` |

## Next.js app (`nextjs-edgeledger-flare`)

| Package | Version |
|---|---|
| `next` | `16.2.6` (exact) |
| `react` / `react-dom` | `19.2.4` (exact) |
| `@opennextjs/cloudflare` | `^1.19.9` |
| `drizzle-orm` | `^0.45.2` |
| `drizzle-kit` | `^0.31.10` |
| `typescript` | `^5` |
| `wrangler` | `^4.90.1` |
| `tailwindcss` | `^4` |
| `@base-ui/react`, `shadcn` | `^1.4.1`, `^4.7.0` |

## Worker compatibility dates

| Worker | `compatibility_date` |
|---|---|
| `nextjs-edgeledger-flare` | `2026-05-12` |
| `edgeledger-transaction-do` | `2026-05-12` |
| `tanstack-edgeledger-flare` | `2026-05-13` |
| `edgeledger-ai` | `2026-05-14` |
| `edgeledger-consumer` | `2026-05-14` |
| `edgeledger-workflow` | `2026-05-14` |

All use `compatibility_flags: ["nodejs_compat"]`. The Next.js worker additionally
sets `global_fetch_strictly_public` — without it, `fetch()` from inside the Worker
can loop back to the same Worker instead of hitting the public internet.

## ⚠️ The drift hazard — read this before writing code

This stack sits on versions that postdate most model training data:

- **Next.js 16** — the reference project's own `AGENTS.md` says it outright:
  *"This is NOT the Next.js you know. This version has breaking changes — APIs,
  conventions, and file structure may all differ from your training data. Read the
  relevant guide in `node_modules/next/dist/docs/` before writing any code."*
  Note specifically: edge `middleware.ts` is **not** used for auth gating here —
  gating moved into layouts.
- **TypeScript 6** in the TanStack app, **TypeScript 5** in the Next.js app. They
  are not the same; do not copy a tsconfig between them.
- **Vite 8** — the TanStack devtools plugin documents support for Vite `^6 || ^7`
  only. Verify before adding it.
- **React 19** — server components, `use()`, and form actions differ from React 18.
- **TanStack Start** — `@tanstack/react-start` and `@tanstack/react-router` are
  pinned to `latest`, i.e. genuinely unpinned. What installs today may not match
  what installed when the reference project was built.

**Rule:** before writing against any API in this table from memory, verify it —
read `node_modules/<pkg>/dist/docs/`, the installed `.d.ts`, or current official
docs. Guessing here produces code that type-checks against nothing and fails at
deploy time.

## Unpinned dependency risk

`@tanstack/*` packages resolve to `latest`. Two installs a week apart can produce
different APIs. Before starting the build, decide whether to pin them — if so,
that is an ADR.
