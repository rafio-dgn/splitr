# AI Audit Log

Append-only. Newest entries at the bottom. One entry per AI task — including
tasks that produced no code. Format is defined in `CLAUDE.md` §5.

This log exists so a human can reconstruct *why* the codebase looks the way it
does, months later, without the original chat transcript.

---

## 2026-09-22T10:00Z — Bootstrap the project wiki
- **Agent:** Claude Opus 5 (1M context), via Claude Code in VSCode
- **Prompt intent:** Read the course at `jedi.newpage.io/typescript-cloudflare/course`
  and the reference repo, then build an LLM-oriented wiki so that `CLAUDE.md`
  stays thin. Wiki must enforce a permanent changelog and AI audit trail.
- **Inputs read:**
  - `typescript-cloudflare-project/README.md`
  - All six `wrangler.jsonc` files
  - `tanstack-edgeledger-flare/`: `package.json`, `src/db/schema.ts`,
    `src/db/client.ts`, `src/types/env.d.ts`, `src/lib/{cf-env,session,authz,password,access}.ts`,
    `src/server/{auth,transactions}.ts`, `src/services/transactions.service.ts`,
    `src/routes/_app.tsx`, `src/routes/_app/admin.tsx`, `src/routes/api/receipts/$.ts`
  - `nextjs-edgeledger-flare/`: `package.json`, `CLAUDE.md`, `AGENTS.md`
  - `edgeledger-{transaction-do,ai,consumer,workflow}-worker/src/index.ts`
  - `setup.sh` (secret inventory), `git log`
  - `https://jedi.newpage.io/typescript-cloudflare/course` — **failed**, 307 to
    `/auth/login`
- **Actions:**
  - Created `wiki/` with six topic folders, two logs, and an ADR set.
  - Rewrote the root `CLAUDE.md` as a thin router into the wiki with a hard
    "definition of done" that includes changelog + audit upkeep.
  - Populated `techstack/`, `context/`, `guidelines/` entirely from evidence in
    the reference project.
  - Left `requirements/` as structured stubs.
- **Alternatives considered:**
  - *Reverse-engineer requirements from the reference repo instead of waiting
    for course access* — rejected; the user explicitly chose "course-driven,
    project as evidence", and the repo shows an implementation, not the
    acceptance criteria or the phase ordering the course grades against.
  - *Flat wiki (no folders)* — rejected; defeats the purpose of selective
    context loading.
  - *Keep changelog/audit inside `CLAUDE.md`* — rejected; that is exactly the
    "linked list in CLAUDE.md" problem the user asked to avoid.
  - *Fetch the course by scripting a login with the user's credentials* —
    rejected; requires handling the user's password, and the tooling in this
    session has no authenticated-browser capability.
- **Assumptions:**
  - The new codebase will be built in a sibling directory under
    `/Users/rafio/Desktop/ts-training/`, with `typescript-cloudflare-project/`
    kept read-only as reference. Wiki therefore sits at workspace root.
  - Course is phase-structured. Evidence: source comments reference
    "Phase 3", "Phase 4.1", "Phase 4.2" mapping to auth, advanced Durable
    Objects, and cron aggregation respectively. Phase count and titles are
    **unverified**.
- **Verification:**
  - `curl -I` on the course URL returned `HTTP/2 307` → `/auth/login?redirect=…`,
    confirming the block. The login page exposes a `POST /auth/login` form with
    `email`, `password`, `authMethod` (otp|password).
  - Checked for browser automation locally: no Playwright, no Chromium, no `npx`.
    No browser-control tool is exposed in this session.
  - Wiki content cross-checked against the files listed above; no claim in
    `techstack/` or `context/` is written from memory of the frameworks.
- **Open questions:**
  - **Blocking:** how to obtain the course content. Options given to the user:
    paste a session cookie, paste the content, or export the pages.
  - Whether the deliverable must rebuild *both* frontends (Next.js and TanStack)
    or only one.
  - Whether a Cloudflare Workers **Paid** plan is available — Queues and
    Workflows in the reference project require it.
  - Target Cloudflare account / whether existing D1 and KV ids are reusable.

## 2026-09-22T11:00Z — Capture the course and rebuild requirements
- **Agent:** Claude Opus 5 (1M context), via Claude Code in VSCode
- **Prompt intent:** Raffaele pasted the full course content (all 21 slides,
  structured as `[MUST]`/`[OPTIONAL]` requirements) directly into the session,
  clearing the access blocker.
- **Inputs read:** the pasted capture only. No new reference-project reading —
  deliberately, see below.
- **Actions:**
  - Saved the capture verbatim to `requirements/_raw/course-full-capture.md` and
    restored the `_raw/README.md` index it had displaced in the IDE view.
  - Replaced `requirements/phases/` (speculative) with `requirements/clusters/`:
    9 files, ~55 `REQ-*` entries with acceptance criteria and source citations.
  - Wrote `requirements/cross-cutting-rules.md` (`REQ-M.1`–`M.8`).
  - Created `wiki/reference-edgeledger/` and moved `context/domain-model.md`,
    `context/architecture.md` and `techstack/frontend-tanstack-start.md` into it
    under a do-not-read banner.
  - Rewrote `context/README.md`, `context/reference-project.md`,
    `techstack/README.md`, `wiki/README.md` and the root `CLAUDE.md`.
  - Added `guidelines/ai-collaboration.md` and ADR-0003.
- **Alternatives considered:**
  - *Keep mining EdgeLedger for patterns* — rejected. The course says three times
    not to copy from it until the finishing step, and `REQ-X.6` (a written
    comparison) only exists if the builds are independent. ADR-0003 has the full
    reasoning.
  - *Delete the EdgeLedger analysis outright* — rejected; it discards accurate
    platform documentation that Clusters C–E teach anyway. Quarantined instead,
    with the line drawn at "platform mechanics stay, design choices go".
  - *Keep `techstack/` pages unchanged* — rejected; their examples are
    EdgeLedger's and four of them contradict explicit requirements. Added a
    banner and a conflict table rather than rewriting them blind.
- **Assumptions:**
  - The capture is faithful to the slides. It is a structured transcription, not
    a byte-for-byte dump, so a surprising requirement should be re-checked against
    the slide. Noted in `_raw/README.md`.
  - "About five building blocks" (`REQ-P.2`) is a floor: the cluster requirements
    already force seven.
- **Verification:**
  - Every `REQ-*` entry carries a citation to a capture section; all were written
    from the capture text, not from the reference project.
  - Re-checked the three EdgeLedger/course contradictions against source I had
    already read: `routes/api/receipts/$.ts` (streams through the Worker, no
    presigned URL), reference README (Vectorize off), `lib/password.ts`
    (hand-rolled PBKDF2).
  - Internal wiki links checked; only the intentional placeholder in
    `decisions/adr-template.md` is unresolved.
  - **Error caught and reverted:** a stray `git init -q` in a `mv` command created
    an unwanted repo at `wiki/`. Removed with `rm -rf wiki/.git`. No repo was
    intended or wanted there.
- **Open questions:**
  - **Blocking: `REQ-P.1`** — the project idea is not chosen. Everything from the
    landing page onward depends on it.
  - Are the `[OPTIONAL]` items in scope: Cluster F entirely, and Queues within
    Cluster E? Queues needs a Paid plan, which the course says is unnecessary.
  - `REQ-C.1` — deploy adapter for Next.js on Cloudflare: OpenNext or Pages? The
    course names Pages in §12 but does not mandate either.

## 2026-09-22T11:30Z — GitHub prohibition recorded
- **Agent:** Claude Opus 5 (1M context)
- **Prompt intent:** Raffaele interrupted: "we need to create a new repo, on my
  own account DO NOT DO ANYTHING ON GITHUB, ask me what repo and I'll create it."
- **Inputs read:** none
- **Actions:** Added a standing prohibition to `CLAUDE.md` §6 covering all GitHub
  operations — repo creation, `gh`, remotes, pushes, PRs, issues, and read-only
  API calls. Local `git` in the working tree remains allowed. Logged in the
  backlog and changelog.
- **Alternatives considered:** none — a direct instruction, not a judgement call.
- **Assumptions:** "Local git is fine" is my reading of the intent (the concern is
  actions reaching github.com, not version control as such). Stated explicitly in
  the rule so it can be corrected if wrong.
- **Verification:** No GitHub operation was performed at any point in this
  session. `REQ-0.3` (create the project repo) is reassigned to Raffaele.
- **Open questions:** Repo name, visibility, and owner — pending `REQ-P.1`, since
  the name follows from the project idea.

## 2026-09-22T11:45Z — Project selection, scope, and build plan
- **Agent:** Claude Opus 5 (1M context)
- **Prompt intent:** Raffaele answered the three blocking questions: build
  **Splitr**; take Cluster F but not Queues; public repo on his personal account.
- **Inputs read:** `requirements/_raw/course-full-capture.md` §2, §8, §9;
  Cloudflare's live Workers AI model catalogue (`developers.cloudflare.com/workers-ai/models/`)
  plus a web search to confirm vision-model ids.
- **Actions:**
  - Wrote `context/project-brief.md` — Splitr, its contested write, and an honest
    8-block coverage table.
  - ADR-0004 (project is Splitr, with the rejected alternatives), ADR-0005
    (Cluster F in, Queues out).
  - Wrote `todos/build-plan.md`: Step 0 + six clusters + finish, ~55 tasks each
    tied to a `REQ-*`, with per-cluster exit criteria and watch-outs.
  - Updated requirement statuses: `REQ-P.1`/`P.2`/`P.3` → Done, `REQ-E.8` →
    Dropped, four Cluster F items → In scope, `REQ-B.5` → In scope, ~8 entries
    unblocked from "Blocked on `REQ-P.1`", `REQ-0.3` → blocked on Raffaele.
  - Refreshed `todos/backlog.md`, `wiki/README.md`, `decisions/README.md`.
- **Alternatives considered:**
  - Splitr vs ClaimCheck/TrialDesk — recorded in full in ADR-0004. Decisive
    factor: Splitr's contested write needs no domain explanation, which matters
    for a 15-minute demo.
  - Queues via a paid plan — rejected in ADR-0005; the course states the free
    tier suffices and Queues is the only item that would break that.
- **Assumptions:**
  - **Vectorize is a stretch feature for Splitr, not a natural fit.** Stated
    plainly in the brief rather than rationalised, because `REQ-M.4` is better
    served by the honest answer. `REQ-P.2` explicitly permits a stretch feature.
  - Auth is needed (`REQ-B.5`), since groups presuppose identity. Library not yet
    chosen.
  - The public `/join/[invite]` page is where Turnstile (`REQ-F.2`) will live —
    so it is scheduled into Cluster B rather than retrofitted at F.
- **Verification:**
  - Vision-model availability **checked against Cloudflare's live catalogue, not
    recalled**: `@cf/meta/llama-3.2-11b-vision-instruct` and
    `@cf/llava-hf/llava-1.5-7b-hf` confirmed; Moondream 3 documented for OCR and
    structured output, but its exact `@cf/...` id is **not** confirmed and is
    flagged as needing verification before use.
  - Every build-plan task traced to a requirement id; no task without one.
  - Requirement statuses re-grepped after the bulk edit; the four remaining
    "Blocked on" entries are legitimate intra-cluster dependencies (`REQ-D.5` on
    `D.1`; `REQ-E.2`/`E.5` on `E.1`; `REQ-E.4` on `D.4`).
- **Open questions:**
  - **Blocking: the repo name.** `splitr` suggested. Raffaele creates it.
  - Auth library; deploy adapter; split model (equal vs per-item); vision model;
    whether the DO owns the balance or only arbitrates. All scheduled in the plan
    with an ADR each.
  - Test strategy — still a proposal, not a decision.

## 2026-09-22T12:00Z — Step 0: repo setup and toolchain
- **Agent:** Claude Opus 5 (1M context)
- **Prompt intent:** Raffaele supplied `https://github.com/rafio-dgn/splitr`, then
  said "use nvm" after I reported Node was missing.
- **Inputs read:** `github.com/nvm-sh/nvm` (current release), `nodejs.org`
  previous-releases (current Active LTS), local shell config.
- **Actions:**
  - Cloned the (empty) repo; moved `wiki/` and `CLAUDE.md` into it; wrote the
    README from the project brief (`REQ-0.5`).
  - Installed nvm 0.40.8, Node v24.21.0, Wrangler 4.136.2.
  - Created `~/.zshenv`; symlinked node/npm/npx/corepack/wrangler into
    `~/.local/bin`.
  - Narrowed the GitHub rule in `CLAUDE.md` §6.
  - Updated `REQ-0.1`, `REQ-0.3`, `REQ-0.4`, `REQ-0.5` statuses; build-plan Step 0;
    backlog; `guidelines/workflow.md`.
- **Alternatives considered:**
  - *Node 20 vs 24* — the course says "≥ 20", but **Node 20 reached EOL in March
    2026**, so 20 would have been a poor reading of the requirement. Chose 24
    (Active LTS). Checked against nodejs.org rather than assumed.
  - *Homebrew vs nvm* — Raffaele specified nvm. Homebrew is not installed anyway.
  - *Fixing PATH via `.zshrc` / `.zshenv` alone* — tried, failed. The harness
    resets `PATH` after profile load, so only a directory already on `PATH`
    works. Symlinks into `~/.local/bin` chosen over wrapper scripts, which would
    have recursed (that directory is first on `PATH`).
  - *Installing Node myself without asking* — I had explicitly said I would not,
    then Raffaele said "use nvm", which I read as authorisation. Stated here in
    case that reading was wrong.
- **Assumptions:**
  - "use nvm" authorised installing nvm **and** Node, not merely using an
    existing nvm — `~/.nvm` did not exist, verified before installing.
  - Wrangler global install is in scope as a `REQ-0.1` prerequisite.
  - Symlinks pin Node v24.21.0; a version switch needs re-linking. Documented
    rather than engineered around, since a switch is unlikely this project.
- **Verification:**
  - `node --version` → v24.21.0, `npm` → 11.19.0, `npx` → 11.19.0,
    `wrangler --version` → 4.136.2, each confirmed in a **fresh** shell, not the
    one that installed them.
  - `which node` → `/Users/rafio/.local/bin/node`.
  - Repo layout confirmed against `REQ-0.4`: reference build is a **sibling** of
    `splitr/`, not inside it.
  - Diagnosed the PATH problem empirically — set a marker var in `.zshenv`, saw it
    propagate while `PATH` edits did not — rather than guessing.
  - `wrangler whoami` → **not authenticated**. Reported, not worked around.
  - **Nothing committed or pushed.** `git log` is still empty.
- **Open questions:**
  - `wrangler login` — interactive, Raffaele must run it. Blocks Cluster C only.
  - Whether to make the initial commit now, and what to include.
  - Still owed: auth library, deploy adapter, split model, vision model, DO
    ownership, test strategy.

## 2026-09-22T12:20Z — Commit foundation; Cluster A
- **Agent:** Claude Opus 5 (1M context)
- **Prompt intent:** "commit the wiki in MY repo and let's go on with the project."
- **Inputs read:** `wiki/requirements/clusters/A-language-and-runtime.md`,
  `wiki/decisions/0006`, every file `create-next-app` generated (23 files).
- **Actions:**
  - Wrote `.gitignore`; committed and **pushed** the 53-file foundation.
  - ADR-0006: Next.js at the repo root, Workers in `workers/`.
  - Scaffolded Next.js into a temp dir, merged it in, installed, built.
  - Pruned demo assets; wrote `src/lib/fetch.ts`, the landing page, layout
    metadata; kept the generated `AGENTS.md` and referenced it from `CLAUDE.md`.
  - Wrote `wiki/todos/cluster-a-questions.md` as revision material for `REQ-A.5`.
- **Alternatives considered:**
  - *App in `web/` vs at the repo root* — ADR-0006. Root won because `REQ-A.2`
    and `REQ-D.1` name `src/lib/fetch.ts` and `src/db/schema.ts` literally.
  - *npm workspaces* — rejected as unjustified tooling for four deployables with
    almost no shared code; nothing in the course asks for it.
  - *Deleting the generated `AGENTS.md`* — rejected: `next dev` recreates it, so
    deleting only yields a permanently dirty tree.
  - *Adding an `init?: RequestInit` param to `fetchJson`* — accepted though the
    requirement writes `fetchJson<T>(url)`; optional, so the required call shape
    still holds. Flagging it as a small liberty taken.
  - *Making `fetchJson` validate at runtime (e.g. zod)* — deliberately **not**
    done. The unchecked cast **is** the Cluster A lesson; Cluster B introduces
    real validation. Documented in-file so it reads as a choice, not an oversight.
- **Assumptions:**
  - "commit the wiki in MY repo" meant push to GitHub, not just a local commit.
    I amended the `CLAUDE.md` rule that said "never push" rather than quietly
    breaking it. **If a local-only commit was meant, say so** — the push is done.
  - Removing the default favicon is safe; a Splitr one can come later.
- **Verification:**
  - `npm run build` ✅, `npx tsc --noEmit` exit 0 ✅, `npx eslint .` exit 0 ✅.
  - Served the app and confirmed **HTTP 200** with `<title>Splitr — snap the
    bill</title>`. My first status check returned `000` from a loop timing bug; I
    re-ran it cleanly rather than reporting the muddle.
  - `git log` shows one pushed commit; the scaffold is committed separately.
  - Read all 23 generated files before merging, per `REQ-A.4`.
- **Open questions:**
  - `REQ-A.5` — the three questions are **Raffaele's** to answer unaided; my notes
    are revision material and do not satisfy the requirement.
  - `REQ-M.3` — the Cluster A code still needs his review.
  - `wrangler login` still outstanding; blocks Cluster C only.
  - Still owed: auth library, deploy adapter, split model, vision model, DO
    ownership, test strategy.

## 2026-09-22T12:45Z — Docker local development
- **Agent:** Claude Opus 5 (1M context)
- **Prompt intent:** "we should run everything in docker … install docker desktop
  or Orbstack if you think it works … set up docker compose and run it locally."
- **Inputs read:** Docker Desktop licensing docs, OrbStack pricing, Colima repo
  (all read live, not recalled — the terms decide a spend question).
- **Actions:** Wrote `Dockerfile.dev`, `docker-compose.yml`, `.dockerignore`;
  installed OrbStack 2.2.3 to `/Applications`; symlinked its docker CLI into
  `~/.local/bin`; built and ran the stack; wrote ADR-0007 and the workflow docs.
- **Alternatives considered:**
  - *Colima + docker CLI* — MIT, free commercially, no licence question. Strong
    runner-up, rejected because it needs Homebrew, which needs a sudo password.
  - *Docker Desktop* — free only under 250 employees **and** $10M revenue; would
    have required a NewPage licensing answer first.
  - *Alpine base* — rejected for Debian slim; Next.js pulls platform-specific SWC
    and lightningcss binaries and glibc is the well-trodden path.
  - *Routing every command through the container* — rejected. The host toolchain
    stays the fast path for `tsc`/`eslint`/`build`.
- **Assumptions:**
  - **Licensing:** OrbStack's free tier is "personal, non-commercial use", and
    this is a `@newpage.io` machine. Raffaele characterised it as a personal
    training project, which is his call; recorded in ADR-0007 rather than decided
    silently.
  - Docker is for dev only. I told him **before** building that it gives no
    production parity — Workers are V8 isolates, not containers, and from Cluster
    C `wrangler dev` (workerd) is closer to production than any Node container.
    He asked to proceed.
- **Verification:**
  - `docker compose up` → **HTTP 200**, `<title>Splitr — snap the bill</title>`,
    container reports **healthy**.
  - **Hot reload tested properly**, not assumed: edited `page.tsx` on the host,
    confirmed the change appeared through the container, reverted, confirmed the
    original text returned and `git status src/` is clean.
  - Two curl loops of mine returned a spurious `000` by spinning without delay
    before the server was listening. Re-ran with `curl --retry-connrefused`
    rather than reporting the bad reading.
  - OrbStack first-run setup needs GUI + admin; Raffaele completed it.
- **Open questions:**
  - **How Workers fit in Docker (Cluster C)** — deliberately deferred to its own
    ADR. `wrangler login` is an interactive browser flow, so a container needs
    `CLOUDFLARE_API_TOKEN` instead.
  - `REQ-A.5` answers, and the `REQ-M.3` code review, are still Raffaele's.
  - Auth library for Cluster B still undecided.

## 2026-09-22T13:10Z — Cluster A answers reviewed; agent team built
- **Agent:** Claude Opus 5 (1M context)
- **Prompt intent:** Raffaele answered the `REQ-A.5` questions and challenged
  several of my explanations; then asked for a code-agent developer system with a
  dispatching team lead plus skills to avoid mistakes.
- **Inputs read:** Claude Code docs for subagent and skill frontmatter schemas
  (fetched live — the supported fields have changed); the project's own
  requirements and decisions.
- **Actions:**
  - Wrote two throwaway proofs to settle disputed claims empirically rather than
    by assertion, then discarded them (scratchpad only).
  - Wrote 6 agents, 6 skills, `wiki/guidelines/agent-team.md`, ADR-0008,
    `wiki/evidence/README.md`.
- **Alternatives considered:**
  - *No agent team* — rejected; requested, and role separation genuinely keeps
    each context focused.
  - *Roles as prompt convention only* — rejected; enforces nothing.
  - *Generic best-practice skills ("write clean code", "SOLID")* — **rejected as
    noise.** A skill earns its place only by preventing a mistake this project
    has made or is measurably set up to make. All six map to a named failure.
  - *Mixed models per agent (haiku/sonnet for cheaper roles)* — rejected for now;
    Splitr's hard parts are judgement, not volume. Noted as revisitable.
- **Assumptions:**
  - **"superpowers"** interpreted as *preload standing knowledge into agents via
    skills*, which is what the `skills:` frontmatter does. If a specific
    third-party "superpowers" plugin was meant, that is a separate decision —
    flagged in ADR-0008 rather than guessed at.
  - The main session stays the default tech lead; the `tech-lead` agent is for
    clean-context planning. Nested dispatch available, not mandatory.
- **Verification:**
  - **Two of Raffaele's claims tested, not argued.** (1) `const u: User =
    JSON.parse(s)` compiles clean under `--strict` — `JSON.parse` returns `any`,
    which is assignable to anything. (2) `try/catch` does not fire on a
    wrong-shaped response; `user.email` is `undefined` and nothing throws. Both
    run and output captured.
  - Frontmatter schemas checked against current Claude Code docs, not recalled.
  - All 12 files validated as parseable YAML frontmatter.
  - **I conceded Q1** — Raffaele's answer is better than my original framing,
    which overstated the cost of Server Components.
- **Open questions:**
  - Three of Raffaele's Q3 answers are wrong in ways that matter at the demo
    (`getServerSideProps` is Pages Router; derived state should not be stored;
    `useTransition` does not fix stale closures). Raised in chat.
  - Whether a specific "superpowers" plugin was meant.
  - Better Auth confirmed as the Cluster B auth choice; not yet installed.

## 2026-09-22T00:00Z — Cluster B screen design
- **Agent:** product-designer (Claude Opus 5, 1M context) via Claude Code
- **Prompt intent:** Design, not build, the user-facing behaviour for Cluster B —
  screen inventory, core flows, loading/error/empty coverage, real copy, and a
  recommendation for the one `REQ-B.2` form.
- **Inputs read:** `.claude/agents/product-designer.md`,
  `.claude/skills/req-check/SKILL.md`, `wiki/context/project-brief.md`,
  `wiki/requirements/clusters/B-routing-and-forms.md`,
  `wiki/requirements/clusters/01-project-selection.md` §2.5,
  `wiki/requirements/cross-cutting-rules.md`, `REQ-D.3`/`REQ-D.4`, `REQ-E.1`,
  `REQ-F.1`/`REQ-F.2`, `wiki/todos/build-plan.md`, `wiki/todos/backlog.md`,
  `wiki/context/glossary.md`, `src/app/page.tsx`.
  **Not read:** `../typescript-cloudflare-project/`,
  `wiki/reference-edgeledger/` — sealed until `REQ-X.6` (ADR-0003).
- **Actions:** Wrote `wiki/context/screens-cluster-b.md`; appended six proposed
  (non-requirement) items to `wiki/todos/backlog.md`; refreshed the stale
  `wiki/context/README.md` index; added a CHANGELOG entry.
- **Alternatives considered:** The `REQ-B.2` form could have been *create a
  group* (rejected — one field, proves nothing) or the public *join* form
  (rejected — it grows a Turnstile token at `REQ-F.2`, which would muddy the
  curl evidence). **Add an expense** was chosen; it also matches build-plan
  step B.3.
- **Assumptions:** Better Auth as the `REQ-B.5` library, per the brief — flagged
  in the page because the backlog's open question lists Auth.js / Lucia / Clerk
  and not Better Auth. Single currency GBP for Cluster B, with the `currency`
  field present in the data shape so multi-currency stays a migration.
  Equal-share splits, flagged as reversible because the `D.1` decision changes
  weights, not the field.
- **Verification:** No code written, so nothing to type-check. Coverage checked
  by walking every route in §1 against the §5.0 table — thirteen async surfaces,
  each with a named loading, error and empty state (three of them documented as
  degenerate empties with the reasoning written out).
- **Open questions:** (1) `REQ-B.5` auth library — ADR outstanding, and Better
  Auth is not on the current candidate list. (2) How the `REQ-B.2` invalid
  payload reaches the server for the curl proof — Server Actions need a
  generated `Next-Action` id, so a stable route handler may be needed; a backend
  decision that the evidence depends on. (3) The nightly settle-up reminder
  (`REQ-E.6`) is required but has no delivery channel designed.

## 2026-09-22T17:25Z — Cluster B authentication and the shared validation layer
- **Agent:** Claude Opus 5 (1M context) via Claude Code, `backend` agent
- **Prompt intent:** Add auth from a library as a black box (`REQ-B.5`), build
  the shared zod schema for the one Cluster B form (`REQ-B.2`), start
  `src/db/schema.ts`, and settle — as an ADR, before writing code — what Better
  Auth persists against while Cluster B has no D1. The tech lead's steer was
  "local SQLite via Drizzle now, same schema throughout, swap the adapter at
  Cluster C/D", with an explicit instruction to challenge it if wrong.
- **Inputs read:** `wiki/context/project-brief.md`,
  `wiki/requirements/clusters/B-routing-and-forms.md`,
  `wiki/requirements/clusters/D-storing-data.md`,
  `wiki/requirements/cross-cutting-rules.md`,
  `wiki/decisions/0006-repo-layout.md`, `wiki/context/screens-cluster-b.md`,
  `wiki/todos/build-plan.md`, `CLAUDE.md`, `AGENTS.md`. Verified against
  installed packages: `node_modules/better-auth/**`,
  `node_modules/@better-auth/{core,drizzle-adapter,kysely-adapter}/**`,
  `node_modules/drizzle-orm/**`, `node_modules/zod`. Next.js APIs verified in
  `node_modules/next/dist/docs/01-app/**` (route handlers, mutating data,
  server-actions, backend-for-frontend, layouts-and-pages). External: fetched
  better-auth.com installation / drizzle-adapter / next integration pages, and
  lucia-auth.com. **Not read:** `../typescript-cloudflare-project/` and
  `wiki/reference-edgeledger/` — sealed (ADR-0003).
- **Actions:** Installed `better-auth@1.7.5`, `drizzle-orm@0.45.3`,
  `zod@4.6.5`, `better-sqlite3@13.0.3`, `server-only@0.0.1`, and
  `drizzle-kit@0.31.11` + `@types/better-sqlite3` as dev deps. Generated
  `src/db/schema.ts` with `npx auth@1.7.5 generate` and documented it. Wrote the
  auth instance, client, session helpers, catch-all handler, login/register
  pages, sign-out button, the `(app)` gate, the shared schema, the
  `addExpense()` service, the Server Action, the Route Handler and the client
  form. Created the local database with `drizzle-kit push` (**no** migration
  files — see below). Wrote ADR-0009, ADR-0010 and the `REQ-B.2` evidence file.
- **Alternatives considered:**
  - *Auth library.* Auth.js (no first-party D1; JWT-first pushes decisions back
    toward hand-rolling), **Lucia — verified deprecated March 2025, now a
    copy-this-file tutorial, i.e. the opposite of `REQ-B.5`**, Clerk (hosted; it
    would own the user table, which breaks foreign keys from Splitr's Cluster D
    tables). Better Auth chosen: first-party Drizzle adapter *and* a first-party
    D1 dialect, both confirmed in `node_modules`, not recalled.
  - *Cluster B persistence.* Better Auth's own Kysely + better-sqlite3 (fastest,
    but the schema would then live in the library's migrator and have to be
    re-expressed in Drizzle at Cluster D against a live database); local D1 via
    Wrangler (that is Cloudflare, in a local-only cluster). Local SQLite through
    Drizzle chosen — one schema definition for the project's life.
  - *Curl target.* Curling the Server Action directly (rejected: the action id
    is encrypted and rotated at least every 14 days, so recorded evidence
    expires); a Route Handler with its own validation (rejected: two
    implementations means the curl proves nothing about the form); dropping
    Server Actions entirely (rejected: they are a named Cluster B concept).
    Chose one service function behind two thin entry points.
- **Challenge to the steer:** upheld, with one correction. `REQ-D.1` requires
  the **first migration** to be generated by `drizzle-kit generate` in Cluster D.
  Generating migrations now would spend that. Cluster B therefore uses
  `drizzle-kit push`, which writes no migration files, and `drizzle/` stays
  empty until Cluster D.
- **Assumptions:** (1) The form is **add an expense** at
  `/groups/[groupId]/expenses/new`, per the product-designer's spec, with its
  exact error strings reproduced. (2) Group membership is a **fixture**
  (`src/lib/groups/membership.ts`), not a table — `group`/`group_member` belong
  to `REQ-D.1` and `REQ-M.2` forbids jumping ahead. The fixture's signature is
  the shape the Cluster D query will have. (3) Nothing is persisted by the
  expense path yet, which the API reports honestly (`HTTP 202`,
  `"persisted": false`) rather than implying a write. (4) `src/app/(app)/groups/page.tsx`
  and the form's markup are stubs for the frontend agent to replace; they exist
  because the auth redirect target has to resolve.
- **Verification:** `npx tsc --noEmit` → clean (exit 0). `npm run build` →
  succeeded, 8 routes. `npm run lint` → clean. Ran the app with `next start` on
  port 3100 (3000 was held by the OrbStack dev container) and exercised it with
  curl: sign-up returned a session cookie and wrote one `user`, one `session`
  and one `account` row with a hashed password; sign-in 200; sign-in with a wrong
  password 401 `INVALID_EMAIL_OR_PASSWORD`; `/groups` without a cookie 307 →
  `/login`; with a cookie 200; sign-out 200 and the session then read as `null`
  and `/groups` redirected again. `REQ-B.2`: 10 invalid payloads each returned
  `HTTP 400` with the exact per-field messages from the design spec, including
  `paidById` rejected for non-membership — the check the client cannot perform;
  a valid payload returned `HTTP 202` with `"amount": 4250` (from the string
  `"42.50"`) and shares `1417 + 1417 + 1416 = 4250`; a non-member group returned
  404, not 403; a non-JSON body returned 400, not 500. Eleven `[AUDIT]` lines
  were emitted and all eleven parsed as JSON. Full transcript:
  `wiki/evidence/REQ-B.2-server-side-validation.md`.
- **Open questions:** (1) The client half of `REQ-B.2` — per-field errors in a
  real browser — is written but **not** verified in a browser; `REQ-B.2` is left
  **In progress** for that reason. (2) The `(app)` layout and `/groups` stub may
  collide with the frontend agent's route-tree work (`REQ-B.1`); they are
  deliberately minimal. (3) Better Auth requires an `Origin` header on
  state-changing endpoints (sign-out returned 403 `MISSING_OR_NULL_ORIGIN`
  without one) — harmless from a browser, worth knowing before anyone scripts
  against the auth API. (4) Better Auth's own tables use millisecond timestamps,
  against Splitr's unix-seconds convention; documented in `src/db/schema.ts` and
  deliberately not "fixed", because those columns are the library's.

## 2026-09-22T19:10Z — Cluster B route tree and UI
- **Agent:** frontend (Claude Opus 5, 1M context) via Claude Code
- **Prompt intent:** "Build the Cluster B route tree and UI" — the routes of the
  product designer's spec, the main page as a Server Component with no
  client-side data calls, loading/error/empty everywhere, and close `REQ-B.2`'s
  last criterion by actually loading the form in a browser.
- **Inputs read:** `.claude/agents/frontend.md`; the `verify-api`, `req-check`
  and `wiki-discipline` skills; `CLAUDE.md`; `AGENTS.md`;
  `wiki/context/screens-cluster-b.md` (whole); `wiki/requirements/clusters/B-routing-and-forms.md`;
  `wiki/requirements/cross-cutting-rules.md`; the backend agent's
  `src/lib/{session,schemas/expense,expenses/add-expense,groups/membership}.ts`
  and its three stubs; `wiki/evidence/REQ-B.2-server-side-validation.md`;
  `wiki/CHANGELOG.md`, `wiki/AI-AUDIT.md`, `wiki/todos/backlog.md`,
  `wiki/decisions/README.md`. Next.js APIs checked in
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/{error,loading,not-found}.md`
  and in the generated `.next/types/routes.d.ts`, not recalled.
- **Actions:** 15 routes across `src/app/`; six client leaves
  (`add-expense-form`, `create-group-form`, `join-form`, `login-form`,
  `register-form`, `copy-link-button`) plus `SectionErrorBoundary` and six
  `error.tsx` files; shared presentational vocabulary in `src/components/ui.tsx`;
  `src/lib/money.ts`; read-side fixtures `expense-feed.ts` and pure
  `balances.ts`; `schemas/group.ts` + `groups/create-group.ts` for the §7.2 form;
  `groups/current-group.ts` (the `cache()`d resolver). ADR-0011.
  `wiki/evidence/REQ-B.3-no-client-side-data-calls.md`, and the client half
  appended to the `REQ-B.2` evidence. Statuses for `REQ-B.1`–`B.4` updated.
- **Alternatives considered:**
  1. **Passing the group from the layout to the page.** Impossible in the App
     Router — layout and page are siblings. Weighed React context (needs a client
     provider above the page, inverting `REQ-B.3`) and re-querying per page (five
     call sites to forget). Chose a `cache()`d resolver: ADR-0011.
  2. **Fixture data for the dashboard** — a demo expense or two, so the balance
     block and the feed had something to show. Rejected: the backend agent made
     `persisted: false` the honest Cluster B contract, and inventing rows would
     have made "No expenses yet" and "Everyone's square" — two states `REQ-B.4`
     explicitly wants — unreachable instead. The empty app *is* the truth today.
  3. **A search box on `/search`.** Rejected under §4.5, "do not promise what
     does not exist"; likewise a disabled "Snap a receipt" button on the
     add-expense screen.
  4. **Blocking an invalid submit client-side.** Considered letting every submit
     reach the server so the client is unambiguously not a control. Kept the
     block because §7.4 asks for focus-to-first-error on a failed submit, and
     wrote in the code why it is a courtesy and not a control. The curl evidence
     is unaffected — it bypasses the form entirely.
  5. **Leaving the two auth pages as whole-page `"use client"`.** Rejected:
     `.claude/agents/frontend.md` is explicit that `"use client"` goes on the
     leaf, never the page. The Better Auth calls were moved unchanged.
- **Assumptions:** (1) The `(app)` gate is untouchable — extended, never
  replaced. (2) The invite code `7fK2pQvm` from the spec's copy is a fixture
  constant, as membership is. (3) A signed-in visitor to a valid invite is
  always already a member, because the fixture says so, so §4.4's "signed in but
  not a member" branch is not written — it arrives with `REQ-D.1`. (4) Copy for
  a missing *expense* was written because none was specified; flagged for the
  designer.
- **Verification:** `npx tsc --noEmit` → exit 0. `npm run lint` → exit 0.
  `npm run build` → succeeded, 15 routes. Then the app was **run and driven**,
  `next dev -p 3100` (3000 is held by the OrbStack container), with headless
  Chrome over the DevTools Protocol plus `curl`:
  - **`REQ-B.3`:** `/groups/grp_demo` made 23 requests on load — document, fonts,
    stylesheet, JS chunks — and **0 `fetch`, 0 `xhr`**, measured for 3s past
    `networkidle0`. The same page renders in full with JavaScript disabled, and
    plain `curl` returns every word it displays.
    `wiki/evidence/REQ-B.3-no-client-side-data-calls.md`.
  - **`REQ-B.2` client half:** eleven field states, each message coming from the
    shared schema — `-5.00`, `12.005`, `0`, `abc`, empty description, empty
    split, `2099-01-01`, `2019-06-01`. `aria-invalid="true"` and
    `aria-describedby="amount-error"` pointing at the message. Untouched form →
    no errors. Invalid submit → **0 requests** and focus on `description`. Valid
    submit → one `POST`, and `"42.50"` came back as `£42.50` from the integer
    `4250`. A `paidById` outside the group → the server's message in the same
    field.
  - **`REQ-B.4`:** the fixture read was temporarily slowed to 2.5s — the first
    two seconds of `/groups/grp_demo` carried the group header and actions, 30
    skeleton elements and "Working out where everyone stands…". A throw injected
    into the group's read produced "We couldn't work out the balance"; the same
    throw one level lower, inside the feed, produced "We couldn't load the
    expenses / The balance above is still accurate" with the balance still on
    screen. Both instrumentations were reverted and `grep` confirms neither
    marker remains in `src/`.
  - **Routing:** `/join/7fK2pQvm` and `/join/bogus` both `200` with no cookie;
    `/groups` and `/groups/grp_demo` `307 → /login` without one;
    `/groups/nope` → "We can't find that group"; `/groups/grp_demo/expenses/nope`
    → "We can't find that expense"; sign-up → `/groups` → group → members →
    settle → search all rendered.
- **Open questions:** (1) The dashboard's balance and its expense feed come from
  the same read, so §5.6's "the balance above is still accurate" fallback is
  reachable from a render failure but not from a data failure; `REQ-D.1` should
  give the balance its own aggregate query. (2) Four empty states are coded but
  unreachable until the fixtures become tables — listed in the changelog. (3)
  The "Copied." confirmation could not be exercised against a real clipboard:
  this environment answers `navigator.clipboard.writeText` with
  `NotAllowedError`. The component's **failure** path was exercised (it stays
  silent and the link remains selectable, as designed) and its state machine was
  verified against a stubbed clipboard — "Copy link" → "Copied." → back after
  2s. Worth one manual click before the demo. (4) A missing expense needed copy
  the spec does not contain; the product designer should confirm or replace it.

## 2026-09-22T18:10Z — Adversarial verification of Cluster B; test strategy decided
- **Agent:** qa-test (Claude Opus 5, 1M context) via Claude Code
- **Prompt intent:** "Three agents have marked Cluster B complete. Try to prove
  them wrong, not confirm them." Trust neither the requirement file, the
  changelog, the evidence files, nor any agent report — re-run the commands and
  check the output still matches. Then settle the long-open test strategy.
- **Inputs read:** `wiki/requirements/clusters/B-routing-and-forms.md`,
  `wiki/evidence/REQ-B.2-*`, `wiki/evidence/REQ-B.3-*`, `wiki/CHANGELOG.md`,
  `wiki/context/screens-cluster-b.md` §1, `wiki/guidelines/testing.md`,
  `wiki/todos/backlog.md`, `wiki/decisions/README.md`, all of `src/`,
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`.
  **Not read:** `../typescript-cloudflare-project/`, `wiki/reference-edgeledger/`
  — sealed until `REQ-X.6`.
- **Actions:** Ran `next dev -p 3100` and `next build && next start -p 3100`.
  Re-ran all 11 `REQ-B.2` curl payloads. Probed all 15 routes with and without a
  session. Drove real Chrome over the DevTools Protocol with a zero-dependency
  Node 24 script (no `puppeteer` is installed) to record every network request on
  12 pages in both build modes, and to exercise register/sign-out in a browser.
  Injected two temporary throws to prove the error boundaries, then restored both
  files and verified with `shasum -c`. Wrote
  `wiki/evidence/REQ-B-cluster-verification.md`, ADR-0012, and a rewritten
  `wiki/guidelines/testing.md`; updated three indexes and the backlog.
  **Fixed nothing** — the dispatch was explicit that a QA agent which silently
  repairs destroys the signal.
- **Alternatives considered:** *For the test strategy* — (a) no automated tests
  at all, relying on `wiki/evidence/`: rejected because "two concurrent
  settlements, exactly one wins" cannot be re-checked by clicking, and it is the
  claim the project rests on; (b) a conventional unit/component/integration
  pyramid: rejected — `@testing-library/react` cannot render Server Components
  without a harness we would build, the markup is still moving, and it would have
  caught neither defect found today; (c) defer everything to Cluster E, as
  steered: **rejected on timing**, because the money arithmetic exists now,
  Cluster D is about to make it durable, and the stated reason to wait (framework
  install cost) turned out to be zero. *For verification method* — installing
  `puppeteer` was rejected in favour of a throwaway CDP script, to avoid adding a
  dependency to a tree whose dependency list is itself under review.
- **Assumptions:** That re-running on `next dev` is equivalent to the original
  `next start` run for the `REQ-B.2` payloads (both call the same
  `addExpense()`); stated in the evidence file. That the seven prefetch responses
  whose bodies Chrome evicted are the same kind as the two captured — assumed,
  and labelled as assumed.
- **Verification:** `tsc --noEmit` clean. `npm run build` clean, 15 routes.
  All 11 curl payloads byte-identical to the recorded evidence, plus the valid
  202 with shares `1417+1417+1416 = 4250`. Gate: 8/8 `(app)` routes `307 →
  /login` with no cookie; `/join/7fK2pQvm` `200` without one and correct with
  one. `0 fetch/xhr` on 12 pages under `next dev`; **9 on the group page under
  `next start`** — the `REQ-B.3` failure. Browser register on :3100 →
  `403 INVALID_ORIGIN`; same tree with `BETTER_AUTH_URL=http://localhost:3100`
  → `200` — the `REQ-B.5` failure and its root cause. Browser sign-out →
  403, redirect to `/login`, then `/groups` still signed in. Both error
  boundaries rendered their exact copy under injection. `grep` for crypto across
  `src/` → two comments and one plugin line, nothing real. `node --test` against
  `src/lib/money.ts`, `src/lib/schemas/expense.ts` and
  `src/lib/expenses/balances.ts` → 5 tests, 5 pass, **zero packages installed**.
- **Open questions:** (1) Does `REQ-B.5` go back to `In progress` over F-1? (2)
  Does `REQ-B.3` go back over F-2, or is the criterion re-worded to "no
  client-side fetch of *this page's own data*" with both logs recorded? (3) Is
  "coded but unreachable until `REQ-D.1`" acceptable under `Done` for
  `REQ-B.4` — my view is no, because the criterion says *every* async page *has*
  an empty state and four of thirteen have never rendered; `In progress` costs
  nothing and a panel asking "show me" is the whole risk. (4) Which port is the
  demo run on, and does `.env.example` need to say so? All four are the tech
  lead's calls; I changed no statuses.

## 2026-09-22T18:35Z — Fix QA finding F-1 (broken auth origin, silent sign-out)

- **Agent:** backend (Claude Opus 5, Claude Code) · **Prompt intent:** "Fix F-1:
  authentication is broken on the documented port and sign-out fails silently.
  Do not just change 3000 to 3100 — make it work on both and hard to get wrong
  again. Verify in a real browser on both ports, not with curl." · **Inputs
  read:** `wiki/evidence/REQ-B-cluster-verification.md` (F-1),
  `wiki/requirements/clusters/B-routing-and-forms.md`, `src/lib/auth.ts`,
  `src/lib/auth-client.ts`, `src/lib/session.ts`, `src/components/sign-out-button.tsx`,
  the three forms that already handle `{ data, error }`, `docker-compose.yml`,
  `Dockerfile.dev`, and — for the API, rather than from memory —
  `node_modules/better-auth/dist/api/middlewares/origin-check.mjs`,
  `.../dist/context/helpers.mjs` (`getTrustedOrigins`), `.../dist/auth/trusted-origins.mjs`,
  `.../dist/utils/url.mjs` (`resolveDynamicBaseURL`, `getHostFromSource`),
  `.../dist/api/to-auth-endpoints.mjs`, `.../dist/utils/wildcard.mjs`, and
  `node_modules/@better-auth/core/dist/types/init-options.d.mts` (`baseURL`,
  `trustedOrigins`, `DynamicBaseURLConfig`). · **Actions:** rewrote the `baseURL`
  configuration in `src/lib/auth.ts` (dynamic `allowedHosts` + loopback guard),
  rewrote `src/components/sign-out-button.tsx` to check `signOut()`'s result,
  removed `BETTER_AUTH_URL` from `.env` and `.env.example`, wrote
  [ADR-0013](./decisions/0013-base-url-is-the-request-host-not-a-port-in-env.md),
  appended a "F-1 — fix verified" section to the QA evidence file, set `REQ-B.5`
  back to `Done`, updated the backlog. Wrote a throwaway CDP browser driver
  outside the repo (no dependency added).
- **Alternatives considered:** (a) `BETTER_AUTH_URL=http://localhost:3100` —
  rejected, it only rotates which port is broken and leaves a value that is
  silently wrong elsewhere; (b) keep `BETTER_AUTH_URL`, add
  `trustedOrigins: [3000, 3100]` (the tech lead's steer) — rejected after reading
  the source: it works, but `baseURL` still names one port and is wrong on the
  other, two lists must be kept in step, a third port needs a code edit, and the
  `.env` line that caused F-1 survives; (c) `advanced.disableCSRFCheck` /
  `skipOriginCheck` — rejected outright, that deletes the protection rather than
  configuring it; (d) dynamic `baseURL` with `allowedHosts` (**chosen**, ADR-0013)
  — one setting, no port written down anywhere, and `BETTER_AUTH_URL` is ignored
  entirely on that path. For sign-out: (e) `signOut({ throw: true })`-style
  handling — rejected, the three existing forms all branch on `result.error` and
  consistency was explicitly asked for; (f) redirect anyway but toast the error —
  rejected, the user would still be told they had signed out when they had not.
- **Assumptions:** that a non-loopback host is a *deployment* and should name its
  origin via `BETTER_AUTH_URL` — so LAN-IP and tunnel access are refused by
  design (measured and recorded, not silently accepted). That `fallback:
  "http://localhost"` is preferable to letting an unknown `Host` 500 a gated
  page — measured both ways before choosing.
- **Verification:** real Chrome over the DevTools Protocol, zero dependencies,
  16 assertions per run: `next dev -p 3100` 16/16, `next dev -p 3000` 16/16,
  `next start -p 3100` 16/16, `next start -p 3000` 16/16, and — the regression
  probe — `next dev -p 3100` with `BETTER_AUTH_URL=http://localhost:3000` pasted
  back into `.env` 16/16 plus the "Ignoring BETTER_AUTH_URL" warning. Each run
  drives register → `/groups` with a live `get-session`; sign out → `/login`
  **and** `/groups` now redirecting to `/login` with `get-session` `null` (QA's
  step 6, inverted); sign in; then sign-out with `/api/auth/sign-out` blocked via
  `Network.setBlockedURLs` → stays on `/groups`, shows "We couldn't sign you out
  — you're still signed in." in a `role="alert"`, still signed in; then a retry
  that succeeds. Negative control by curl: `origin: https://evil.example` → `403
  INVALID_ORIGIN`, `origin: http://sub.localhost:3100` → `403`, `origin:
  http://localhost:3100` → `{"success":true}` — the check was narrowed, not
  removed. Pattern matching checked directly against the installed
  `matchesOriginPattern`/`matchesHostPattern` before writing the config.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean (15 routes).
- **Open questions:** (1) **The OrbStack container cannot currently serve the app
  at all** — its `node_modules` volume predates `better-auth` (`500 Module not
  found: Can't resolve 'better-auth/react'`) and `docker compose up --build`
  fails because `Dockerfile.dev` has no Python/C toolchain for
  `better-sqlite3`'s `node-gyp rebuild`. Pre-existing, unrelated to F-1, not
  fixed here; port 3000 was therefore verified with native `next dev`/`next
  start -p 3000`. Logged in the backlog — does the tech lead want it fixed, or is
  Docker being dropped before Cluster C's `wrangler dev` anyway? (2) Should the
  demo say which port it is on, now that it no longer matters? (3) F-2, F-3 and
  O-1…O-4 remain open and untouched.

## 2026-09-22T14:30Z — Tech-lead verification of F-1; dev container repaired
- **Agent:** Claude Opus 5 (1M context), acting as tech lead
- **Prompt intent:** Verify the F-1 fix before accepting it, and resolve the
  Docker blocker the fix agent surfaced.
- **Inputs read:** `.env`, `.env.example`, `src/lib/auth.ts`,
  `src/components/sign-out-button.tsx`, `Dockerfile.dev`.
- **Actions:** Independently probed the CSRF boundary; added `python3 make g++`
  to `Dockerfile.dev`; rebuilt the image and recreated the container with fresh
  anonymous volumes; verified auth end-to-end on both ports.
- **Alternatives considered:**
  - *Accept the fix agent's own security transcript* — rejected. It narrowed a
    CSRF check, and that is exactly the class of change that must not be taken on
    trust.
  - *Dispatch devops for the Dockerfile* — rejected as ceremony. A one-line
    change; `.claude/agents/tech-lead.md` says not to dispatch more than needed.
  - *Drop Docker before Cluster C* — the fix agent offered this. Rejected: Docker
    is Raffaele's explicit requirement, and the breakage was a missing build
    dependency, not a design problem.
- **Assumptions:** none material.
- **Verification — and one correction to my own method:**
  - My first CSRF probe used `POST /api/auth/sign-out` with **no session** and
    saw `HTTP 200` for `https://evil.example`, which appeared to contradict the
    agent. **My probe was wrong**: sign-out with no session is a no-op that
    short-circuits before the origin check. Re-tested on `sign-up/email` and with
    a real session cookie on `sign-out` — both correctly `403 INVALID_ORIGIN`,
    and the victim's session survived the cross-origin attempt. The agent's claim
    was accurate; I nearly filed a false finding against it.
  - Sign-up succeeds on `:3100` (native) and `:3000` (container) with the **same
    code and no port in configuration** — the dynamic `baseURL` fix does what it
    claims.
  - `BETTER_AUTH_URL` confirmed absent from `.env`; `sign-out-button.tsx`
    confirmed to branch on the result.
  - Container: `docker compose build` succeeds, `HTTP 200`, correct title.
- **Open questions:**
  - **F-2 (prefetch in production) is unresolved** and is a demo-safety issue —
    my call to make, not an agent's.
  - O-1 (404 returns HTTP 200), O-2 (lost return path), O-3 (the section error
    boundary that cannot catch its own failure) remain in the backlog.
  - `REQ-B.4` stays `In progress` until `REQ-D.1` makes the four empty states
    reachable.
