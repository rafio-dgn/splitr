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
