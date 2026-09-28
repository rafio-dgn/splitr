# ADR-0027: Build production with webpack, not Turbopack, to fit the Worker size limit

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Raffaele (structured question, after a measured spike). The AI
  ran the spike and recommended.
- **Requirement:** none directly. It protects `REQ-C.1`/`REQ-X.4` (the app must
  keep deploying on the free plan's 3 MiB Worker limit). ADR-0024 said to decide
  this before Cluster F.

## Context

The app's Worker was **2,546 KiB gzipped: 83% of the 3,072 KiB free-plan
limit**. The CI budget fails at 2,900. The bisect in the E.1 evidence found the
cause: Turbopack bundles **a separate copy of Better Auth for each Route
Handler** (about 573 KiB each, three copies). The backlog listed two fixes,
and Raffaele asked for both to be measured before choosing.

## Options considered (measured on 2026-09-28, the same commit)

| Option | Size (gzipped) | Of the limit | Saved |
|---|---|---|---|
| Today: Turbopack (the Next 16 default) | 2,546 KiB | 83% | none |
| A. Merge the two curl-target Route Handlers into one `[resource]` route | 2,346 KiB | 76% | 200 KiB |
| **B. `next build --webpack`** | **1,679 KiB** | **55%** | **867 KiB** |

### Option A: merge the Route Handlers
- Pros: stays on Next's default bundler.
- Cons: a code change (one route file dispatching two resources) that saves a
  quarter as much, and the next Route Handler would grow the app again.

### Option B: build with webpack
- Pros: one line. Webpack shares chunks across entries, so Better Auth is
  bundled once. It also stays small as routes are added.
- Cons:
  - **Dev and production use different bundlers**: `next dev` stays on
    Turbopack, and the deployed artefact is built by webpack.
  - It departs from Next 16's default.

## Decision

We chose **B: `"build": "next build --webpack"`**. OpenNext's build calls
`npm run build`, so CI, `deploy.yml` and `npm run deploy` all ship the webpack
artefact.

Because: it saves more than four times as much for a one-line change, and it
removes the cause (duplicated shared chunks) rather than one symptom.

## Consequences

- **The divergence is covered where it matters.** Everything that tests the
  shipped artefact tests the webpack build:
  - the CI build and size budget;
  - the smoke test after every deploy;
  - the nightly E2E.

  For an exact local match, run `next dev --webpack`.
- The app goes from 83% to 55% of the limit, so Cluster F and later code have
  room.
- **Revisit if:** Next deprecates `--webpack`, or a Turbopack release shares
  chunks across Route Handlers. The latter can be checked by building with and
  without the flag and comparing `size-budget.mjs`.

## Verification

- **On production:** the merge's deploy (run 36411405752) built with webpack,
  and its post-deploy smoke test passed on the live site.

- The sizes above, from `node scripts/ci/size-budget.mjs` after
  `opennextjs-cloudflare build`. The webpack build prints
  `▲ Next.js 16.3.5 (webpack)`, and `wrangler deploy --dry-run` shows
  `gzip: 1679.14 KiB`.
- **The webpack build, served by `opennextjs-cloudflare preview` in the local
  Workers runtime**, with the local ledger and `splitr-ai`:
  - `smoke.mjs` passed;
  - `race.mjs` passed 3/3 rounds with one winner each;
  - `e2e.mjs` passed (two browsers, Read receipt, settle, search);
  - `categorise.mjs` passed (9/9, no save slowdown).
- **A mistake caught while measuring:** the first "webpack" preview was
  actually serving a leftover Turbopack build, because `preview` doesn't
  rebuild. `wrangler deploy --dry-run` (2,345 KiB) exposed it, and the checks
  were rerun on a confirmed webpack build. That first run did validate option
  A end to end, as it happens.
- **Noted:** Better Auth limits sign-ups to 3 per 10 s per IP in production
  builds. `race.mjs` straight after `smoke.mjs` got a 429; after a 15 s pause,
  it passed.
