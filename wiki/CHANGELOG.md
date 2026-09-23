# Changelog

Append-only. Newest entries at the bottom. One entry per change to code or wiki,
written in the same turn as the change. Format is defined in `CLAUDE.md` §5.

---

## 2026-09-22 — Wiki scaffold and governance rules
- **Type:** added
- **Scope:** `CLAUDE.md`, `wiki/**`
- **What:** Created the `wiki/` knowledge base (`requirements/`, `techstack/`,
  `context/`, `guidelines/`, `todos/`, `decisions/`) plus `CHANGELOG.md` and
  `AI-AUDIT.md`. Wrote a thin root `CLAUDE.md` that points into the wiki and
  makes changelog + audit-log upkeep a hard condition of "done".
- **Why:** Requested by Raffaele: collect project knowledge in a navigable wiki
  rather than accumulating everything in `CLAUDE.md`, and guarantee no decision
  is ever lost.
- **Decision:** [ADR-0001](./decisions/0001-wiki-as-knowledge-base.md)

## 2026-09-22 — Techstack, context and guidelines populated from reference project
- **Type:** added
- **Scope:** `wiki/techstack/**`, `wiki/context/**`, `wiki/guidelines/**`
- **What:** Documented the Cloudflare platform surface, TypeScript conventions,
  both frontend stacks, the data layer, the domain model, the architecture, and
  the coding/security/observability/testing standards — all extracted by reading
  `typescript-cloudflare-project/`.
- **Why:** These are course-independent and could be produced while course
  access is blocked.
- **Decision:** none

## 2026-09-22 — Requirements folder stubbed, marked blocked
- **Type:** added
- **Scope:** `wiki/requirements/**`
- **What:** Created the requirements index, a capture protocol, and empty phase
  stubs. Marked the folder BLOCKED pending access to the course site.
- **Why:** The course is the agreed source of truth for requirements and it sits
  behind an authenticated session that available tooling cannot establish.
- **Decision:** [ADR-0002](./decisions/0002-course-is-requirements-source-of-truth.md)

## 2026-09-22 — Course captured; requirements written; EdgeLedger quarantined
- **Type:** added | changed
- **Scope:** `wiki/requirements/**`, `wiki/context/**`, `wiki/techstack/**`, `wiki/reference-edgeledger/**`, `wiki/decisions/`, `CLAUDE.md`, `wiki/README.md`
- **What:** Raffaele supplied the full course capture (21 slides), saved verbatim
  to `requirements/_raw/course-full-capture.md`. Wrote ~55 `REQ-*` entries across
  9 cluster files plus `cross-cutting-rules.md`. Replaced the speculative
  `phases/` folder with `clusters/` matching the course's real structure.
  Quarantined all EdgeLedger-specific analysis into `wiki/reference-edgeledger/`
  and reframed `techstack/` as platform reference. Rewrote `CLAUDE.md` and the
  wiki index around the corrected understanding.
- **Why:** The course is "pick your own project, build it across six clusters",
  **not** "rebuild EdgeLedger" — and it explicitly forbids copying from the
  reference build until the finishing step.
- **Decision:** [ADR-0003](./decisions/0003-edgeledger-is-comparison-not-template.md)

## 2026-09-22 — Corrections to earlier wiki content
- **Type:** fixed
- **Scope:** `wiki/techstack/README.md`, `wiki/context/**`, `wiki/requirements/README.md`
- **What:** Corrected four claims written before the capture: (1) both frontends
  are **not** required — Next.js App Router only, TanStack Start is absent from
  the course; (2) a Workers **Paid** plan is **not** needed — free tier suffices,
  which is why Queues is the one optional item in Cluster E; (3) **Vectorize is
  required** (`REQ-D.4`), not "off" as EdgeLedger has it; (4) R2 uploads must use
  **presigned URLs** (`REQ-D.3`), not streaming through a Worker.
  Also flagged: `idempotencyKey` is a **header** (`REQ-E.2`), and Cloudflare
  Access + Workflows are EdgeLedger extras, absent from the course.
- **Why:** Course capture contradicted inferences drawn from the reference build.
- **Decision:** [ADR-0003](./decisions/0003-edgeledger-is-comparison-not-template.md)

## 2026-09-22 — AI collaboration guideline added
- **Type:** added
- **Scope:** `wiki/guidelines/ai-collaboration.md`
- **What:** Wrote the rules reconciling "use an agentic tool" (`REQ-0.1`) with
  "read and understand every file it writes" (`REQ-M.3`) and "explain every
  decision in your own words" (`REQ-M.4`).
- **Why:** These are `[MUST]` requirements that constrain how the AI works, and
  the 15-minute demo tests them directly.
- **Decision:** none

## 2026-09-22 — GitHub operations prohibited for AI
- **Type:** changed
- **Scope:** `CLAUDE.md` §6, `wiki/todos/backlog.md`
- **What:** Added a standing rule: the AI performs **no** GitHub operations of
  any kind. Raffaele owns the account and creates the repository himself.
- **Why:** Explicit instruction from Raffaele.
- **Decision:** none

## 2026-09-22 — Project selected: Splitr; scope settled; build plan written
- **Type:** added
- **Scope:** `wiki/context/project-brief.md`, `wiki/decisions/0004`, `0005`,
  `wiki/todos/build-plan.md`, `wiki/requirements/clusters/**`, `wiki/todos/backlog.md`,
  `wiki/README.md`, `wiki/decisions/README.md`
- **What:** `REQ-P.1` resolved — **Splitr**, with the contested write being two
  group members recording the same settlement simultaneously. Wrote the project
  brief (satisfies `REQ-P.1`/`P.2`/`P.3`, and the `REQ-0.5` README text).
  `REQ-E.8` (Queues) marked **Dropped**; Cluster F marked **in scope**. Produced
  the full cluster-by-cluster build plan. Updated ~12 requirement statuses that
  these decisions unblocked or resolved.
- **Why:** Raffaele chose Splitr, Cluster F in, Queues out, public repo on his
  personal account.
- **Decision:** [ADR-0004](./decisions/0004-project-is-splitr.md),
  [ADR-0005](./decisions/0005-optional-scope.md)

## 2026-09-22 — Repo created, Step 0 complete, toolchain installed
- **Type:** added
- **Scope:** repo root, `wiki/**` (moved), `README.md`, `~/.zshenv`, `~/.local/bin`
- **What:** Raffaele created [rafio-dgn/splitr](https://github.com/rafio-dgn/splitr)
  (public, empty). Cloned it to `ts-training/splitr/`, moved `wiki/` and
  `CLAUDE.md` inside, and wrote the README opening with what Splitr is, who it's
  for, and the contested write. Installed the toolchain: nvm 0.40.8 → Node
  v24.21.0 (Active LTS) + npm 11.19.0, and Wrangler 4.136.2.
- **Why:** `REQ-0.3`, `REQ-0.5`, `REQ-0.1`. Layout now satisfies `REQ-0.4` —
  the reference build sits beside the repo, never inside it.
- **Decision:** none

## 2026-09-22 — Node made visible to non-interactive shells
- **Type:** fixed
- **Scope:** `~/.zshenv`, `~/.local/bin/{node,npm,npx,corepack,wrangler}`,
  `wiki/guidelines/workflow.md`
- **What:** nvm's Node was invisible to tooling. Two causes: zsh sources `.zshrc`
  only for interactive shells, and this machine's harness resets `PATH` after the
  profile loads (exported vars survive, `PATH` edits do not). Fixed by symlinking
  the binaries into `~/.local/bin`, which is already first on the harness `PATH`.
  Added `~/.zshenv` to export `NVM_DIR` and load nvm when `node` is absent.
  Documented in `guidelines/workflow.md`, including how to re-link after a Node
  version switch.
- **Why:** Cluster A cannot start without a working `npx create-next-app`.
- **Decision:** none

## 2026-09-22 — GitHub rule narrowed to match intent
- **Type:** changed
- **Scope:** `CLAUDE.md` §6
- **What:** The blanket "no GitHub operations at all" rule forbade cloning a repo
  Raffaele had handed over. Narrowed to: no **changes** on GitHub (create, delete,
  settings, remotes, push, PR, issue, release, `gh`, authenticated API);
  permitted: local `git`, and `clone`/`fetch`/`pull` on a URL he supplies. Commit
  only when asked; never push.
- **Why:** The original wording was stricter than the instruction it encoded, and
  blocked the next step.
- **Decision:** none

## 2026-09-22 — Cluster A complete: Next.js scaffold, fetchJson, landing page
- **Type:** added
- **Scope:** repo root configs, `src/**`, `public/`, `.gitignore`, `CLAUDE.md`
- **What:** Scaffolded Next.js 16.3.5 / React 19.2.8 / TS 5 / Tailwind 4 at the
  repo root (`REQ-A.1`). Pruned the scaffold: removed 5 Next/Vercel demo SVGs,
  the default favicon and the demo page (`REQ-A.4`). Added
  `src/lib/fetch.ts` with `fetchJson<T>`, `HttpError` and `JsonParseError`
  (`REQ-A.2`). Built the Splitr landing page (`REQ-A.3`) and corrected the layout
  metadata, which still said "Create Next App".
- **Why:** Cluster A.
- **Decision:** [ADR-0006](./decisions/0006-repo-layout.md) — app at repo root so
  `src/lib/fetch.ts` and `src/db/schema.ts` match the paths the requirements name.

## 2026-09-22 — Kept Next.js-generated AGENTS.md; wired it into CLAUDE.md
- **Type:** added
- **Scope:** `AGENTS.md`, `CLAUDE.md` §1a
- **What:** `create-next-app` generated its own `AGENTS.md` (the "This is NOT the
  Next.js you know" warning) and a `CLAUDE.md` that just did `@AGENTS.md`. Kept
  `AGENTS.md` — `next dev` regenerates it, so deleting it only produces a dirty
  tree — discarded the generated `CLAUDE.md`, and added an `@AGENTS.md` reference
  plus the version warning into ours as §1a.
- **Why:** The warning is real and already bit us: `layout.tsx` uses
  `LayoutProps<"/">`, a generated global, not the familiar
  `{ children: React.ReactNode }`.
- **Decision:** none

## 2026-09-22 — GitHub rule amended to permit pushing when asked
- **Type:** changed
- **Scope:** `CLAUDE.md` §6
- **What:** The rule said "never push", which conflicted with Raffaele asking for
  the wiki to be committed **in his repo**. Amended to permit `push` to
  `origin/main` of this repo, still only on explicit request, never on the AI's
  own initiative, and never force-push or history rewrite. Removed the now
  contradictory "no pushes" clause from the prohibition list.
- **Why:** The written rule was stricter than the instruction it encoded.
- **Decision:** none

## 2026-09-22 — Local development in Docker, via OrbStack
- **Type:** added
- **Scope:** `Dockerfile.dev`, `docker-compose.yml`, `.dockerignore`,
  `wiki/guidelines/workflow.md`, `README.md`, `/Applications/OrbStack.app`,
  `~/.local/bin/{docker,docker-compose}`
- **What:** Installed OrbStack 2.2.3 (Docker 29.4.0, Compose v5.1.2) and added a
  dev container running the Next.js dev server at `localhost:3000`. Homebrew was
  planned but proved unnecessary — OrbStack ships its own docker CLI — and
  impossible anyway, since it needs a sudo password an agent cannot supply.
- **Why:** Raffaele's requirement. **Not a course requirement** — nothing in the
  21 slides mentions containers.
- **Decision:** [ADR-0007](./decisions/0007-docker-for-local-development.md)

## 2026-09-22 — Agent team and project skills
- **Type:** added
- **Scope:** `.claude/agents/*` (6), `.claude/skills/*/SKILL.md` (6),
  `wiki/guidelines/agent-team.md`, `wiki/evidence/`, `CLAUDE.md`
- **What:** Added a tech-lead agent that dispatches product-designer, frontend,
  backend, devops and qa-test specialists, plus six skills encoding this
  project's specific failure modes: `req-check`, `wiki-discipline`,
  `verify-api`, `edgeledger-guard`, `audit-log`, `demo-evidence`.
- **Why:** Raffaele's requirement. **Not a course requirement** — `REQ-0.1` asks
  for *an* agentic tool, nothing about roles.
- **Decision:** [ADR-0008](./decisions/0008-agent-team-and-skills.md)

## 2026-09-22 — Corrections to Cluster A answer notes
- **Type:** fixed
- **Scope:** `wiki/todos/cluster-a-questions.md`
- **What:** Reworked the `REQ-A.5` notes after Raffaele's review. His Q1 answer
  (push `"use client"` to the leaf that owns state, keep parents on the server)
  is better than the original framing, which implied Server Components cost you
  interactivity. Added proofs for two claims tested empirically: `JSON.parse`
  returns `any` so `const u: User = JSON.parse(s)` compiles clean under `strict`,
  and `try/catch` does **not** catch a wrong-shaped response because nothing
  throws.
- **Why:** `REQ-M.4` — the answers have to be right, and two were not.
- **Decision:** none

## 2026-09-22 — Cluster B screen design: routes, flows, copy and state coverage
- **Type:** added
- **Scope:** `wiki/context/screens-cluster-b.md` (new), `wiki/context/README.md`,
  `wiki/todos/backlog.md`
- **What:** Specified Splitr's Cluster B user-facing behaviour before any code:
  the full route tree (public routes plus the `(app)` group), the six core flows
  (sign up → create group → invite → public join → add expense → view balance),
  loading/error/**empty** states named individually for thirteen async surfaces,
  real copy throughout, and the `REQ-B.2` form spec — **add an expense** — with
  every field, validation rule and per-field error message, plus the seven
  invalid payloads worth curl-ing. Sketched where the refused settlement lives
  (`/groups/[groupId]/settle`) and what it must say, since a generic error there
  would defeat the point of the build. Six out-of-scope wants were logged in the
  backlog rather than slipped into the spec.
- **Why:** `REQ-B.1` (route tree) and `REQ-B.4` (loading, error and empty on
  every async surface), with `REQ-B.2`, `REQ-B.3`, `REQ-B.5`, `REQ-F.2` and
  `REQ-E.1` traced in §9 of the page.
- **Decision:** none — no ADR closed. Two remain open and are flagged in the
  page: the `REQ-B.5` auth library (the brief said Better Auth; the backlog's
  candidate list does not include it) and the split model at `D.1`.

## 2026-09-22 — Better Auth, the Drizzle schema, and the shared zod validation layer
- **Type:** added
- **Scope:** `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`,
  `src/app/api/auth/[...all]/route.ts`, `src/app/(auth)/login`,
  `src/app/(auth)/register`, `src/app/(app)/layout.tsx`,
  `src/components/sign-out-button.tsx`, `src/db/schema.ts`, `src/db/index.ts`,
  `drizzle.config.ts`, `src/lib/schemas/expense.ts`,
  `src/lib/expenses/add-expense.ts`, `src/lib/groups/membership.ts`,
  `src/app/api/groups/[groupId]/expenses/route.ts`,
  `src/app/(app)/groups/[groupId]/expenses/new/*`, `src/app/(app)/groups/page.tsx`,
  `package.json`, `.env.example`, `.gitignore`,
  `wiki/evidence/REQ-B.2-server-side-validation.md`
- **What:** Installed **Better Auth 1.7.5** as a black box — sign up, sign in,
  sign out and `getSession()` — persisting to a local SQLite file through
  **Drizzle 0.45.3**, with the schema at `src/db/schema.ts` (generated by
  `npx auth@1.7.5 generate`, then documented, never hand-edited). Route gating
  lives in the `(app)` layout, not in middleware. Added the shared zod schema at
  `src/lib/schemas/expense.ts` — imported unchanged by the client form, the
  Server Action and a Route Handler — and one service function,
  `addExpense()`, that owns every rule and emits the `[AUDIT]` line. Proved the
  server half by curl: 10 invalid payloads rejected with per-field messages,
  plus a membership rejection the client cannot make.
- **Why:** `REQ-B.5` (auth from a library, black box) and `REQ-B.2` (one form,
  one shared schema, proven on both sides). `REQ-D.1`'s path `src/db/schema.ts`
  is satisfied early and deliberately. `REQ-M.5` audit lines from the first
  write path.
- **Decision:** [ADR-0009](decisions/0009-better-auth-on-local-sqlite-via-drizzle.md)
  (Better Auth on local SQLite via Drizzle, rebound to D1 at Cluster D) and
  [ADR-0010](decisions/0010-validation-entry-points.md) (one validation path,
  two entry points; the Route Handler is the curl target).

## 2026-09-22 — The Cluster B route tree, its screens, and every loading/error/empty state
- **Type:** added
- **Scope:** `src/app/(app)/**`, `src/app/(auth)/**`, `src/app/join/**`,
  `src/components/{ui,section-error-boundary,copy-link-button}.tsx`,
  `src/lib/money.ts`, `src/lib/groups/{current-group,create-group,membership}.ts`,
  `src/lib/expenses/{expense-feed,balances}.ts`, `src/lib/schemas/group.ts`,
  `wiki/evidence/REQ-B.3-no-client-side-data-calls.md`,
  `wiki/evidence/REQ-B.2-server-side-validation.md`
- **What:** Built the 15-route tree of
  [`screens-cluster-b.md`](context/screens-cluster-b.md) §1 — public `/`,
  `(auth)/login`, `(auth)/register` and `/join/[inviteCode]`, plus eight screens
  inside the `(app)` group — with the designer's copy used verbatim. Every page
  is a Server Component; `"use client"` appears only on six leaves, each of which
  owns state that cannot exist on a server. Replaced the backend agent's three
  stubs: the `(app)` layout keeps its `requireSession()` gate and gained a nav
  shell, `/groups` became the real list with its empty state, and the add-expense
  form gained a live `£x each` figure taken from the shared schema by `.pick()`,
  locked fields while submitting, focus-to-first-error, and the form-level
  failure banner. Also split the two auth pages into Server Components with
  client form leaves — they were whole-page `"use client"` entry points.
- **Why:** `REQ-B.1` (route tree), `REQ-B.3` (main page server-rendered, no
  client data calls), `REQ-B.4` (loading, error and empty everywhere), and the
  one outstanding criterion of `REQ-B.2` (the client half, now exercised in a
  browser). All four are now **Done**.
- **Decision:** [ADR-0011](decisions/0011-one-membership-check-per-request.md) —
  one membership check per request, in the group layout, memoised with React
  `cache()`, and the `not-found.tsx` placement that follows from it.

### State coverage — the thirteen surfaces of §5

| § | Surface | Loading | Error | Empty |
|---|---|---|---|---|
| 5.1 | Invite lookup | `join/[inviteCode]/loading.tsx` | `error.tsx` | "This invite isn't valid" ✅ seen |
| 5.2 | Join submission | button → "Joining…" | inline banner | n/a |
| 5.3 | Group list | `groups/loading.tsx` ✅ seen | `groups/error.tsx` | "No groups yet" — *unreachable*: the fixture puts every viewer in one group |
| 5.4 | Create-group submission | button → "Creating…" | inline banner | n/a |
| 5.5 | Dashboard balance | `[groupId]/loading.tsx` ✅ seen | `[groupId]/error.tsx` ✅ seen | "Everyone's square" ✅ seen |
| 5.6 | Expense feed | nested `<Suspense>` skeleton | `SectionErrorBoundary` ✅ seen | "No expenses yet" ✅ seen |
| 5.7 | Group not found | — | — | `groups/not-found.tsx` ✅ seen |
| 5.8 | Members & invite | `members/loading.tsx` | `members/error.tsx` | "It's just you in here so far" — *unreachable*: the fixture group has three people |
| 5.9 | Expense detail | `[expenseId]/loading.tsx` | `[expenseId]/error.tsx` | "No line items" — *unreachable*: no expense can exist before `REQ-D.1` |
| 5.10 | Split picker | n/a — the member list arrives as props from the server render, so there is no client-side wait to skeleton | — | "You're the only member" — *unreachable* as above |
| 5.11 | Add-expense submission | button → "Adding…", fields locked | inline banner ✅ seen | n/a |
| 5.12 | Settle up | → Cluster E | → Cluster E | "Nothing to settle" ✅ seen |
| 5.13 | Search | `search/loading.tsx` | `search/error.tsx` | "Find a past expense" ✅ seen |

The four *unreachable* empties are written and compiled but cannot be produced
today, because the fixtures that stand in for Cluster D's tables never yield the
shape that triggers them. They are listed rather than ticked.

### Knowing deviations from the spec, none of them silent

- **§4.6 A's per-person breakdown** ("Marta owes you £12.00") needs pairwise debt
  simplification, which is settlement arithmetic and belongs to `REQ-E.1`. The
  headline sentence and §4.6 B's per-member positions are built; the pairwise
  line is not.
- **§5.8's "the invite link survives a members-page error"** is not possible yet:
  the invite code is not a route param, it comes from the group fixture — the
  read that just failed. Noted in `members/error.tsx`.
- **`/search` ships no search box.** A field that accepts a query and can never
  answer it is the "coming soon" promise §4.5 rules out. The box arrives with
  the embeddings behind it at `REQ-D.4`.
- **A missing *expense* had no copy written.** `expenses/[expenseId]/not-found.tsx`
  follows §5.7's shape — same two possibilities, no hint which — and says so, for
  the product designer to overrule.
- **Nothing is persisted.** The create-group and add-expense forms report
  "Validated … nothing was stored", naming `REQ-D.1`, rather than implying a
  write. Same honesty the backend agent's `HTTP 202 / "persisted": false` chose.

## 2026-09-22 — Adversarial re-verification of Cluster B, and the test strategy settled
- **Type:** docs
- **Scope:** `wiki/evidence/REQ-B-cluster-verification.md` (new),
  `wiki/evidence/README.md`,
  `wiki/decisions/0012-test-the-invariants-and-the-money-nothing-else.md` (new),
  `wiki/decisions/README.md`, `wiki/guidelines/testing.md` (rewritten),
  `wiki/todos/backlog.md`. **No source file was changed** — two temporary throws
  were injected to exercise the error boundaries and both files were restored,
  `shasum -c` verified.
- **What:** Re-ran every acceptance criterion of `REQ-B.1`…`REQ-B.5` from
  scratch, trusting neither the requirement file, the changelog, nor the existing
  evidence — the recorded commands were re-executed and their output compared.
  **21 of 23 criteria hold; two do not.** (F-1) `BETTER_AUTH_URL` is pinned to
  port 3000, so on the documented port 3100 every Better Auth mutation returns
  `403 INVALID_ORIGIN` — and `sign-out-button.tsx` ignores the result, so a
  failed sign-out still navigates to `/login` with the session live. (F-2)
  `REQ-B.3`'s "0 fetch, 0 xhr" was captured on `next dev`, which disables
  `<Link>` prefetch; a production build makes 9 `fetch` requests on load. Plus
  one wording defect (`REQ-B.4` says three unreachable empty states, its own
  changelog table lists four) and three lower-severity observations. All eleven
  `REQ-B.2` curl payloads reproduced byte-identical, the 15-route build output
  matched, the session gate held on all eight `(app)` routes, `/join` worked with
  and without a session, both error boundaries were proved by injection, and no
  crypto exists anywhere in `src/`. Separately, rewrote `guidelines/testing.md`,
  which had been a draft assuming the reference build's stack (`vitest`
  "configured", `@testing-library/react` "installed" — none of it true here).
- **Why:** `REQ-B.1`–`REQ-B.5` were all marked `Done`; a false `Done` surfaces
  live at `REQ-X.8`. The test strategy is the long-standing backlog item, and the
  course has **no** `REQ-*` for testing.
- **Decision:** [ADR-0012](./decisions/0012-test-the-invariants-and-the-money-nothing-else.md)
  — test only the invariants of the contested write and the money arithmetic;
  skip component markup, Drizzle and Cloudflare's services. Amends the steer on
  one point: start the money tests **now**, because `node --test` runs against
  our real modules with **nothing installed** (verified), so the reason to defer
  does not hold. Requirement statuses were **not** changed — downgrades are
  recommended in the backlog for the tech lead to decide.

## 2026-09-22 — Fix QA finding F-1: authentication worked on one port only, and sign-out failed silently

- **Type:** fixed
- **Scope:** `src/lib/auth.ts`, `src/components/sign-out-button.tsx`, `.env`,
  `.env.example`, `wiki/evidence/REQ-B-cluster-verification.md`,
  `wiki/decisions/0013-*`, `wiki/requirements/clusters/B-routing-and-forms.md`,
  `wiki/todos/backlog.md`
- **What:** Two independent defects, fixed independently. (1) **Origin
  mismatch** — Better Auth derives its trusted origin from `BETTER_AUTH_URL`,
  which was pinned to `:3000`, so every browser auth call on `:3100` was refused
  with `403 INVALID_ORIGIN`. The port is now gone from configuration entirely:
  `auth.ts` uses Better Auth 1.7.5's dynamic `baseURL` (`allowedHosts:
  ["localhost:*", "127.0.0.1:*"]`, `protocol: "http"`, `fallback`), which
  resolves the base URL per request and derives the trusted origins from the same
  list, so 3000, 3100 and any other loopback port all work with nothing to keep
  in step. `BETTER_AUTH_URL` is removed from `.env`/`.env.example`, and a
  *loopback* value is now ignored with a warning so the original mistake cannot
  be re-introduced. (2) **Silent sign-out** — `signOut()` resolves to
  `{ data, error }` and does not throw, so the button reported success for every
  failure and left the user on `/login` with a live session.
  `sign-out-button.tsx` now checks the result (and `.catch()`es a rejection) the
  way `login-form.tsx`, `register-form.tsx` and `join-form.tsx` do, shows
  "We couldn't sign you out — you're still signed in. Try again." in a
  `role="alert"`, and does **not** redirect on failure.
- **Why:** QA finding F-1 (`wiki/evidence/REQ-B-cluster-verification.md`), which
  falsified `REQ-B.5`'s third criterion. `REQ-B.5` returns to `Done`; the
  evidence file gains a "F-1 — fix verified" section with the browser transcript.
- **Decision:** [ADR-0013](./decisions/0013-base-url-is-the-request-host-not-a-port-in-env.md)

## 2026-09-22 — Dev container fixed for native modules
- **Type:** fixed
- **Scope:** `Dockerfile.dev`
- **What:** Added `python3`, `make`, `g++` to the dev image. `better-sqlite3` is a
  native module, so `npm ci` runs `node-gyp rebuild`, which died with
  `gyp ERR! find Python`. The container had been unable to build since Better
  Auth landed, and its `node_modules` volume predated those dependencies.
  Rebuilt with `--renew-anon-volumes`.
- **Why:** Found by the F-1 fix agent while verifying on port 3000; it correctly
  left it alone as out of scope and logged it as a blocker.
- **Decision:** none — implements [ADR-0007](./decisions/0007-docker-for-local-development.md).
  Marked in the Dockerfile for removal at `REQ-D.1`, when D1 replaces
  `better-sqlite3` and the toolchain is no longer needed.

## 2026-09-22 — Tech-lead verification of the F-1 fix
- **Type:** docs
- **Scope:** `wiki/AI-AUDIT.md`
- **What:** Independently re-verified the F-1 fix rather than accepting the
  agent's report, including the CSRF boundary it narrowed. Confirmed working on
  **both** ports and inside the container.
- **Why:** The fix narrowed a security check; a wrong narrowing would be worse
  than the original bug.
- **Decision:** none

## 2026-09-22 — Session handover; stale README status corrected
- **Type:** docs
- **Scope:** `wiki/todos/HANDOVER.md`, `README.md`, `CLAUDE.md`, `wiki/README.md`
- **What:** Wrote a handover note for the next session — state, the three things
  needing a human, the open F-2 decision, the three logged defects, and the two
  lessons this session paid for. Wired it into `CLAUDE.md` §2 and the wiki index.
  Corrected the README's cluster table, which still showed Cluster B as "Next"
  when it is 4/6 done, and made the no-persistence state explicit.
- **Why:** Session close. A stale status table is read as truth.
- **Decision:** none

## 2026-09-23 — Deploy adapter chosen: OpenNext
- **Type:** docs
- **Scope:** `wiki/decisions/0014-opennext-as-the-deploy-adapter.md`, `wiki/decisions/README.md`
- **What:** Chose `@opennextjs/cloudflare` over Cloudflare Pages and over
  vinext. vinext is now Cloudflare's stated default for Next.js, but the build
  plan's "OpenNext vs Pages" framing didn't know about it. Pages can't host
  Cluster E's Durable Object, service bindings or cron. vinext is
  `1.0.0-beta.11` and replaces the Next.js compiler.
- **Why:** `REQ-C.1` leaves the adapter open and asks for an ADR.
- **Decision:** [ADR-0014](./decisions/0014-opennext-as-the-deploy-adapter.md)

## 2026-09-23 — Splitr deployed to Cloudflare Workers; D1 replaces better-sqlite3
- **Type:** changed
- **Scope:** `wrangler.jsonc`, `open-next.config.ts`, `next.config.ts`,
  `src/db/index.ts`, `src/lib/auth.ts`, `src/lib/session.ts`,
  `src/app/api/auth/[...all]/route.ts`, `drizzle.config.ts`, `package.json`,
  `eslint.config.mjs`, `Dockerfile.dev`, `.env.example`
- **What:** Created D1 `splitr` (WEUR) with the four Better Auth tables from
  `drizzle-kit export` DDL, keeping the first generated migration unspent.
  `db` and `auth` are now per-request async accessors (`getDb()`, `getAuth()`)
  memoised per binding. `better-sqlite3` was removed, along with the dev
  image's C toolchain. The bindings types are generated without runtime types,
  which collided with the DOM lib. Added `BETTER_AUTH_URL` as a `var`, made
  `workers_dev: true` and `preview_urls: false` explicit, and set
  `BETTER_AUTH_SECRET` with `wrangler secret put`. Deployed to
  https://splitr.raffaele-digennaro.workers.dev.
- **Why:** `REQ-C.1`. `better-sqlite3` can't load on a V8 isolate.
- **Decision:** [ADR-0015](./decisions/0015-one-database-driver-d1-everywhere.md);
  timing amends [ADR-0009](./decisions/0009-better-auth-on-local-sqlite-via-drizzle.md)

## 2026-09-23 — REQ-C.1 evidence, status and planning docs
- **Type:** docs
- **Scope:** `wiki/evidence/REQ-C.1-deployed.md`, `wiki/evidence/README.md`,
  `wiki/requirements/clusters/C-workers.md`, `wiki/todos/build-plan.md`,
  `wiki/todos/backlog.md`, `wiki/todos/HANDOVER.md`, `README.md`
- **What:** Recorded the deployed verification, including the
  `403 INVALID_ORIGIN` caught on the first deploy. Marked `REQ-C.1` Done and
  C.1/C.2 and step 0.6 done. Closed the `wrangler login` and container
  blockers. Logged five new backlog items: Worker size at about 69% of the
  free limit, retiring `db:local`/`db:remote` at `REQ-D.1`, the possible
  EdgeLedger leak in `wiki/techstack/`, and two fresh-clone setup steps.
  Updated the README's status table and run instructions.
- **Why:** `CLAUDE.md` §5.
- **Decision:** none

## 2026-09-23 — Throwaway hello-world Worker, deployed and tailed (REQ-C.2, 5/6)
- **Type:** added
- **Scope:** `workers/hello/`, root `tsconfig.json`, `eslint.config.mjs`,
  `wiki/evidence/REQ-C.2-throwaway-worker.md`, `wiki/requirements/clusters/C-workers.md`,
  `wiki/todos/build-plan.md`, `wiki/todos/HANDOVER.md`, `wiki/evidence/README.md`
- **What:** Scaffolded with `npm create cloudflare@latest` into `workers/hello/`,
  and pruned the vitest scaffolding and editor config. Three routes: `/` reads
  the `GREETING` var; `/secret` compares an `x-hello-key` header to the
  `HELLO_KEY` secret with `crypto.subtle.timingSafeEqual`; anything else is
  404. Deployed as `splitr-hello`, and `/secret` gave 500 before
  `wrangler secret put` and 200 after. Curled and watched with `wrangler tail`.
  The root `tsc` and ESLint now exclude `workers/`, whose runtime types would
  clash with the DOM lib.
- **Why:** `REQ-C.2`. The teardown (C.5) is still owed.
- **Decision:** none. The location follows [ADR-0006](./decisions/0006-repo-layout.md)
  and the test pruning follows [ADR-0012](./decisions/0012-test-the-invariants-and-the-money-nothing-else.md).

## 2026-09-23 — AI integration strategy, decided with Raffaele
- **Type:** docs
- **Scope:** `wiki/decisions/0016-ai-integration-strategy.md`, `wiki/decisions/README.md`,
  `wiki/todos/build-plan.md`
- **What:** Recorded twelve decisions from three rounds of structured questions.
  RAG categorises line items. Money always needs a human, and OCR output is a
  confirmed draft. Everything is in English. The taxonomy is a closed list of
  11 categories plus a system-only `uncategorised`. Categorisation runs after
  the write via `waitUntil`, with the cron as backfill. Every model call moves
  behind the AI Worker at E. There's one vector per line item. Retrieval checks
  the group first, then a seed corpus, and never crosses groups. A labelled eval
  set is the evidence. The vision model is chosen by a spike at D.6. The data is
  a synthetic seed plus a few real receipts. C.4 spikes the real prompt. The
  build plan's C.4, D.1, D.6, D.7, D.8, E.7 and E.8 rows now carry these
  decisions.
- **Why:** Raffaele asked that no AI decision be taken without him. `REQ-M.4`.
- **Decision:** [ADR-0016](./decisions/0016-ai-integration-strategy.md)

## 2026-09-23 — The course's Llama model is deprecated; `-fp8` replaces it
- **Type:** docs
- **Scope:** `wiki/decisions/0017-…`, ADR-0016 status line, `wiki/requirements/clusters/C-workers.md`
- **What:** Measured through a real binding: `@cf/meta/llama-3.1-8b-instruct`
  fails with `AiError 5028` (deprecated 2026-05-30), and `-fp8` works but
  rejects JSON mode (`5025`). `llama-3.3-70b-instruct-fp8-fast` supports JSON
  mode. Raffaele chose `-fp8` for C.4, with the E.4 eval comparing 8B and 70B,
  each with and without RAG.
- **Why:** `REQ-C.3` names a model that no longer answers.
- **Decision:** [ADR-0017](./decisions/0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md)

## 2026-09-23 — First edge LLM call: the categorisation spike (REQ-C.3)
- **Type:** added
- **Scope:** `workers/hello/wrangler.jsonc`, `workers/hello/src/index.ts`,
  `wiki/evidence/REQ-C.3-first-edge-llm-call.md`, `wiki/evidence/README.md`,
  `wiki/requirements/clusters/C-workers.md`, `wiki/todos/build-plan.md`,
  `wiki/todos/backlog.md`, `wiki/todos/HANDOVER.md`
- **What:** Added an `ai` binding and a key-guarded `POST /categorise` that
  asks `-fp8` for one key from the closed taxonomy, parses it, and checks it
  against the list (`uncategorised` otherwise). Deployed and measured:
  - clean descriptions 14/15, stable 15/15, median 426 ms, 2.90 neurons per call;
  - receipt shorthand 2/10;
  - one prompt injection contained, one passed as a valid label.
- **Why:** `REQ-C.3`, and the spike from ADR-0016 §12.
- **Decision:** [ADR-0016](./decisions/0016-ai-integration-strategy.md), [ADR-0017](./decisions/0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md)
