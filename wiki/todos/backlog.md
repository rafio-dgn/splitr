# Backlog

## Standing constraints

- [!] **The AI performs no GitHub operations.** No repo creation, no `gh`, no
      remotes, pushes, PRs or issues — not even read-only API calls. Raffaele
      owns the account and creates the repository himself. Local `git` in the
      working tree is fine. (`CLAUDE.md` §6)
- [!] **EdgeLedger is sealed until `REQ-X.6`.** Do not read
      `typescript-cloudflare-project/` or `../reference-edgeledger/`.
      ([ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md))

## Blockers

- [x] ~~`blocker` **`wrangler login` — Raffaele must run it.**~~ Done by 2026-09-23;
      `wrangler whoami` reports the account. Kept for the record: Interactive (opens a
      browser); an agent cannot. `wrangler whoami` currently reports not
      authenticated. **Needed from Cluster C onward** — Clusters A and B are
      local-only, so this does not block starting.

- [x] ~~`REQ-0.3` — GitHub repo~~ → [rafio-dgn/splitr](https://github.com/rafio-dgn/splitr),
      cloned, wiki moved in, README written
- [x] ~~`REQ-0.1` — toolchain~~ → Node v24.21.0 (nvm), npm 11.19.0,
      Wrangler 4.136.2. See [`../guidelines/workflow.md`](../guidelines/workflow.md)
      for the PATH quirk
- [x] ~~`REQ-P.1` — project idea~~ → **Splitr**.
      [ADR-0004](../decisions/0004-project-is-splitr.md),
      [`../context/project-brief.md`](../context/project-brief.md)

## For Raffaele — Cluster A

- [ ] Answer `REQ-A.5`'s three questions unaided —
      [notes](./cluster-a-questions.md)
- [ ] Review the Cluster A code (`REQ-M.3`/`REQ-A.4`): `src/lib/fetch.ts`,
      `src/app/page.tsx`, `src/app/layout.tsx`. Four questions per file in
      [`../guidelines/ai-collaboration.md`](../guidelines/ai-collaboration.md)
- [ ] Start the `REQ-X.2` notes — *what surprised you* — while Cluster A is fresh

## Open questions — need a human answer

- [x] ~~Are the `[OPTIONAL]` items in scope?~~ → **Cluster F in, Queues out.**
      [ADR-0005](../decisions/0005-optional-scope.md). Free tier throughout.
- [ ] `question` `REQ-C.1` — Next.js deploy adapter: `@opennextjs/cloudflare` or
      Cloudflare Pages? §12 names Pages; nothing mandates either. Needs an ADR.
- [x] `question` `REQ-B.5` — which auth library? **Settled: Better Auth 1.7.5**,
      see [ADR-0009](../decisions/0009-better-auth-on-local-sqlite-via-drizzle.md).
      (The old candidate list here — Auth.js / Lucia / Clerk — was the course's;
      Lucia has since been deprecated outright and Better Auth was not on it.)
- [ ] `question` Which Cloudflare account to `wrangler login` with? Free tier is
      sufficient — Queues is dropped, so no Paid plan is needed at all.
- [ ] `question` Vision model for receipt OCR — `@cf/meta/llama-3.2-11b-vision-instruct`,
      `@cf/llava-hf/llava-1.5-7b-hf`, or Moondream 3? Decide at build-plan step
      D.6 after testing OCR quality on real receipts.
- [ ] `question` Any deadline for the demo (`REQ-X.8`)?

## Queued

- [x] ~~Write `context/project-brief.md`~~ → done
- [x] ~~Map the idea onto the eight building blocks~~ → done, 8/8 (`REQ-P.2`)
- [x] ~~Produce the cluster-by-cluster build plan~~ → [`build-plan.md`](./build-plan.md)
- [x] ~~Put the brief at the top of the repo README (`REQ-0.5`)~~ → done
- [ ] Fill the `techstack/` gaps from official docs, as each cluster needs them:
      Vectorize, R2 presigned URLs, RAG, AI Gateway, zod
- [x] ~~Decide the test strategy and record it as an ADR~~ →
      [ADR-0012](../decisions/0012-test-the-invariants-and-the-money-nothing-else.md);
      [`../guidelines/testing.md`](../guidelines/testing.md) rewritten to match.
      Nothing installed: the money tests run on `node --test`, and
      `@cloudflare/vitest-pool-workers` arrives with the Durable Object at `REQ-E.1`.
- [ ] **Write the money tests** named in ADR-0012 — `equalShares`,
      `parseAddExpense` boundaries, `deriveBalances` netting to zero,
      `formatGbp`/`describePosition`. Zero new dependencies. Not a `REQ-*`; our
      own scope, and small.
- [ ] Write `context/domain-model.md` as Cluster D settles the schema
- [ ] Write `context/architecture.md` as Cluster E settles the topology

## Written deliverables not to forget

Easy to lose because they aren't code:

- [ ] `REQ-C.4` — three modules that won't run on Workers, with a paragraph each
      on why, plus an edge-friendly replacement. Goes in the repo.
- [ ] `REQ-F.1` — the rate-limit window/count rationale, written down.
- [ ] `REQ-X.2` — running notes: what surprised you, what you got wrong, what
      you'd do differently. **Start these at Cluster A** — "what surprised you"
      cannot be reconstructed afterwards.
- [ ] `REQ-X.5` — architecture diagram in the README.
- [ ] `REQ-X.6` — the EdgeLedger comparison write-up. The payoff for the
      quarantine.

## Evidence to capture as you go

Several requirements are proven by a demonstration, not by code. Keep the
commands and their output — they are demo material (`REQ-X.8`):

- [x] `REQ-B.2` — curl an invalid payload past the client; server rejects it —
      [`../evidence/REQ-B.2-server-side-validation.md`](../evidence/REQ-B.2-server-side-validation.md)
      (the browser-side half was added to the same file on 2026-09-22)
- [x] `REQ-B.3` — devtools showing no client-side data calls on the main page —
      [`../evidence/REQ-B.3-no-client-side-data-calls.md`](../evidence/REQ-B.3-no-client-side-data-calls.md)
- [ ] `REQ-D.6` — what D1 transaction limit you hit, and how you avoided it
- [ ] `REQ-E.2` — replayed idempotency key: one write, identical response
- [ ] `REQ-E.6` — scheduled handler run twice, identical result
- [ ] `REQ-F.1` — sixth rapid request returns 429
- [ ] `REQ-F.2` — forged submit rejected server-side
- [ ] `REQ-F.3` — `wrangler tail | grep AUDIT` yielding parseable JSON
- [ ] `REQ-F.5` — secret rotation done wrong, then right

## Stretch

- [x] ~~A vision model~~ → **required**, inherent to Splitr. Not a stretch.
- [ ] `stretch` Per-item split assignment (who had the pad thai) rather than
      equal shares — richer use of the OCR output. Decide at D.1.
- [ ] `stretch` Multi-currency.

## Proposed from the Cluster B screen design — not requirements

Raised while writing [`../context/screens-cluster-b.md`](../context/screens-cluster-b.md).
Every one of these is something a real bill-splitter would want and **no course
requirement asks for**, so none of them is in the spec. Logged here rather than
built (`CLAUDE.md` §6, product-designer rules).

- [ ] `proposed` **Account settings** — change your own name, email or password.
      No screen exists for this; Better Auth may or may not give one for free.
- [ ] `proposed` **Edit or delete an expense.** Currently an expense is
      write-once. The first typo'd amount will demand this.
- [ ] `proposed` **Leave a group / remove a member / delete a group.**
      Membership is currently add-only, which makes the "someone selected isn't
      in this group any more" error in the add-expense form unreachable.
- [ ] `proposed` **Invite expiry, revocation, and a regenerate-link control.**
      The invite link is currently permanent. The invalid-invite copy is written
      vaguely on purpose so adding expiry later needs no copy change.
- [ ] `proposed` **Email the invite.** Splitr produces a copyable link only; the
      user sends it themselves. Deliberate for now — it avoids email
      infrastructure nothing asks for.
- [ ] `proposed` **Notifications** of any kind, in-app or push. Note the nightly
      settle-up reminder (`REQ-E.6`) is required and has no delivery channel
      designed — worth resolving when Cluster E is reached.

## Raised while building the Cluster B routes — not requirements

- [ ] `proposed` **Copy for a "we can't find that expense" 404.**
      `screens-cluster-b.md` writes §5.7 for a missing *group* but nothing for a
      missing expense. `expenses/[expenseId]/not-found.tsx` currently follows
      §5.7's shape; the product designer should confirm or replace it.
- [ ] `proposed` **§4.6 A's pairwise breakdown** — "Marta owes you £12.00 · Sam
      owes you £12.00". That is debt simplification, i.e. settlement arithmetic,
      so it belongs with `REQ-E.1`. The headline sentence and §4.6 B's per-member
      positions are built; the pairwise line is not.
- [ ] `proposed` **Give the balance its own query at `REQ-D.1`.** Today the
      dashboard's balance and its expense feed come from one read, so §5.6's
      "the balance above is still accurate" fallback cannot be reached from a
      data failure — only from a render failure inside the feed.
- [ ] `proposed` **Render the invite link on the members error state.** §5.8 asks
      for it; the invite code is not a route param yet, so there is no honest way
      to show it when the group read has failed. Revisit when invites are rows.

## Cluster B QA findings — 2026-09-22, awaiting the tech lead

Raised by the `qa-test` agent's adversarial re-verification. Full commands and
output: [`../evidence/REQ-B-cluster-verification.md`](../evidence/REQ-B-cluster-verification.md).
**Deliberately not fixed** — a QA pass that silently repairs things destroys the
signal. These are defects against criteria already marked `Done`, so they are
requirement work, not new scope; they sit here only so they are not lost.

- [x] ~~`blocker-for-demo` **F-1 — `BETTER_AUTH_URL` is pinned to
      `http://localhost:3000`.**~~ **Fixed 2026-09-22 (backend).** The port is
      gone from configuration: `src/lib/auth.ts` resolves the base URL from the
      request host against a loopback allowlist, so 3000, 3100 and any other port
      work with nothing to keep in step, and a loopback `BETTER_AUTH_URL` is
      ignored with a warning so the mistake cannot recur
      ([ADR-0013](../decisions/0013-base-url-is-the-request-host-not-a-port-in-env.md)).
      `sign-out-button.tsx` now checks `signOut()`'s result and tells the user
      when it fails instead of redirecting. Re-verified in real Chrome on both
      ports, dev and production build. `REQ-B.5` → `Done`.
- [!] `blocker-for-demo` **F-2 — `REQ-B.3`'s "0 fetch, 0 xhr" holds on
      `next dev` only.** A production build makes **9** `fetch` requests on load
      (`<Link>` prefetch, which dev disables). The page's own data is still
      entirely server-rendered, but the Network tab a panel would look at is not
      empty. **Recommend either demoing on `next dev` and saying why, or
      re-wording the criterion and recording both logs.**
- [ ] `docs` **F-3 — `REQ-B.4` says "three" unreachable empty states; the
      changelog table it cites lists four** (it omits §5.3 "No groups yet").
      Fix the count, then decide separately whether "coded but unreachable" may
      sit under `Done`. **Recommend `REQ-B.4` → `In progress` until the fixtures
      of `REQ-D.1` make the four reachable.**
- [ ] `proposed` **O-1 — a missing group returns HTTP 200, not 404.** The
      `not-found.tsx` content is correct, but the status is flushed with the
      streaming shell before `notFound()` runs. Human-visible behaviour is right;
      a crawler or `curl -f` sees success.
- [ ] `proposed` **O-2 — the session gate drops the return path.**
      `screens-cluster-b.md` §1 specifies `redirect("/login?next=<path>")`; the
      implementation redirects to `/login` flat.
- [ ] `proposed` **O-3 — `listGroupExpenses` is read twice per render** (once in
      `page.tsx` for the balance, once in `ExpenseFeed`), and neither call is
      `cache()`d. Two D1 queries per page view from `REQ-D.1` onward. Same root
      cause as the balance-query item above.

## New, found while fixing F-1 — 2026-09-22

- [x] ~~`blocker-for-local-dev` **The OrbStack container cannot serve the app.**~~
      **Resolved 2026-09-23** by [ADR-0015](../decisions/0015-one-database-driver-d1-everywhere.md):
      `better-sqlite3` is gone, so the image needs no toolchain. Rebuilt with
      `docker compose up --build`, it serves :3000 and signs in against local D1.
      Original note:
      Its `node_modules` volume was built before `better-auth` and
      `better-sqlite3` were added, so every page that imports the auth client is
      `500 Module not found: Can't resolve 'better-auth/react'`. Rebuilding is
      what should fix it, but `docker compose up --build` fails too:
      `Dockerfile.dev` (node:24-slim) has no Python or C toolchain, and
      `better-sqlite3` needs `node-gyp rebuild` (`gyp ERR! find Python`). Adding
      `python3 make g++` to the `apt-get install` line is the likely one-line
      fix, but it touches
      [ADR-0007](../decisions/0007-docker-for-local-development.md) and was
      **out of scope** for the F-1 dispatch, so it was left alone. Pre-existing
      and unrelated to F-1 — the container was already answering 500 before that
      work started. Port 3000 was verified with native `next dev -p 3000` /
      `next start -p 3000` instead. **Decide:** fix the dev image, or drop Docker
      now that Cluster C brings `wrangler dev`?

## Raised in Cluster C — 2026-09-23

- [ ] `watch` **Worker size: 2,123 KiB gzipped of the free plan's 3 MiB (≈69%)**,
      measured on the first deploy, before any Cluster D/E code. Re-measure on
      every deploy from now on. `wrangler deploy` prints "Total Upload … / gzip".
      If it crosses the limit, that's a plan-tier decision, not an adapter one
      ([ADR-0014](../decisions/0014-opennext-as-the-deploy-adapter.md)).
- [x] ~~`REQ-D.1` **Retire `db:local` / `db:remote`.**~~ Done on 2026-09-24: replaced by `db:generate` and `db:migrate:local|remote`. The auth tables were dropped and recreated by the first migration, with Raffaele's approval for his own account. Original note: They apply
      `drizzle-kit export` DDL, and they aren't re-runnable (`CREATE TABLE`
      fails on existing tables). Replace them with generated migrations
      (`drizzle-kit generate` + `wrangler d1 migrations apply`) at `REQ-D.1`.
      Note the remote D1 already holds the four auth tables, so the first
      generated migration must not try to create them again. Plan for that at
      `REQ-D.1` ([ADR-0015](../decisions/0015-one-database-driver-d1-everywhere.md)).
- [ ] `decision` **Possible leak in the EdgeLedger seal: `wiki/techstack/`.**
      `versions.md` says it was "read from `package.json` and `wrangler.jsonc`
      in `typescript-cloudflare-project/`", and `frontend-nextjs-opennext.md`
      describes `nextjs-edgeledger-flare`'s own files. `CLAUDE.md` §2 routes
      agents there for "which Cloudflare API", so every agent that follows the
      router reads EdgeLedger-derived specifics. Today's ADR-0014 and ADR-0015
      were written *before* those pages were opened. **Raffaele to decide:**
      move the EdgeLedger-specific parts into the sealed `reference-edgeledger/`,
      or accept them as general platform notes and say so in ADR-0003.
- [ ] `dx` **Fresh clone: `tsc` needs `npm run cf:types` first.** The bindings
      type (`worker-configuration.d.ts`) is generated and gitignored. It's the
      same class of caveat as `LayoutProps<"/">` (`CLAUDE.md` §1a).
- [ ] `dx` **`npm run preview` needs a local `.dev.vars`** containing
      `BETTER_AUTH_URL=` (blank), or it inherits the deployed origin and returns
      403 on every sign-in. Documented in `.env.example`. The file is gitignored,
      so a fresh clone doesn't have it.
- [ ] `F-2` **New option for the F-2 decision:** the deployed Worker *is* a
      production build now. The `REQ-B.3` network log can be re-captured against
      https://splitr.raffaele-digennaro.workers.dev, which is the build the demo
      will actually show. It doesn't make the decision, but it changes what
      "record both logs" costs.
- [ ] `decision` **Should the vision model expand receipt abbreviations at OCR
      time (D.6)?** The C.4 spike scored 14/15 on clean descriptions and **2/10
      on receipt shorthand** ("KNG PRWN PHAD" → `drinks`). RAG over a group's
      history is one answer; normalising at OCR is another; they can be
      combined. Raise it with Raffaele at D.6, and measure it in the vision
      spike ([evidence](../evidence/REQ-C.3-first-edge-llm-call.md)).
- [ ] `decision` **Search scope: the current group or all the viewer's groups?**
      The brief says "across all your groups"; the build plan's D.8 says "the
      viewer's group". Both are safe (never another user's data), but they
      give different UX and a different Vectorize filter. Resolve at D.8 with
      Raffaele.
- [ ] `decision` **Tell the course owners that `REQ-C.3`'s model is dead.**
      `@cf/meta/llama-3.1-8b-instruct` has failed with `AiError 5028` since
      2026-05-30, so every learner following the brief will hit it. It's
      Raffaele's call whether to post in `#project-jedi`
      ([ADR-0017](../decisions/0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md)).
- [ ] `watch` **Before the demo, check the Workers AI changelog for `-fp8`.**
      Its un-suffixed sibling and `-awq` were retired in May 2026.
- [ ] `E.4` **The eval must record neurons as well as accuracy.** The prompt
      size dominated cost in the spike (8B-fp8: 2.90 neurons per call with an
      11-line prompt), and RAG examples will grow the prompt.

## Raised in Cluster D — 2026-09-24

- [ ] `E.1` **Does every balance-changing write go through the Durable
      Object?** A settlement checks the payer still owes, and leaving checks
      the member is square (ADR-0018 §2, §6). Both are check-then-write
      against net balances, and a void or new expense can land in between.
      That's decided at E.1 together with "own vs arbitrate"
      ([ADR-0018](../decisions/0018-splitr-domain-model.md), Consequences).
- [ ] `D.3` **Rules only code can enforce**, needed when writes are wired
      through D1: the expense currency must equal the group's; payers,
      participants and settlement parties must be current (not-left) members;
      leaving requires a net of exactly 0.
- [ ] `stretch` Per-item splits, multi-currency, single-use invites
      (declined in ADR-0018, kept as ideas).
- [ ] `decision` **The seal leak extends to `wiki/context/glossary.md`.** Its
      "Project" section describes EdgeLedger's domain (`daily_summary`, the
      100-at-a-time backfill). It's the same question as `wiki/techstack/`:
      move it or accept it.
- [ ] `todo` **Raffaele: re-register on the live site.** Production has 0
      users since the migration (2026-09-24).
- [x] ~~`O-3` The feed read twice per render, uncached.~~ **Fixed at D.3:**
      every read in `expense-feed.ts` is `cache()`d, and balances come from
      one `getGroupBalances()`.
- [x] ~~`REQ-B.4` Four empty states that never rendered.~~ **All four were
      rendered in a real browser at D.3.** `REQ-B.4` is Done.
- [ ] `O-2` **Still open, with honest copy for now.** The join form used to
      promise "Log in instead and you'll join". Nothing implements a return
      path, so it now says "Log in, then open this invite link again". The real
      fix is `/login?next=`.
- [ ] `D.3-gap` **Voiding and leaving aren't built.** ADR-0018 §3/§6/§7 fixed
      how they work, and the schema supports them (`voided_at`/`voided_by`,
      `left_at`), but no `REQ` asks for the UI. They're candidates for
      `REQ-D.5`'s natural schema change, or for E.1 if every balance-changing
      write must go through the DO.
- [ ] `watch` **Worker size is 2,329 KiB gzipped (about 76% of 3 MiB)** after
      D.3, up from 69%. Cluster D still adds R2 signing, the embedding path and
      search. Re-measure every deploy.
- [ ] `F` **The cookie-authenticated JSON Route Handlers need a CSRF check.**
      `POST …/expenses` and `…/settlements` accept a session cookie and parse
      the body regardless of `Content-Type`. The mitigation today is Better
      Auth's `SameSite=Lax` cookie, which isn't sent on cross-site POSTs.
      Verify that at Cluster F (`REQ-F.2`/F.3's "forge a submit") rather than
      assume it.
- [ ] `dx` **A fresh clone needs `npx next typegen`** as well as
      `npm run cf:types`. A new route's `RouteContext<…>` type doesn't exist
      until Next generates it, which is the same class as `LayoutProps<"/">`.
- [ ] `D.5` **Orphaned receipt photos.** A photo uploaded but never attached
      (an abandoned form) stays in R2. It's harmless, but unbounded. Options:
      an R2 lifecycle rule on a `pending/` prefix, or the nightly cron (E.8)
      sweeping keys that no expense references (ADR-0020).
- [ ] `D.5` **Local dev writes to the real `splitr-receipts` bucket**
      (`remote: true`, ADR-0020). One local-dev photo from 2026-09-24 remains,
      referenced by local D1 (`receipts/grp_c539…/0a05af8a….png`).
- [ ] `D.6` **Before the vision spike, ask Raffaele** (the AI-decision rule):
      the candidate models, the ~10 real English receipts he'll photograph,
      whether OCR expands abbreviations, and how the draft-to-confirm UI looks.

