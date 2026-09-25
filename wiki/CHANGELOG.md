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

## 2026-09-23 — Throwaway Worker torn down (REQ-C.2 done)
- **Type:** removed
- **Scope:** `workers/hello/` (deleted), `wiki/evidence/REQ-C.2-throwaway-worker.md`,
  `wiki/evidence/README.md`, `wiki/requirements/clusters/C-workers.md`,
  `wiki/todos/build-plan.md`, `wiki/todos/HANDOVER.md`
- **What:** Ran `wrangler delete` (a dry run first, and without `--force`, since
  nothing depends on it). Verified afterwards: the URL returns 404 `1042`, the
  API returns `10007`, and the secret is gone. Splitr still returns 200.
  Deleted `workers/hello/` and the local scratch secret. `REQ-C.2` is marked
  Done. The code remains in history at `f18efcd`.
- **Why:** `REQ-C.2`: "torn down cleanly" is part of the requirement.
- **Decision:** none. Follows [ADR-0006](./decisions/0006-repo-layout.md).

## 2026-09-24 — Draft: three modules that won't run on Workers (REQ-C.4)
- **Type:** docs
- **Scope:** `docs/modules-that-wont-run-on-workers.md` (new), `README.md`,
  `wiki/requirements/clusters/C-workers.md`, `wiki/todos/build-plan.md`
- **What:** Drafted from Raffaele's own module list, choosing one failure class
  each:
  - `bcrypt` (native addon) → Web Crypto PBKDF2;
  - `puppeteer`/`playwright` (launches a binary) → Browser Rendering;
  - `socket.io` (long-lived process with in-memory state) → Durable Objects
    with WebSocket hibernation.

  The same-class modules are folded in: `bcryptjs`, `html-pdf`, `ffmpeg`,
  `node-cron`, `bullmq`, `redis`. There's also an aside on `dotenv`/`config`
  failing silently, and a list of former textbook examples that now work
  (`fs`, `pg`).
- **Why:** `REQ-C.4`. It's a written deliverable, and it stays in the repo for
  the demo.
- **Decision:** none. `docs/` is the location the requirement itself suggests.

## 2026-09-24 — REQ-C.4 cut to three paragraphs; README architecture and flows; study guide
- **Type:** docs
- **Scope:** `docs/modules-that-wont-run-on-workers.md`, `README.md`,
  `wiki/todos/STUDY-GUIDE.md` (new), `CLAUDE.md` §3, `wiki/context/project-brief.md`,
  `wiki/todos/HANDOVER.md`, `wiki/todos/backlog.md`, `wiki/todos/build-plan.md`,
  `wiki/requirements/clusters/C-workers.md`,
  `wiki/requirements/clusters/99-deliverables-and-certification.md`
- **What:**
  - The `REQ-C.4` write-up is cut to three paragraphs, as Raffaele asked
    (566 words). `REQ-C.4` is Done.
  - The README gains a detailed *How it works*, a system-overview diagram with
    a component status table, and seven flow diagrams. Built parts are drawn
    solid and planned ones dashed, with their build-plan steps. The open
    questions (who owns the balance, where the cron runs) are labelled as open.
  - New `STUDY-GUIDE.md` covers: the pitch, a one-line why for all 17 ADRs, the
    evidence and what it proves, the spoken questions with where to study
    them, the document deliverables, raw material for `REQ-X.2`, and the open
    questions.
  - `CLAUDE.md` §3 now requires keeping the study guide current.
  - The brief's stale decisions table now reflects the ADRs.
  - A new conflict is logged: search scope (current group vs all the viewer's
    groups).
- **Why:** Raffaele's request. `REQ-X.5` is started (`🟡`: it must be accurate
  as shipped), and `REQ-M.4`.
- **Decision:** none

## 2026-09-24 — REQ-D.1: domain schema and the first generated migration
- **Type:** added
- **Scope:** `src/db/schema.ts`, `src/lib/categories.ts` (new),
  `drizzle/0000_initial_schema.sql` and `drizzle/meta/` (new),
  `drizzle.config.ts`, `wrangler.jsonc`, `package.json`, `.gitignore`,
  `README.md`, `wiki/decisions/0018-splitr-domain-model.md` (new),
  `wiki/evidence/REQ-D.1-schema-and-first-migration.md` (new), and the status
  documents
- **What:**
  - Six domain tables: `group`, `group_member`, `expense`, `expense_share`,
    `line_item` and `settlement`. They have `CHECK`s for every single-row rule
    and `restrict` foreign keys. The category `CHECK` is built from the shared
    `src/lib/categories.ts`.
  - Generated `0000_initial_schema.sql`. The pre-existing auth tables were
    dropped so the migration recreates everything, and it was applied locally
    and remotely. Raffaele chose to drop his own production account and
    re-register.
  - The `db:ddl`/`db:local`/`db:remote` scripts are replaced by `db:generate`
    and `db:migrate:local|remote`.
  - Redeployed, and verified sign-up, the gate and the forged-`Origin`
    refusal on the new schema.
- **Why:** `REQ-D.1`. The domain decisions come from two rounds of questions
  with Raffaele.
- **Decision:** [ADR-0018](./decisions/0018-splitr-domain-model.md)

## 2026-09-24 — D.3: groups, joining, expenses and settlements through D1
- **Type:** added
- **Scope:**
  - `src/lib/groups/{membership,create-group,join-group}.ts`
  - `src/lib/expenses/{expense-feed,balances,group-balances,add-expense}.ts`
  - `src/lib/settlements/{rules,record-settlement}.ts`
  - `src/lib/schemas/{expense,settlement}.ts`
  - `src/lib/{audit,ids,money}.ts`
  - `src/lib/money.test.ts` (new)
  - the group, join, expense and settle pages, actions and forms
  - `src/app/api/groups/[groupId]/settlements/route.ts` (new)
  - `package.json`, `tsconfig.json`, the evidence files, and status docs
- **What:**
  - **The group fixture is replaced by D1 queries**, with the same
    signatures and the same "`null` means 404" contract.
  - **Creating a group** writes the group and the creator's membership in one
    batch. **Joining** goes through a new Server Action that re-checks the
    code. **Adding an expense** writes it and its shares in one batch and
    redirects; the Route Handler now returns 201 with `Location`.
  - **Settlements** check ADR-0018 §2's rule and then write. This is naive by
    design, with the race marked `RACE (REQ-E.1)`. There's a new settle form
    with §6's four outcomes, and a Route Handler for curl evidence.
  - **Balances** now include settlements through one cached
    `getGroupBalances()`, and every read is `cache()`d (O-3). The `[AUDIT]`
    helper is shared and logs `persisted: true` only after the write.
  - **The tests ADR-0012 promised** (`npm test`, `node --test`, no
    dependencies) are written: 11 pass, plus a mutation check.
  - **Verified in two real browsers**, locally and on production (then
    cleaned). The race was reproduced: both concurrent settlements accepted.
  - `REQ-B.4` is promoted to Done, since all four empty states render.
- **Why:** build plan D.3 / `REQ-D.1`. The naive settlement is Raffaele's
  sequencing, E.2's "before".
- **Decision:** [ADR-0018](./decisions/0018-splitr-domain-model.md) (implemented). No new ADR.

## 2026-09-24 — REQ-D.2: KV holds recent expense descriptions, not balances
- **Type:** added
- **Scope:**
  - `src/lib/expenses/recent-descriptions.ts` (new)
  - `add-expense.ts`, the add-expense page and form, `balances.ts` (comment)
  - `wrangler.jsonc` (the `KV` binding)
  - `wiki/decisions/0019-…` (new), with ADR-0018's status note
  - the evidence file, the brief, README, build plan, study guide and handover
- **What:**
  - Created the KV namespace `splitr-hot`. Each group's last 10 distinct
    descriptions are cached under `recent-descriptions:v1:<groupId>` with a
    7-day TTL, and offered through a native `<datalist>`.
  - On a miss, it's rebuilt from D1 and refilled in `ctx.waitUntil`. A write
    deletes the key in `waitUntil`. Any KV error falls through to D1.
  - Proved the miss, hit, loss-and-rebuild and invalidation cases locally, and
    the after-response write in production (then cleaned).
  - The original "balance snapshot" plan is replaced everywhere it appeared,
    including the README diagram (re-rendered).
- **Why:** `REQ-D.2`. Its note says a value that's a correctness bug when
  stale fails the requirement, and a balance is exactly that.
- **Decision:** [ADR-0019](./decisions/0019-kv-holds-recent-descriptions-not-balances.md)

## 2026-09-24 — REQ-D.3: receipt photos straight to R2 via presigned URLs
- **Type:** added
- **Scope:**
  - `src/lib/receipts/receipts.ts` (new)
  - `add-expense.ts`, `schemas/expense.ts`, `expense-feed.ts`
  - the add-expense action and form, the expense detail page
  - `wrangler.jsonc` (the `RECEIPTS` binding with `remote: true`, and the
    `R2_*` vars), `r2-cors.json` (new), `package.json` (`aws4fetch`)
  - `wiki/decisions/0020-…` (new), the evidence file, and status docs
- **What:**
  - A members-only Server Action signs a 5-minute PUT (`aws4fetch`, with
    `allHeaders` so the Content-Type is really pinned) for a server-chosen,
    group-scoped key. The browser uploads straight to R2.
  - On save, the key is checked through the binding (this group's prefix,
    exists, ≤10 MB, an image type). A bad object is deleted; only the key is
    stored.
  - The detail page shows the photo through a 5-minute presigned GET.
  - There's a bucket CORS policy for the deployed origin and the dev ports.
  - Found and fixed: `aws4fetch` signs only `host` by default, so a
    `text/html` PUT was accepted.
  - Verified in a browser locally and on production (then cleaned), with five
    attach attacks refused.
- **Why:** `REQ-D.3`.
- **Decision:** [ADR-0020](./decisions/0020-receipts-via-presigned-r2-urls.md)

## 2026-09-24 — D.6: receipt-reading decisions, and the vision spike (interim)
- **Type:** added
- **Scope:** `wiki/decisions/0021-receipt-reading-approach.md` (new),
  `scripts/vision-spike/` (new, dev-only), `wiki/evidence/D.6-vision-spike.md`
  (new), and status docs. Receipt images are in `.data/receipts/`, which is
  gitignored.
- **What:**
  - Recorded Raffaele's four answers: two Llamas, raw and expanded lines, a
    "Read receipt" button with the total confirmed, and a mix of his receipts
    and SROIE.
  - Accepted Meta's Llama 3.2 licence on his instruction.
  - Took six SROIE (CC-BY-4.0) receipts with published totals and
    hand-labelled their 14 items before any model ran.
  - Built a harness (the same prompt for both models, `temperature: 0`) and
    ran two prompts. v1: Scout 5/6 totals and 14/14 items, Llama 3.2 4/6 and
    13/14. v2: Scout was unchanged, while Llama 3.2 broke into Markdown (3/6
    valid JSON). A GST-summary "Total" fooled both.
- **Why:** build plan D.6 and ADR-0016 §10.
- **Decision:** [ADR-0021](./decisions/0021-receipt-reading-approach.md). The
  model is pending Raffaele's receipts.

## 2026-09-24 — D.6 model chosen: Llama 4 Scout
- **Type:** docs
- **Scope:** `wiki/decisions/0021-receipt-reading-approach.md`, `wiki/todos/STUDY-GUIDE.md`
- **What:** Raffaele chose `@cf/meta/llama-4-scout-17b-16e-instruct`, after a
  pros-and-cons comparison of all six live vision models (two of them
  measured). He declined adding more models to the spike. The ADR records the
  evidence, the deciding factors, the limit of what was compared, and my
  corrected GLM pricing claim.
- **Why:** ADR-0016 §10.
- **Decision:** [ADR-0021](./decisions/0021-receipt-reading-approach.md)

## 2026-09-24 — D.6 "Read receipt" with Llama 4 Scout; REQ-D.5 schema change
- **Type:** added
- **Scope:**
  - `src/db/schema.ts` and `drizzle/0001_line_item_raw_text.sql` (new)
  - `src/lib/receipts/{draft,read-receipt}.ts` (new) and `draft.test.ts` (new)
  - `src/lib/schemas/expense.ts`, `add-expense.ts`, `expense-feed.ts`,
    `categories.ts`, `money.test.ts`
  - the add-expense action and form, the expense detail page
  - `wrangler.jsonc` (the `ai` binding), `README.md`, the evidence files and
    status docs
- **What:**
  - **`REQ-D.5`:** added `line_item.raw_text` in a second generated migration,
    applied locally and remotely, with the first migration untouched.
  - **Reading:** a members-only "Read receipt" action checks the photo, reads
    it through the binding, and calls Scout in JSON mode with a 30-second
    timeout. It narrows the answer into a draft; no total means no draft.
  - **The draft screen:** it fills the description and amount and shows
    editable items with their printed original. Saving is blocked until "I've
    checked the amount" is ticked.
  - **The server enforces the confirmation** (`amountConfirmed`, required when
    line items are sent). Line items are saved in the same batch, and the
    expense page lists them.
  - Two bugs were caught by the browser test and fixed: the gate had landed on
    the wrong element, and `.pick()` fails on a refined schema. There are 9
    new unit tests (20 total).
  - Verified locally and on production (then cleaned, including an orphaned
    photo found by listing R2).
- **Why:** build plan D.6/D.9, `REQ-D.5`, ADR-0021.
- **Decision:** [ADR-0021](./decisions/0021-receipt-reading-approach.md)

## 2026-09-24 — REQ-D.4: semantic search across all groups; binding types made real
- **Type:** added / fixed
- **Scope:**
  - `src/lib/search/{vector-text,index-expense,search}.ts` (new) and
    `vector-text.test.ts` (new)
  - `add-expense.ts`, `src/app/(app)/search/page.tsx`
  - `wrangler.jsonc` (the `VECTORIZE` binding, remote), `cloudflare-globals.d.ts`
    (new), `package.json` (`@cloudflare/workers-types`)
  - `wiki/decisions/0022-…` (new), ADR-0015's status note, the evidence file
    and status docs
- **What:**
  - Created `splitr-search` (768 dimensions, cosine) and a `groupId`
    metadata index, confirmed before any insert.
  - Each saved expense is embedded after the save in `waitUntil`: an item
    vector ("item, at merchant"), or one for an itemless expense. Metadata is
    ids only.
  - `/search` embeds the query, filters by the viewer's current groups with
    `$in` (capped at 50 for the 2 KB filter limit), and re-checks every hit
    in D1. `mode=keyword` gives the comparison.
  - Labelled queries: meaning 11/11, keyword 1/11 (3/11 any-word). Verified in
    production; the index is back to 0.
  - **Fixed:** every Cloudflare binding type had been silently `any` since
    ADR-0015. They're now real types via global aliases of the importable
    workers-types.
  - Fixed a `LIKE` escape that needed an explicit `ESCAPE` clause.
- **Why:** `REQ-D.4`; the coding standard (no `any`).
- **Decision:** [ADR-0022](./decisions/0022-semantic-search-design.md)

## 2026-09-25 — Cluster E core: the GroupLedger Durable Object (REQ-E.1/E.2/E.3/E.5)
- **Type:** added
- **Scope:**
  - `workers/group-ledger/` (new): the Worker `splitr-ledger`, the
    `GroupLedger` DO, `LedgerService` RPC, and its workerd tests
  - `src/lib/settlements/{ledger-contract,record-settlement}.ts`,
    `src/lib/expenses/balance-inputs.ts` (new)
  - the settle action, page, form and Route Handler
  - `wrangler.jsonc` (the `LEDGER` service binding),
    `cloudflare-workers-module.d.ts` (new), `package.json` (`test:ledger`, the
    vitest plugin)
  - `wiki/decisions/0023-…` (new), and the evidence files and status docs
- **What:**
  - Raffaele's four answers: arbitrate (D1 the truth); settlements through
    the DO now, voids and leaving when built; the key minted when the form
    renders; the before recorded, the after live.
  - The DO runs read → `checkSettlement` → insert in `blockConcurrencyWhile`,
    with the idempotency lookup inside it. The 24 h cache holds the exact body
    plus a typed decision (no `JSON.parse`). The alarm evicts and re-arms.
  - The app reaches it only through a typed service binding, and the ledger
    has `workers_dev: false`.
  - Production: one winner in 5/5 rounds (£200, against £280 before), and a
    byte-identical replay.
  - workerd tests (6): the 30-way race fails 6/6 without the lock.
  - Fixed: an exported constant broke workerd; a duplicate `name` column
    misnamed the winner.
  - The Worker size jump (to 83%) was bisected to a third Better Auth route
    chunk, and logged.
- **Why:** `REQ-E.1`, `E.2`, `E.3`, `E.5`, `REQ-P.3`, `REQ-M.8`.
- **Decision:** [ADR-0023](./decisions/0023-group-ledger-arbitrates-settlements.md)

## 2026-09-25 — Handover rewritten for a new session
- **Type:** docs
- **Scope:** `wiki/todos/HANDOVER.md`
- **What:** Rewrote it from the real current state. The body still claimed
  uncommitted Cluster C work, non-persisting expenses, a membership fixture,
  REQ-B.4 open, "next is C.6", ~69% size and a removed `db:local` script.
  Added the Cloudflare resources and secret names, the files a fresh machine
  must recreate, the two-process local dev, that local dev writes to real
  R2/Vectorize/AI, deploy order and the wait after a deploy, Raffaele's owed
  decisions, and the lost verification scripts, with the patterns to recreate
  them and the cleanup recipe.
- **Why:** Raffaele asked whether everything is documented to resume in
  another session. It wasn't, until this.
- **Decision:** none

## 2026-09-25 — CI/CD plan (ADR-0024)
- **Type:** docs
- **Scope:** `wiki/decisions/0024-ci-cd-github-actions.md` (new), `wiki/decisions/README.md`,
  `wiki/todos/{HANDOVER,STUDY-GUIDE,backlog}.md`
- **What:** Raffaele's four answers: GitHub Actions + wrangler, production
  only, PRs with required checks, smoke tests per deploy plus a nightly E2E.
  The plan:
  - `ci.yml`: types, lint, 29 tests, build and a size budget (fail above
    2,900 KiB);
  - `deploy.yml`: ledger → D1 migrations → app → wait → smoke tests with
    cleanup;
  - `e2e-nightly.yml`;
  - `scripts/verify/*` re-created in the repo.

  It records the split of work (the account settings and the `CLAUDE.md` §6
  amendment are Raffaele's) and a 5-step rollout.
- **Why:** Raffaele's request. It's beyond the course requirements, and
  recorded as such.
- **Decision:** [ADR-0024](./decisions/0024-ci-cd-github-actions.md)

## 2026-09-25 — Handover: the entry point for the next session
- **Type:** docs
- **Scope:** `wiki/todos/HANDOVER.md`
- **What:** Added a "▶ Start the new session here" section: the two
  unanswered questions (approving the exact `CLAUDE.md` §6 wording for the PR
  flow, and whether to start CI rollout step 1), the rule to keep until he
  answers, the default order of work, a one-paragraph summary of the CI/CD
  plan, and Raffaele's account-settings checklist. The stale "last commit"
  hash is replaced by `git log`.
- **Why:** Raffaele is continuing in a new session.
- **Decision:** none

## 2026-09-25 — CLAUDE.md §6: agents push branches, Raffaele merges
- **Type:** changed
- **Scope:** `CLAUDE.md` §6
- **What:** Agents may now push **feature branches** to `origin`. Raffaele
  opens and merges PRs, and agents never push to `main`. "Commit and push only
  when he asks" still holds.
- **Why:** The PR flow in ADR-0024. Raffaele approved the exact wording.
- **Decision:** [ADR-0024](./decisions/0024-ci-cd-github-actions.md) (addendum §1)

## 2026-09-25 — CI rollout step 1: the verification scripts
- **Type:** added
- **Scope:** `scripts/verify/{lib,browser,smoke,race,e2e,cleanup}.mjs`,
  `scripts/verify/fixtures/{make-receipt.mjs,receipt.png}`, `.nvmrc`,
  `package.json` (+ `puppeteer-core` dev dependency), `wiki/evidence/CI-1-verification-scripts.md`
- **What:** The lost scratchpad scripts are back, in the repo:
  - **smoke**: gate, forged `Origin`, a 2-user settle race with one winner, an
    idempotent replay;
  - **race**: the demo's "after";
  - **e2e**: two browsers, including Read receipt and the confirm gate;
  - **cleanup**: D1, KV, R2 and Vectorize, which runs even on failure and
    sweeps `@example.test`.

  All pass against the local stack. **Not yet run against production.**
- **Why:** ADR-0024 rollout step 1.
- **Decision:** [ADR-0024](./decisions/0024-ci-cd-github-actions.md) (addendum §2–6)

## 2026-09-25 — Fixed: the first click below an autofocused field was lost
- **Type:** fixed
- **Scope:** `src/app/(app)/groups/[groupId]/expenses/new/add-expense-form.tsx`,
  `src/app/(app)/groups/new/create-group-form.tsx`, `scripts/verify/e2e.mjs`
- **What:** A blur on a field that's still empty and was never typed in no
  longer shows its error (autofocus isn't a touch). Each field's error line is
  reserved, so an error appearing never moves what's below it. The form gap
  went from `gap-5` to `gap-3`. The E2E's warning is now a failing check.
- **Why:** Found by the E2E. The error appeared between mousedown and mouseup,
  which moved the target 24 px and lost the click ("Choose file" on *Add an
  expense*, "Create group" on *New group*). `screens-cluster-b.md` §7.4
  already said "never validate an untouched field". Raffaele: "I don't want
  any UI issue."
- **Decision:** none (a bug fix within §7.4)

## 2026-09-25 — Swept older local-dev test data from production R2 and Vectorize
- **Type:** changed (data only)
- **Scope:** local D1; production `splitr-search` and `splitr-receipts`
- **What:** `node scripts/verify/cleanup.mjs http://localhost:3100` removed
  3 test users, 4 groups, 49 expenses, 71 vectors and 4 receipt photos left
  by earlier sessions. A dry run afterwards: `nothing to remove`.
- **Why:** Raffaele's OK. Local dev writes to the real bucket and index.
- **Decision:** none

## 2026-09-25 — Evidence: smoke passes on production
- **Type:** docs
- **Scope:** `wiki/evidence/CI-1-verification-scripts.md`, `wiki/todos/{backlog,STUDY-GUIDE,HANDOVER}.md`
- **What:** Added Raffaele's production run of `smoke.mjs`: 16/16 checks pass,
  including one winner in the concurrent settle, the forged `Origin` refused,
  and a byte-identical replay. Cleanup leaves 0 rows.
- **Why:** ADR-0024 rollout step 1 asked for a hand run against production.
- **Decision:** none

## 2026-09-25 — CI rollout step 2: `ci.yml`, and a build that needs no credentials
- **Type:** added, fixed
- **Scope:** `.github/workflows/ci.yml`, `scripts/ci/size-budget.mjs`,
  `next.config.ts`, `src/lib/session.ts`, `scripts/verify/e2e.mjs`
- **What:**
  - `ci.yml` runs on PRs and on pushes to `main`: types (app, ledger, ledger
    tests), lint, 29 tests, the OpenNext build and the size budget (fail above
    2,900 KiB, warn above 2,700, written to the job summary).
  - **Fixed:** `next build` no longer runs the dev-only binding proxy, and
    `getSession()` reads the headers before touching D1. The build had needed
    Cloudflare credentials without anyone noticing.
  - The E2E's search poll went from 2 to 5 minutes.
- **Why:** ADR-0024 step 2. The fixes were found by simulating the runner (a
  clean copy, no login).
- **Decision:** [ADR-0024](./decisions/0024-ci-cd-github-actions.md) (step-2 addendum)

## 2026-09-25 — `ci.yml`'s first run: green
- **Type:** docs
- **Scope:** `wiki/todos/{HANDOVER,backlog}.md`
- **What:** PR #2's `ci / checks` passed on `ubuntu-latest` in 1 min 22 s
  (run 36126889551), every step green. The push of `.github/workflows/`
  succeeded, so the credential has the `workflow` scope.
- **Why:** ADR-0024 step 2 asked to watch it go green.
- **Decision:** none

## 2026-09-25 — CI rollout step 4: `deploy.yml`
- **Type:** added, changed
- **Scope:** `.github/workflows/deploy.yml` (new), `.github/workflows/ci.yml`
- **What:**
  - `deploy.yml` runs on a push to `main` and by manual dispatch: `ci.yml` →
    ledger → `d1 migrations apply --remote` → app → wait 20 s → `smoke.mjs`.
    One deploy at a time, never cancelled. The summary records the versions
    that were live before, with the rollback commands if smoke fails.
  - `ci.yml` became reusable and dropped its own push-to-`main` trigger.
- **Why:** ADR-0024 step 4.
- **Decision:** [ADR-0024](./decisions/0024-ci-cd-github-actions.md) (step-4 addendum)

## 2026-09-25 — deploy.yml: a credentials preflight with readable errors
- **Type:** changed
- **Scope:** `.github/workflows/deploy.yml`
- **What:** A "Check the deploy credentials" step (both secrets present, the
  token accepted by `wrangler whoami`). Wrangler failures in the preflight and
  in "Record the live versions" now surface as `::error::` annotations carrying
  wrangler's error codes.
- **Why:** The first deploy run (36134011199) failed at its first `wrangler`
  call, with nothing changed, but only "exit code 1" was visible outside the
  log.
- **Decision:** [ADR-0024](./decisions/0024-ci-cd-github-actions.md) (step-4 first-run note)
