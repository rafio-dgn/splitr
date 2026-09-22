---
name: verify-api
description: Check a framework or platform API against the installed package or official docs before writing it. Use before writing any Next.js, React, Wrangler, Drizzle or Cloudflare API from memory. Prevents confidently writing APIs that no longer exist.
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash(ls *), Bash(cat *), WebFetch
---

## The problem this prevents

This stack sits on versions that postdate reliable training data:

!`cd ${CLAUDE_PROJECT_DIR} && node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};for(const k of ['next','react','typescript','tailwindcss','wrangler','drizzle-orm'])if(d[k])console.log(k.padEnd(14),d[k])" 2>/dev/null`

Writing these from memory produces code that looks right, type-checks against
nothing, and fails at build or deploy.

## Next.js — the highest-risk one

`AGENTS.md` at the repo root says it outright: *"This is NOT the Next.js you
know."* Before writing any Next API:

1. Read the relevant guide in `node_modules/next/dist/docs/`.
2. If it concerns types, read the generated `.next/types/` — several globals
   (`LayoutProps`, `PageProps`) only exist after a build.

**Already-confirmed traps on this project:**

| Do not write | Because |
|---|---|
| `getServerSideProps`, `getStaticProps` | Pages Router. Does not exist in the App Router — an async Server Component awaits directly |
| `{ children }: { children: React.ReactNode }` in a layout | Next 16 generates `LayoutProps<"/">` |
| `pages/` routing | We are `app/` with `src/` |
| edge `middleware.ts` for auth gating | Gate in a layout instead |
| `cookies()` synchronously | It is async in Next 16 |

## Cloudflare and Wrangler

- Check current docs at `developers.cloudflare.com` — Wrangler 4 moved a lot.
- After **any** binding change, re-run `npm run cf-typegen`. The generated types
  are the contract between `wrangler.jsonc` and your code.
- Secrets and `unsafe.bindings` are **not** generated — hand-declare them in
  `src/types/env.d.ts`.
- Model ids are exact strings. Verify against the live catalogue; do not recall
  them. Confirmed for this project: `@cf/meta/llama-3.1-8b-instruct`,
  `@cf/baai/bge-base-en-v1.5`.

## How to check, in order of preference

1. The installed package — `node_modules/<pkg>/dist/docs/`, its `.d.ts`, its
   README. This is ground truth for the version we actually have.
2. Official docs for that exact version.
3. A web search — last, and never as the only source for a version claim.

## The rule

If you are about to write an API you have not verified **in this session**, and
it belongs to any package above, check it first. Being wrong here is silent: the
code reads plausibly and fails later, far from where you wrote it.
