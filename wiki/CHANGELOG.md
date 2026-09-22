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
