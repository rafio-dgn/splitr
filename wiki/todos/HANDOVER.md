# Handover: start here in a new session

**Rewritten 2026-09-25**, after the Cluster E core (the GroupLedger Durable
Object). It replaces the incremental version from 2026-09-22/23, which had
gone stale in its body. Read this, then [`build-plan.md`](./build-plan.md)
and [`backlog.md`](./backlog.md). **Raffaele's own reading list is
[`STUDY-GUIDE.md`](./STUDY-GUIDE.md).** Keep both current (`CLAUDE.md` §3).

## Where we are

| | |
|---|---|
| Repo | [github.com/rafio-dgn/splitr](https://github.com/rafio-dgn/splitr), `main`, clean and pushed. Run `git log --oneline -5` for where it stands |
| Live app | **https://splitr.raffaele-digennaro.workers.dev** (Worker `splitr`) |
| Ledger | Worker **`splitr-ledger`**: the `GroupLedger` DO, **no public URL** (Cloudflare 1042), reached only by the service binding `LEDGER` |
| Production data | **Empty** (0 users). Raffaele's account was dropped by the first migration (his choice), and he hasn't re-registered yet |
| Cloudflare resources | D1 `splitr` (WEUR) · KV `splitr-hot` · R2 `splitr-receipts` (CORS from `r2-cors.json`) · Vectorize `splitr-search` (768 dimensions, cosine, a `groupId` metadata index) · Workers AI |
| Worker secrets | `BETTER_AUTH_SECRET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (names only; they're set on `splitr`) |
| Tests | `npm test`: 23 pure (`node --test`) plus 6 real-DO tests in workerd (`@cloudflare/vitest-plugin`) |

| Cluster | State |
|---|---|
| A | ✅ code. `REQ-A.5` is spoken, Raffaele's |
| B | ✅ code. `REQ-B.6` is spoken |
| C | ✅ code. `REQ-C.5` is spoken |
| D | ✅ code: D1, KV (recent descriptions), R2 (presigned receipts), "Read receipt" (Llama 4 Scout), the `raw_text` migration, semantic search. `REQ-D.6` is spoken |
| E | 🟡 **The contested write is done** (`REQ-E.1`/`E.2`/`E.3`/`E.5`): one winner in 5/5 production races. **Left:** E.7 (the RAG AI Worker), E.8/E.9 (the cron, run twice), and `REQ-E.7` (spoken) |
| F | Not started (Turnstile, rate limit, audit JSON, AI Gateway, secret rotation) |

## ▶ Start the new session here

**Updated 2026-09-25 (second session).** Raffaele said yes to the `CLAUDE.md`
§6 amendment (agents push **feature branches**; he merges; agents never push
to `main`). **CI rollout step 1 is built and verified locally**
([evidence](../evidence/CI-1-verification-scripts.md), ADR-0024 addendum):
`scripts/verify/{smoke,race,e2e,cleanup}.mjs`, `.nvmrc`, `puppeteer-core`
and a synthetic receipt fixture.

Since then (same day): Raffaele **ran smoke against production** himself:
16/16 checks pass, and cleanup leaves 0 rows (the output is in the evidence file), OK'd the sweep of old local test
data (done), and asked for **no UI issues**. The layout-shift bug the E2E
found is fixed in both forms, and the E2E guards it. All of it is on a
**feature branch with a PR to `main`**, which he asked for; he merges.

**Step 2 (`ci.yml`) is built** on branch `ci/ci-workflow` with a PR, and was
simulated on a clean runner-like copy (it found two build defects; see
ADR-0024's step-2 addendum). Check the PR's first real run.

**Next:** his settings (step 3) →
`deploy.yml` → `e2e-nightly.yml`, then **E.7** (below). He may prefer E.7
first, so ask.

### The CI/CD plan in one paragraph

GitHub Actions + wrangler (his choice). **`ci.yml`** runs on every PR: types
for both programs, lint, all 29 tests, a full build, and a **size budget**
(fail above 2,900 KiB gzipped, warn above 2,700; it's at 2,543 now).
**`deploy.yml`** runs on merge to `main`: the ledger → `d1 migrations apply
--remote` → the app → wait 20 s → smoke tests (auth with `Origin`, a forged
`Origin` refused, a 2-user settle race with one winner, an idempotent replay)
→ cleanup that runs even on failure. **`e2e-nightly.yml`**: a two-browser run
including Read receipt. **Production only** (his choice over staging; the
smoke tests make and delete `@example.test` data on the live site). **PRs with
required checks.**

### What Raffaele must do in account settings (agents can't, `CLAUDE.md` §6)

1. A Cloudflare API token: Workers Scripts Edit, D1 Edit, Workers KV Storage
   Edit, Workers R2 Storage Edit, Vectorize Edit, Account Settings Read. Scoped
   to this account; confirm the exact names in the dashboard.
2. GitHub repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
   (`3082c7652ac1003a678a5bc45ca0054f`, an identifier and not a secret, but
   it's kept beside the token), plus a GitHub environment `production`.
3. Branch protection on `main`: require the `ci` checks and a PR.
4. Make sure his Git credential has the **`workflow` scope**, or pushing
   `.github/workflows/*` is refused. The first push will show it.

## Next real work (after CI, or before it if he prefers)

**E.7, the RAG AI Worker.** This is an **AI decision, so put structured
questions to Raffaele before coding** (his standing rule, and in memory).
Already decided: ADR-0016 (RAG categorises line items; group first, then a
seed corpus; after the write via `waitUntil`; every model call moves behind
the AI Worker at E, and the app loses its `ai` binding) and ADR-0017 (the eval
picks 8B-fp8 against 70B, with and without RAG, and records neurons as well).
Still to ask: the eval set (about 30 labelled items), the seed corpus, the
shared-secret mechanism, and the timeout and fallback.

Then E.8/E.9 (the cron: reminders, the `uncategorised` backfill, and
re-embedding missed expenses), then Cluster F.

## Running it locally (a fresh clone or a fresh machine)

**Files that aren't in git and must exist:**
- `.env`: copy `.env.example` and set `BETTER_AUTH_SECRET` (any 32+ random
  characters locally).
- `.dev.vars`: `NEXTJS_ENV=development`, a **blank** `BETTER_AUTH_URL=`, and
  `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (the R2 token Raffaele created:
  Object Read & Write, `splitr-receipts` only). Without the blank
  `BETTER_AUTH_URL`, local preview answers every sign-in with 403.
- A logged-in Wrangler (`npx wrangler whoami`). The OAuth login is per
  machine.

**First time:**
```bash
npm install
npm run cf:types           # bindings -> TS (the app and the ledger); tsc fails without it
npx next typegen           # route types (RouteContext)
npm run db:migrate:local   # drizzle/0000 + 0001 into the local D1
```

**Every time (two processes: settle-up needs the ledger):**
```bash
npx wrangler dev -c workers/group-ledger/wrangler.jsonc --port 8791 --persist-to .wrangler/state
npm run dev -- -p 3100
```

**Local dev writes to REAL cloud resources in three places:** R2 and
Vectorize are `remote: true` (they have no useful local simulation), and
Workers AI is always remote. Test data therefore lands in the production
bucket and index. **Clean it up after testing** (see "How things were
verified").

**Deploying:** `npx wrangler deploy -c workers/group-ledger/wrangler.jsonc`
**first**, then `npm run deploy`. **Wait about 20 s after a deploy before
verifying it**: an immediate test can hit the previous version (it happened
once, ADR-0022's evidence).

## Decisions Raffaele owes (and nobody else can make)

- **Spoken answers:** `REQ-A.5`, `B.6`, `C.5`, `D.6`, and later `E.7` and
  `F.6`. The study guide lists where his material is.
- **Re-register on the live site.**
- **3–5 English receipts** in `.data/receipts/mine/`, to confirm the Scout
  choice on real paper.
- **F-2:** the `REQ-B.3` "0 fetch" evidence was taken on `next dev`, and a
  production build shows prefetches. Demo on `next dev`, or re-record on the
  deployed URL.
- **The EdgeLedger seal leak:** `wiki/techstack/` and `wiki/context/glossary.md`
  contain EdgeLedger-derived details. Move them or accept them.
- **The Worker size (83% of 3 MiB):** a third copy of Better Auth, bundled for
  the settlements Route Handler. The fix options are in the backlog; decide
  before Cluster F.
- **Tell the course owners** that `REQ-C.3`'s model is dead (error 5028)?

## How things were verified, and what to re-create

Every result is in [`../evidence/`](../evidence/), with the exact commands
and the pasted output. The ad-hoc scripts that were lost from the scratchpad are **back in the
repo** as `scripts/verify/` (2026-09-25): run any of them with the site as
the first argument, `localhost` or production. What else is re-runnable:

- `npm test`: the money invariants, plus the DO invariants against a real DO
  (the 30-way race, replay, the alarm).
- `scripts/vision-spike/`: the vision-model eval (a dev-only Worker plus
  `run.mjs`).
- The R2 attack script and the search eval runner are still not in the repo.

The patterns underneath (all now in `scripts/verify/lib.mjs`):

- **Two users without a browser:**
  `curl -c jar -X POST $URL/api/auth/sign-up/email -H 'Origin: $URL' -d '{…}'`
  (**always send `Origin`**; that's lesson one below).
- **The race:** two backgrounded curls to `POST /api/groups/:id/settlements`
  with each user's cookie jar, then `wait`.
- **Browser E2E:** Puppeteer was available in the npx cache left by
  `@mermaid-js/mermaid-cli`. Use two `browser.createBrowserContext()`, one per
  person.
- **Cleanup:**
  - production D1 rows by group id and `email LIKE '%@example.test'`;
  - KV `recent-descriptions:v1:<groupId>`;
  - R2 by listing `receipts/<groupId>/` over the S3 API (D1 doesn't know about
    orphaned photos);
  - Vectorize by `wrangler vectorize list-vectors`, then `delete-vectors`
    (pass the ids as **separate** arguments; zsh doesn't word-split).

## Lessons this project paid for (keep them)

1. **Verify in the medium the requirement names.** curl without `Origin` hid
   broken browser auth (F-1), which came back on the first deploy and was
   caught *because* the probe sent `Origin`.
2. **Brief QA to attack, not to confirm.**
3. **Test the control, not just the feature.** The "confirm the amount" gate
   had silently landed on the wrong element, and so had the brief's table: an
   edit replaced the first of two identical strings. Scripted edits now assert
   the text is unique. Money rules are also enforced on the server.
4. **A mutation check tells you whether a test guards anything.** The 2-way
   race test passed *without* the DO's lock; only 30-way fails 6/6 without it.
5. **Docs are claims too.** They were wrong about JSON mode, about the pinned
   Content-Type, and about the deprecated model. Real calls were the only
   reliable source.
6. **`skipLibCheck` can hide `any`.** Every binding was untyped for two
   clusters, found by the one-line probe `const x: number = env.DB`.

## Standing constraints

- **EdgeLedger is sealed** until `REQ-X.6`
  ([ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md)).
- **No GitHub changes.** Commit and push only when Raffaele asks (`CLAUDE.md` §6).
- **AI decisions are Raffaele's**, via structured questions first.
- **One capability per step**, clusters in order (`REQ-M.2`).
- **Secrets only via `wrangler secret put`.** Never in a file, a log, or this chat.
- **Docker is dev-only**
  ([ADR-0007](../decisions/0007-docker-for-local-development.md)). Note that
  the container runs only `next dev`, not the ledger, so settle-up there needs
  the ledger started separately.
