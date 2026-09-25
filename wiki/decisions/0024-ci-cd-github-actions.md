# ADR-0024: CI/CD with GitHub Actions: PR checks, deploy on merge, smoke tests on production

- **Status:** Accepted (plan). Implementation is staged below, and parts of it are Raffaele's (GitHub and Cloudflare settings)
- **Date:** 2026-09-25
- **Deciders:** Raffaele, in structured questions on 2026-09-25. The AI proposed the options and the plan.
- **Requirement:** **none, and that's stated deliberately.** No course requirement asks for CI/CD.
  It's Raffaele's added scope, recorded here per `CLAUDE.md` ("do not invent requirements": this one was asked for).

## Context: what's not ideal today

- **Deploys run by hand from a laptop**, in an order someone has to remember
  (the ledger before the app).
- **D1 migrations are applied by hand**, separately from the code that needs
  them.
- **Checks are voluntary:** `tsc` for two programs, ESLint, 23 pure tests, 6
  real-DO tests, and none of them block anything.
- **Nothing guards the Worker size.** It's at 83% of the free 3 MiB, and the
  bisect showed a single new Route Handler can add about 190 KiB.
- **Verification scripts lived in a scratchpad and were lost overnight**
  (HANDOVER, 2026-09-25).

## Decisions (Raffaele's)

1. **GitHub Actions with `wrangler`** runs the deploys, because only one
   workflow can enforce Splitr's order. *Rejected:* Cloudflare Workers Builds
   (two unordered builds, no clean place for migrations or smoke tests), and a
   hybrid.
2. **Production only, with no staging.** CI deploys to production, and the
   smoke tests create `@example.test` data there and clean up after
   themselves. *Rejected:* a staging environment (twice the resources) and
   per-PR previews (Better Auth's origin check, and a shared D1). **The cost is
   accepted knowingly:** production stays the test bed, and a bad merge goes
   live, so the PR checks carry the weight.
3. **PRs with required checks.** Work happens on branches, a PR runs CI, and
   `main` accepts only green PRs. A merge to `main` is the deploy trigger.
4. **Smoke tests on every deploy, and the full E2E nightly (and on demand).**

## The plan

### Workflow 1: `ci.yml`, on every pull request (and on push to `main`)

It needs no Cloudflare credentials, so it's safe for any branch.

1. `actions/setup-node` with Node 24 (pinned by `.nvmrc`), then `npm ci`.
2. `npm run cf:types`, then `npx next typegen`.
3. **Typecheck both programs:** `tsc --noEmit` (the app) and
   `tsc --noEmit -p workers/group-ledger` (plus its `test/` config).
4. `npx eslint`.
5. **`npm test`:** 23 `node --test` tests, plus 6 workerd DO tests
   (miniflare, local; no account needed).
6. **Build:** `npx opennextjs-cloudflare build`.
7. **Size budget:** `wrangler deploy --dry-run` reports the gzipped size. It
   **fails above 2,900 KiB** (with the hard limit at 3,072) and **warns above
   2,700 KiB**. The measured value is written to the job summary, so the
   trend is visible PR by PR.

### Workflow 2: `deploy.yml`, on push to `main` (a merged PR) and by manual dispatch

It needs `needs: ci`, the `production` GitHub environment, and a
concurrency group, so two deploys never overlap.

1. The same checks as `ci.yml`, as a reusable job.
2. `wrangler deploy -c workers/group-ledger/wrangler.jsonc` (the ledger
   **first**, because the app's service binding targets it).
3. `wrangler d1 migrations apply splitr --remote` (**before** the app, so the
   code never meets a schema older than itself; migrations must stay
   backward-compatible with the version still live).
4. `npm run deploy` (the app).
5. **Wait about 20 s**, because an immediate check can hit the previous
   version (measured in ADR-0022's evidence).
6. **Smoke tests** (`scripts/verify/smoke.mjs`, no browser, about 30 s):
   - landing 200; the gate gives 307 → `/login`;
   - sign-up with `Origin` gives 200, and a forged `Origin` gives 403;
   - with a test group created by a direct D1 insert, an expense via the
     Route Handler, then **a 2-user concurrent settle: one 201 and one 409,
     with the loser naming the winner**;
   - an idempotent replay that's byte-identical;
   - then **cleanup** (D1 rows, KV key, R2 prefix, vectors), which runs even
     if an assertion failed.
7. On a smoke failure, the job fails loudly. Rollback is manual
   (`wrangler rollback`) with the previous version id in the job log.
   Automatic rollback is deliberately *not* done yet: it's a later
   decision.

### Workflow 3: `e2e-nightly.yml`, scheduled daily and by manual dispatch

`scripts/verify/e2e.mjs` is a two-browser Puppeteer run against production:
sign-up, create a group, invite, join, add an expense, **read a receipt**
(about 70 neurons), the confirm gate, settle, the refused duplicate, and
search. Then the same cleanup. It's nightly rather than per deploy because
it's slower, it spends Workers AI neurons, and browser tests are the
flakiest part of a pipeline.

### The scripts, re-created in the repo (`scripts/verify/`)

`smoke.mjs`, `e2e.mjs`, `race.mjs` (the demo's live "after") and
`cleanup.mjs`. They take `BASE_URL` as an argument, so the same scripts run
from CI, from a laptop, and on stage. They replace the lost scratchpad
scripts.

## Split of responsibilities

**Raffaele (GitHub and Cloudflare account settings; `CLAUDE.md` §6 keeps
agents out of them):**

1. **A Cloudflare API token** for CI, as narrow as possible:
   - Account: **Workers Scripts: Edit** (deploy both Workers);
   - **D1: Edit** (migrations, and smoke setup and cleanup);
   - **Workers KV Storage: Edit**, **Workers R2 Storage: Edit** and
     **Vectorize: Edit** (smoke cleanup);
   - **Account Settings: Read**.

   Scope it to this account only. The exact permission names are to be
   confirmed in the dashboard when creating it.
2. **GitHub repository secrets:** `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID`. Plus a GitHub **environment** called `production`
   (optionally with a required reviewer, for a manual approval gate).
3. **Branch protection on `main`:** require the `ci` checks to pass and
   require a PR. No direct pushes.
4. **The Git credential's `workflow` scope:** pushing files under
   `.github/workflows/` is refused without it. The first push will show
   whether the keychain token has it.
5. **An amendment to `CLAUDE.md` §6.** Today it allows agents to push only to
   `origin/main`. The PR flow needs *"push feature branches to `origin`;
   Raffaele opens and merges PRs; agents never push to `main`"*. This is his
   rule to change.

**The AI (repository files only):** the three workflows, `.nvmrc`, the size
check, `scripts/verify/*`, and the documentation updates.

## Consequences

- **Deploys become reproducible and ordered,** and migrations ship with the
  code.
- **The size limit becomes a gate,** not a surprise.
- **Production remains the test bed** (decision 2). Test data is created and
  destroyed on every merge, and a bad merge reaches users, protected only by
  the PR checks. Revisit with staging if Splitr ever has real users.
- **Worker runtime secrets stay in Cloudflare** (`wrangler secret put`). CI
  holds only the deploy token, never `BETTER_AUTH_SECRET` or the R2 keys. The
  smoke tests' R2 cleanup uses `wrangler`, not the S3 keys.
- **This changes how we work:** the AI commits to branches, and Raffaele
  merges.

## Rollout, in order

1. Commit the `scripts/verify/*` files and `.nvmrc` (no GitHub setting
   needed), and run them by hand against production.
2. Add `ci.yml`. It needs no secrets, so it's safe to merge first; watch it go
   green on a PR.
3. Raffaele creates the token, the secrets, the `production` environment and
   branch protection, and amends `CLAUDE.md` §6.
4. Add `deploy.yml`. The first merge deploys through CI; verify the ordering
   and smoke logs.
5. Add `e2e-nightly.yml`.
