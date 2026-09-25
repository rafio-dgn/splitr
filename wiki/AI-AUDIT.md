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

## 2026-09-22T15:00Z — Session close and handover
- **Agent:** Claude Opus 5 (1M context), acting as tech lead
- **Prompt intent:** Raffaele is closing the session and asked whether the
  documentation, changelog and AI-audit were kept current.
- **Inputs read:** `git status`/`log`, `wiki/requirements/clusters/B-routing-and-forms.md`,
  `README.md`.
- **Actions:** Audited the paper trail rather than asserting it was fine; found
  and fixed one stale status; wrote `wiki/todos/HANDOVER.md` and linked it from
  `CLAUDE.md` §2 and the wiki index.
- **Alternatives considered:** *Answer "yes, all updated" from memory* — rejected;
  the question deserved a check, and the check found something.
- **Assumptions:** none.
- **Verification:**
  - Working tree **clean**; `HEAD == origin/main` at `8adf547`. Nothing
    uncommitted, nothing unpushed.
  - Counts: 24 changelog entries, 14 audit entries, 13 ADRs, 3 evidence files.
  - **One staleness found:** `README.md` listed Cluster B as "Next" while
    `REQ-B.1`/`B.2`/`B.3`/`B.5` are Done and `B.4` is In progress. Corrected to
    4/6 with the blockers named.
  - Cross-checked the README table against the actual `REQ-B.*` statuses rather
    than against the changelog's account of them.
- **Open questions:** carried into `HANDOVER.md` — `wrangler login`, the agent
  restart, `REQ-A.5`/`REQ-B.6` spoken answers, the F-2 demo decision, and O-1…O-3.

## 2026-09-23T09:15Z — Cluster C: deploy adapter ADR, D1 swap, first deploy (`REQ-C.1`)
- **Agent:** Claude Opus 5 (1M context), then Claude Opus 5.5 (1M context) after a model switch mid-task, acting as tech lead in the main session, with no subagents
- **Prompt intent:** "Let's continue the integration." Raffaele confirmed this
  meant Cluster C. He chose to provision D1 now for the auth tables only, after
  being told `better-sqlite3` can't run on Workers.
- **Inputs read:** `wiki/todos/HANDOVER.md`, `build-plan.md`, `CLAUDE.md`,
  `requirements/clusters/C-workers.md`, ADR-0009, the ADR template and index,
  `src/db/*`, `src/lib/auth.ts`, `session.ts`, the auth route,
  `drizzle.config.ts`, `Dockerfile.dev`, `docker-compose.yml`,
  `wiki/techstack/frontend-nextjs-opennext.md` and `versions.md` (read *after*
  both ADRs, see below). External: the Cloudflare Workers Next.js guide, the
  OpenNext Cloudflare docs and get-started page, and web searches on vinext and
  Pages status. `npm view` for `@opennextjs/cloudflare` and `vinext`. The
  installed `.d.ts` files for `getCloudflareContext` and `toNextJsHandler`.
- **Actions:** Wrote ADR-0014 and ADR-0015. Created D1 `splitr`. Installed
  `@opennextjs/cloudflare@1.20.6` and `wrangler@4.136.3`, and removed
  `better-sqlite3`. Rewrote the DB and auth composition roots to request-scoped
  accessors. Applied the DDL locally and remotely. Set the production secret
  via stdin, never echoed. Deployed three times: once initially, once to add
  `BETTER_AUTH_URL`, and once so the live code matches the tree. Created local
  `.dev.vars` (gitignored). Rebuilt the dev container. Deleted two test users
  from remote D1. Updated the docs listed in the CHANGELOG.
- **Alternatives considered:**
  - Pages (can't host Cluster E) and vinext (beta, replaces the compiler) are
    in ADR-0014.
  - Two drivers (SQLite locally, D1 deployed) were rejected because that's
    F-1's failure pattern.
  - `drizzle-kit push` with `d1-http` was rejected because it needs a second
    credential. `generate` was rejected because it would spend `REQ-D.1`'s
    first migration.
  - A hand-written env bridge file was dropped once
    `--env-interface CloudflareEnv` made it unnecessary.
  - An R2 incremental cache (the OpenNext starter default) was deferred to
    `REQ-D.3` under `REQ-M.2`.
- **Assumptions:**
  - "The integration" meant Cluster C. That was asked and confirmed.
  - `workers_dev: true` and `preview_urls: false` are my choices, recorded in
    `wrangler.jsonc`.
  - `compatibility_date` is set to today.
- **Wrong turns, corrected:**
  1. `wrangler types` with the defaults broke `tsc` through a DOM clash. This
     was confirmed by removing the file, then fixed with
     `--include-runtime=false`.
  2. I assumed Wrangler's local run reads `.env` to override `vars`. The
     preview startup log showed it doesn't, so the override moved to
     `.dev.vars`, and `.env.example` was corrected.
  3. `drizzle-orm/d1`'s `D1Database` isn't a global without runtime types. The
     key type is now derived from `CloudflareEnv["DB"]`.
- **Verification:**
  - `tsc --noEmit` and `eslint` clean. `opennextjs-cloudflare build` gives the
    same 15 routes.
  - Preview, `next dev`, and the container all pass sign-up or sign-in with an
    `Origin` header against local D1.
  - Deployed: landing 200; gate 307 without a session and 200 with one; sign-up
    200; forged `Origin` 403. The pre-fix deploy returned 403 `INVALID_ORIGIN`,
    as predicted.
  - Worker size is 2,123 KiB gzipped of 3 MiB.
- **Seal note:** `wiki/techstack/` pages contain EdgeLedger-derived specifics
  (pinned versions and file descriptions from `nextjs-edgeledger-flare`).
  `CLAUDE.md` §2 routes agents there, so reading them was within the rules, but
  it undercuts ADR-0003. Both of today's ADRs were written before opening them,
  and nothing in them came from there. It's logged as a decision for Raffaele.
- **Open questions:**
  - The `wiki/techstack/` seal question.
  - Nothing is committed. Commit and push are waiting for Raffaele's go-ahead.
  - F-2 can now be re-measured on the real production URL.

## 2026-09-23T10:25Z — C.3: throwaway Worker, secret, curl, tail (`REQ-C.2`)
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session, with no subagents
- **Prompt intent:** "Create the commit with their responsibilities and
  description, push the changes and continue to next step." The commits and
  push were done first. This entry covers the next step, C.3.
- **Inputs read:** ADR-0006 (it names `workers/hello/`), `C-workers.md`,
  `create-cloudflare --help` for the flags and `--type` values, and every
  generated file. I also grepped the generated runtime types for
  `timingSafeEqual`.
- **Actions:**
  - Ran three commits and a push (`18b7c24..ffd60b3`). Two files with changes
    for several commits (the ADR index and the CHANGELOG) were staged per
    commit with `git hash-object` and `update-index`, so each commit carries
    only its own entries.
  - Scaffolded with C3. The first run hung on the new `--agents` prompt; I
    deleted it and re-ran with `--no-agents`.
  - Pruned files, wrote `wrangler.jsonc` and `src/index.ts`, and excluded
    `workers/` from the root `tsc` and ESLint.
  - Tested locally with `wrangler dev`, then deployed.
  - Put the secret from a scratch file via stdin, then curled while tailing.
- **Alternatives considered:**
  - Scaffolding outside the repo was rejected: ADR-0006 already decided
    `workers/hello/`.
  - Keeping the vitest scaffold was rejected under ADR-0012.
  - A secret-free Worker was rejected, because `REQ-C.5` Q4 needs a var and a
    secret side by side.
  - Plain `===` for the key was rejected: it's not constant-time, and
    `timingSafeEqual` is a Workers-specific API worth knowing for Q2.
- **Assumptions:**
  - "Next step" meant C.3 only. I stopped before C.4.
  - The Worker name `splitr-hello` is my choice.
  - `workers/hello/` stays uncommitted until Raffaele asks.
- **Verification:**
  - `tsc --noEmit` is clean in `workers/hello/`, and the root `tsc` and ESLint
    are still clean.
  - Local and deployed: `/` returns 200, `/secret` returns 200 with the right
    key and 401 with a wrong one, `/nope` returns 404.
  - `/secret` returned 500 before `secret put`.
  - Tail captured all four requests.
  - The secret value appears 0 times in the tail output.
- **Open questions:**
  - **`splitr-hello` is live** and has to be torn down at C.5, after C.4
    adds the `ai` binding.
  - The observations for Raffaele's `REQ-X.2` notes are in the evidence file.
    The notes themselves must be his.

## 2026-09-23T11:10Z — AI integration: questions first, then the model problem, then C.4
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session, with no subagents
- **Prompt intent:** "Continue the integration, but before taking any decision
  on how we use the AI and integrate it, check it with me. Make a good round of
  questions, and analyse the requests and the possible integrations."
- **Inputs read:**
  - `REQ-C.3`, `D.3`, `D.4`, `E.4`, `F.4`, `M.7`; the project brief; ADR-0004.
  - The Workers AI JSON-mode docs, the 2026-05-08 planned-deprecations
    changelog, and a web search on the deprecation.
  - `wrangler ai models list` / `schema`, and the generated runtime types
    (`AiTextGenerationInput`, the model id map).
- **Actions:**
  - Asked 13 questions in four rounds: product (4), architecture (4), cold
    start and evidence (4), taxonomy (1). Wrote ADR-0016 from the answers.
  - Found the mandated model missing from the catalogue and probed it through a
    scratch Worker outside the repo: deprecated id vs `-fp8` vs 70B, with and
    without JSON mode. Put the substitution to Raffaele and wrote ADR-0017.
  - Built `/categorise` behind `HELLO_KEY`, deployed it, and ran a 15-item
    clean set twice, a 10-item shorthand set, and six failure-mode cases.
- **Alternatives considered:**
  - Every question offered 2–4 options with the trade-offs stated. The
    rejected options and the reasons are in ADR-0016 and ADR-0017.
  - For the spike: zod in the throwaway Worker was rejected in favour of a
    type-guard over a const object, to keep dependencies at zero in a
    to-be-deleted Worker. Production uses zod, per ADR-0016 §4.
  - An unguarded `/categorise` was rejected because it spends account neurons.
- **Assumptions:**
  - The category descriptions in the system prompt are my wording, and they
    are spike material. The production prompt is E.4's to design.
  - The spike's expected labels are my judgement, with the ambiguous ones
    marked.
- **Verification:** all numbers are from real calls against the deployed
  Worker (version `a0a30e04`) and are pasted in the evidence file. `tsc` is
  clean in `workers/hello`.
- **What I'd flag about my own work:**
  - The clean-description set flattered the model at 14/15. Adding the
    shorthand set (2/10) was necessary to avoid overclaiming.
  - The docs were wrong twice (JSON-mode support, and the schema lookup for the
    deprecated id). Only real calls were reliable.
- **Open questions (Raffaele's):**
  - Whether OCR should expand abbreviations (D.6).
  - Whether to tell the course owners about the dead model.
  - Committing C.3 and C.4, which aren't committed yet.
  - The C.5 teardown is next.

## 2026-09-23T11:40Z — Commits for the AI work, push, and the C.5 teardown
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "Create the respective commits and let's continue."
- **Actions:**
  - Made four commits, one per concern: `d15c017` config, `43aed5f` ADR-0016,
    `2dcc6df` ADR-0017, `f18efcd` Worker plus evidence.
  - Four files carried changes for several commits (CHANGELOG, ADR index,
    ADR-0016's status line, build plan, C-workers). Their intermediate
    versions were rebuilt and staged per commit. The build-plan intermediate
    was checked against HEAD: exactly the 8 rows ADR-0016 changed.
  - Pushed `ffd60b3..f18efcd`.
  - Teardown: recorded the before state; ran `wrangler delete --dry-run`, then
    `wrangler delete`; checked the URL, deployments, secrets and Splitr
    afterwards; deleted `workers/hello/` and the scratch files.
- **Alternatives considered:**
  - `wrangler delete --force` was rejected. It overrides dependent-Worker
    checks, and needing it would have meant something depended on a
    throwaway.
  - Keeping an empty `workers/` directory was rejected; git doesn't track
    empty directories, and Cluster E recreates it.
- **Assumptions:** "continue" meant C.5, the next build-plan step. It
  destroys only a throwaway Worker the plan always said to delete.
- **Verification:**
  - URL: 404 `1042`. `deployments list`: `10007`. `secret list`: not found.
  - Splitr: 200.
  - Root `tsc` and `eslint`: clean.
- **Open questions:**
  - C.6 needs Raffaele to name three modules from his own past projects; an
    agent can't supply those.
  - This teardown isn't committed yet.

## 2026-09-24T09:00Z — REQ-C.4: candidate list, probes, and the draft write-up
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:**
  1. "List the possible modules; I'll say which I've used. Don't change any
     decision."
  2. Then: "These are the ones I know for sure. Tell me whatever you choose so
     I can steer."
- **Inputs read:**
  - Workers docs on `node:fs`, TCP sockets / node-postgres / Hyperdrive, and
    platform limits.
  - `@better-auth/utils`'s export map and `password.mjs`.
- **Actions:**
  - Checked `fs` and `pg` before listing: both now work, so they were flagged
    as weak examples.
  - Gave a grouped candidate list with no file changes.
  - Chose one module per failure class from Raffaele's confirmed list.
  - Probed in a scratch Worker on local workerd, then deleted it:
    - `bcrypt` bundles and then fails at runtime;
    - `bcryptjs` takes 59 ms per hash;
    - PBKDF2 100k takes 5 ms, and 600k 32 ms.
  - Drafted `docs/modules-that-wont-run-on-workers.md` and linked it from the
    README.
- **Wrong beliefs caught by probing, not shipped:**
  1. I expected `bcrypt` to fail at **build** time. It bundles (16.9 KiB) and
     fails at runtime with `ReferenceError: __dirname is not defined`.
  2. I believed workerd caps PBKDF2 at 100,000 iterations. 600,000 ran
     locally. The claim was dropped.
  3. I suspected Better Auth might hash with pure-JS scrypt on Workers, which
     would have the same CPU problem as `bcryptjs`. Its export map sends
     `workerd` to the native `node:crypto` variant, so it doesn't.
- **Softened in the draft:**
  - Chromium's exact size became "well over 100 MB".
  - The "128 MB is less than one tab" comparison was dropped.
  - Hibernation is described as avoiding *duration* charges, not CPU.
- **Assumptions:**
  - The contexts in which Raffaele used each module are unknown, so the draft
    is written generically. He may want to add a line saying where he used
    each.
  - The local workerd timings may differ from production CPU accounting.
- **Open questions:** Raffaele's review of the draft; then committing it.

## 2026-09-24T10:00Z — README architecture and flows, study guide, REQ-C.4 cut
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "1 ok, 2 socket.io ok, 3 cut to three paragraphs. Keep
  notes of all the documents I need to know. Describe the project in detail in
  the README, with the architecture and diagrams of the flows."
- **Inputs read:**
  - `README.md`, `project-brief.md`, `add-expense.ts`, `actions.ts`, the
    expenses route handler.
  - Every ADR's Decision section, every spoken question (`REQ-A.5`…`F.6`),
    and `REQ-X.5`.
- **Actions:**
  - Rewrote the write-up as three paragraphs.
  - Added nine Mermaid diagrams to the README.
  - Wrote `STUDY-GUIDE.md`, and wired it into `CLAUDE.md`, the handover and
    memory.
  - Updated the brief's decisions table and the requirement statuses.
- **Alternatives considered:**
  - A single end-state diagram was rejected: it would present unbuilt services
    as real, which `REQ-X.5` ("accurate as shipped") and honesty both forbid.
    Hence the built/planned legend.
  - ASCII diagrams were rejected because GitHub renders Mermaid natively.
  - An ER diagram was left out because the schema is undecided until D.1 (the
    split-model ADR).
- **Assumptions:**
  - Flow 6's Durable Object sequence shows *arbitration* as the working
    design, but it's explicitly labelled as an open question in the component
    table (E.1).
  - The `REQ-C.4` cut was approved in content before it was cut, so it's
    marked Done. Raffaele hasn't seen the cut version yet.
- **Verification:**
  - All 9 diagrams were rendered with `@mermaid-js/mermaid-cli@11`. The first
    pass had 2 failures, both from a `;` inside a label, which Mermaid treats as
    a statement end. After fixing them all 9 render.
  - I visually checked the overview, the contested-write and local-dev PNGs.
  - Root `tsc` and `eslint` are unaffected (docs only).
- **Mistake caught:** my first patch to the brief's table matched the table's
  own `|---|` separator instead of the section's `---`, which left the old rows
  behind. It was seen in the file-change notice and fixed immediately.
- **Found:** the brief says search covers "all your groups", while the build
  plan's D.8 says "the viewer's group". It's logged as a decision for Raffaele
  and not resolved.
- **Open questions:** the search scope; committing this work.

## 2026-09-24T11:30Z — REQ-D.1: domain questions, schema, first migration
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "Create the dedicated commit, push, and let's go to the
  next step." The commits were pushed as `4ac1ef9` and `2c65b0d`. The next
  build step is D.1, since `REQ-C.5` is spoken.
- **Inputs read:**
  - `REQ-D.1` and `D.5`, the glossary (stopped at its EdgeLedger section),
    `schemas/expense.ts` and `group.ts`, `balances.ts`, the membership
    fixture, `money.ts`, and the conventions and `equalShares` in `schema.ts`.
  - The installed Drizzle `check`/`primaryKey` typings.
- **Actions:**
  - Asked eight domain questions in two rounds. Six matched the
    recommendations; two differ (leave only when square, and any member may
    void) and are recorded as his. Wrote ADR-0018.
  - Wrote `categories.ts` and the six tables; generated the migration.
  - Dropped the local auth tables, applied locally, and proved the
    constraints.
  - **Checked the remote row counts before dropping anything.** They were
    not empty: Raffaele's own account was there. Asked him; he chose "drop it,
    I'll re-register". Dropped the remote tables and applied the migration.
  - Redeployed, verified, and deleted the test accounts. Replaced the
    scripts; fixed the stale `.gitignore`/README/build-plan lines.
- **Alternatives considered:**
  - Hand-editing the migration to `IF NOT EXISTS`, and faking a
    `d1_migrations` row, were rejected because the history would be untrue.
  - Adding the domain-table relations now was rejected: they're only needed
    when D.3 queries through `db.query`.
  - A fourth alternative, backup-and-restore of his account, was offered and
    declined by Raffaele.
- **Caught in my own work:**
  - `categories.ts` first used an `Object.keys(...) as ModelCategory[]` cast,
    which the coding standards forbid. It was restructured as a literal tuple,
    so the types are derived.
  - The build-plan D.1 row claimed the migration "must not recreate" the auth
    tables, which is the opposite of what was done. Corrected.
- **Assumptions:**
  - `receipt_key` was added now, because R2 (D.5) is planned. That makes it an
    anticipated column, not a `REQ-D.5` candidate.
  - `group` is kept as the table name, per `schema.ts`'s own conventions,
    despite being an SQL keyword. It's documented in a comment.
- **Verification:**
  - `tsc` and ESLint clean.
  - The migration applied at both ends, with nothing pending.
  - 2 valid writes accepted and 6 invalid ones refused by a named constraint.
  - Local sign-up 200. Deployed: sign-up 200, gate 200, forged `Origin` 403.
  - Production has 0 users.
- **Open questions:** Raffaele re-registering; E.1's scope (does every
  balance-changing write go through the DO?); the glossary seal leak.

## 2026-09-24T13:30Z — D.3: writes through D1, naive settlements, tests, browser E2E
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "Commit what you did and continue." Committed and pushed
  as `a071078`/`510adca`, then built D.3.
- **Inputs read:**
  - Every file that consumed the fixture (15).
  - `screens-cluster-b.md` §6 (the settle design) and ADR-0012's decision.
  - The installed Drizzle D1 `batch` typings.
- **Decision asked:** whether settlements are written at D.3 (naive, with the
  race) or only at E, with the DO. Raffaele chose naive at D.3, so it serves as
  E.2's "before".
- **Actions:**
  - Replaced the fixture bodies with D1 queries and wrote the join Server
    Action.
  - Batched writes for group/membership and expense/shares; a naive
    settlement service, form and Route Handler; balances with settlements;
    `cache()` on every read; a shared audit helper.
  - Fixed stale comments (expense detail, members error) and false copy (the
    join form's O-2 promise).
  - Wrote the ADR-0012 tests.
  - A Puppeteer two-context E2E, run locally and on production (production
    rows deleted afterwards, scoped by group id and `@example.test`); a
    concurrency probe with curl; and the four `REQ-B.4` empty states
    rendered.
- **Alternatives considered:**
  - Voiding and leaving UIs were deferred, since no `REQ` asks for them.
  - Considered an aggregate SQL query for balances, and rejected it: one pure,
    tested `deriveBalances` is the single source of the formula, and group
    sizes are small.
  - zod in the settlement *rule* was rejected: the rule is pure arithmetic,
    and the shape is in `schemas/settlement.ts`.
- **Caught in my own work:**
  - My splice of `amountMinorUnitsField` cut at the inner `});`, which gave a
    syntax error. It was found by `tsc` and fixed, then re-indented.
  - The first Puppeteer import used the wrong entry path.
  - The "Alice recorded Alice's payment" copy was fixed.
  - `next typegen` was needed for the new route's `RouteContext`.
- **Assumptions:**
  - The invite code has 10 characters from a 56-symbol alphabet, and the
    `grp_`/`exp_`/`stl_` id prefixes are my choice.
  - The currency is fixed to GBP server-side at group creation, so it isn't a
    form field.
  - A refusal from the Route Handler is a `409`.
- **Verification:**
  - `tsc` and ESLint clean; 11/11 tests, and the mutation check fails 2 as
    expected.
  - The E2E passes locally and on production (version `6276cbc0`).
  - The race: round 1 gave 201/201 with two settlements in D1.
  - The `[AUDIT]` lines show `persisted: true`.
  - Production is back to 0 rows in every table.
- **Open questions:**
  - E.1's scope (does every balance-changing write go through the DO?).
  - CSRF on the JSON Route Handlers, to verify at F.
  - Worker size at 76%.
  - Raffaele re-registering.

## 2026-09-24T15:00Z — D.4 / REQ-D.2: KV, with the planned value replaced
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "Commit what you did and continue." D.3 was committed as
  `dc7fd91`/`e6df329`/`1f8c960` and pushed. Next is D.4.
- **Inputs read:** `REQ-D.2`, including its note, and `wiki/techstack/cloudflare-data.md`'s
  KV section. That page is EdgeLedger-derived, a known seal issue. It
  *agreed* with the requirement ("never use it for balances"), but the
  deciding source was the requirement's note, which was read first.
- **Decision asked:** the plan's "balance snapshot" conflicts with the
  requirement's note. I offered three options: recent descriptions, a
  display-only snapshot, or a feature flag. Raffaele chose **recent
  descriptions**. Recorded in ADR-0019.
- **Actions:**
  - Created the namespace and binding.
  - Wrote the cache module (zod-validated value; a miss rebuilds from D1;
    `waitUntil` for the put and the delete; KV errors fall through).
  - Invalidated on expense write, and added the datalist.
  - Verified locally (4 scenarios) and in production (KV written after the
    response), then cleaned.
  - Replaced eight stale "snapshot" mentions, and noted ADR-0018 rather than
    editing it.
- **Alternatives considered:**
  - A write-through prepend was rejected in favour of delete, which can only
    make the list cold, never wrong.
  - Reading KV without zod validation was rejected: a malformed value must be
    a miss, not data.
- **Assumptions:** a limit of 10 and a TTL of 7 days are my choices; the
  descriptions are distinct and case-sensitive.
- **Verification:**
  - `tsc` and ESLint clean; the tests pass.
  - Local: miss → hit → loss → rebuild → write-invalidates, with the log lines
    captured.
  - Production: the key held `["Tesco big shop"]` after a view, and after
    cleanup there are 0 rows and 0 keys.
  - The README overview diagram re-renders.
- **Open questions:** none new. The Worker is at 2,330 KiB gzipped (about 76%).

## 2026-09-24T17:00Z — D.5 / REQ-D.3: presigned R2 uploads, and a signing gap found by attacking it
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:**
  - "Commit what you did and continue." D.4 was committed.
  - Then "how can I create an R2 key?": dashboard steps, from Cloudflare's docs.
  - Then the secret-put command failed (run outside `splitr/`); I explained
    it and gave `--name splitr`.
  - Then "done".
- **Inputs read:** R2's presigned-URL, `aws4fetch` example, CORS and API-token
  docs; `aws4fetch`'s own source (`UNSIGNABLE_HEADERS`); `wrangler r2 bucket
  cors set --help`.
- **Actions:**
  - Verified the secrets by name only, and the `.dev.vars` key lengths, never
    the values.
  - Declared `aws4fetch` a direct dependency (already bundled via OpenNext).
  - Wrote ADR-0020. Bound R2 (`remote: true`) and added the vars; set and read
    back CORS.
  - Wrote the receipts module, the upload action, the form field and the
    detail-page image.
  - Ran a browser test with a full request log, locally and on production.
  - An attack script: a wrong Content-Type (which found the bug), an 11 MB
    upload, and five attach attacks.
  - Cleaned production R2, D1 and KV.
- **Alternatives considered:**
  - `@aws-sdk/s3-request-presigner` was rejected on size.
  - `next/image` for the receipt was rejected, because it would proxy the
    image through the Worker.
  - A simulated R2 binding in dev was rejected, because it would check an
    empty bucket while the presigned URL hits real R2 (I predicted this before
    testing).
  - Enforcing the size on upload isn't possible with a presigned PUT, so it's
    enforced on attach instead.
- **Caught in my own work:**
  - I followed Cloudflare's `aws4fetch` example, which doesn't pin the
    Content-Type. ADR-0020 §3 was claimed and false until tested. It's fixed
    with `allHeaders: true` and recorded in the ADR's Verification section.
  - My first browser script looked up the expense link by text and failed.
    That was the script, not the app.
  - Puppeteer shows binary PUT bodies as 0 B, so I confirmed the size from R2
    (5,080 bytes, byte-identical).
- **Assumptions:** the 10 MB limit, the 5-minute TTL, the three image types
  and the key format are my choices, recorded in ADR-0020.
- **Verification:**
  - `tsc` and ESLint clean, 11 tests pass.
  - Production upload: 52-byte request to Splitr, PUT to R2, image rendered
    from R2's host.
  - The wrong-type PUT: 403 after the fix (200 before).
  - The five attach attacks gave 400s, and the bad objects were deleted.
  - Production is back to 0 rows and 0 keys.
- **Open questions:** D.6 is an AI decision, so it needs Raffaele's answers
  first; orphaned photos (backlog).

## 2026-09-24T19:00Z — D.6: questions, licence, dataset, and the first two spike runs
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "yes": commit D.4/D.5 (done, `6f652f6`..`fb96e8a`) and ask
  the D.6 questions.
- **Inputs read:**
  - The live Workers AI catalogue and both Llamas' schemas.
  - SROIE's Hugging Face metadata, README and NOTICE (CC-BY-4.0).
  - The six receipt images, which I looked at myself to label.
- **Decisions asked:**
  1. Four questions: candidates, shorthand, review UX, receipt source.
     Raffaele chose **the Llamas only** (I had recommended four models), and
     took my recommendation on the other three.
  2. Meta's licence gate (5016). He said he'd read it and authorised `agree`,
     so I sent it once.
- **Actions:**
  - Wrote ADR-0021.
  - Downloaded SROIE's test split to the scratchpad, and extracted six at
    fixed, evenly spaced indices with their totals.
  - Labelled 14 items by eye, *before* running any model.
  - Built the dev-only harness, and ran prompt v1, then v2.
  - Inspected a failing response to find its cause.
- **Caught in my own work:**
  - I symlinked `node_modules` into `scripts/vision-spike/`. A symlink isn't
    matched by `node_modules/` in `.gitignore`, so it would have been
    committed. Removed before any commit.
  - v2 was my prompt improvement, and it *hurt* one model. It's reported as a
    finding, not quietly reverted.
- **Assumptions:**
  - The SROIE indices, the scoring order, the prompts and `max_tokens: 1024`
    are my choices.
  - An item "matches" when its amount matches a labelled amount, which is a
    lenient measure. It's stated in the evidence.
- **Verification:**
  - Each run's per-receipt output and summary is pasted in the evidence file,
    with the full results JSON in `.data/receipts/`.
  - The failure diagnosis was a direct re-ask: prose, not truncation (162
    tokens).
- **Open questions:** Raffaele's receipts; his check of the 14 item labels;
  the model choice.

## 2026-09-24T22:00Z — D.6 build: Read receipt, and REQ-D.5
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:**
  - "Before proceeding, tell me the cost": I gave the Workers AI pricing and
    the neurons used so far.
  - "Pros and cons for all models, and your choice": all six compared; I
    recommended Scout.
  - "Keep it; what's next?", then "yes": commit and build.
- **Actions:**
  - Recorded the Scout choice, and committed and pushed `fb96e8a..7ee7c99`.
  - Added the column and migration `0001`, applied locally and remotely.
  - Added the `ai` binding, the draft parser (with tests), the reader (JSON
    mode, timeout), the action, the draft UI and the confirm gate; line items
    are saved in the batch, and the expense page lists them.
  - Browser tests locally and on production, a curl bypass test, and cleanup.
- **Caught in my own work:**
  1. The confirm gate landed on the *file input*, because my edit replaced the
     first of two identical strings. The browser test showed save enabled
     before confirming. I fixed it, and moved enforcement to the server as
     well.
  2. The server refinement broke the page at runtime (Zod 4's `.pick()` on a
     refined schema), and `tsc` couldn't see it. Fixed by splitting
     `addExpenseFields` from `addExpenseSchema`.
  3. A browser-test selector (`::-p-text`) clicked the wrong element, and
     looked like a server hang for 150 s. I isolated it before blaming the
     app.
  4. I'd said the printed text shows under each item, but it was
     screen-reader only. Made visible.
  5. I'd earlier called GLM-5.3-flash "expensive". Its published price is
     lower than Scout's, and I corrected that before the choice.
- **Alternatives considered:**
  - Prompt v2 was rejected for production (no gain for Scout).
  - An auto-read on upload was rejected (Raffaele chose the button).
  - A UI-only gate was rejected after bug 1, because it wasn't enough on its
    own.
- **Verification:**
  - 20/20 tests.
  - Production: read in 2.8 s with total 37.45, 2 items stored with
    `raw_text`; the gate is enforced; the failure path leaves the form
    untouched.
  - A curl without confirmation got 400, and with it 201.
  - Production is back to 0 rows and 0 R2 objects for the test group.
- **Open questions:** Raffaele's own receipts (confirming the choice); D.7 is
  next.

## 2026-09-24T23:30Z — D.7/D.8 / REQ-D.4: semantic search, and the binding types that were `any`
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "all groups" (search scope). Then two more questions I
  asked: itemless expenses get a vector; the vector text is item + merchant.
- **Inputs read:**
  - The Vectorize docs: metadata filtering (`$in`, the 2,048-byte limit,
    indexes before insert), limits, pricing.
  - `screens-cluster-b.md` §5.13.
  - The importable `@cloudflare/workers-types` entry and Vectorize v2 typings.
- **Actions:**
  - Wrote ADR-0022.
  - Created the index, then the metadata index. I waited for confirmation
    before any insert, because vectors inserted earlier can't be filtered.
  - Bound the index (remote), and wrote the pure `vectorSpecs` (tested),
    index-on-save and search (meaning and keyword).
  - Built `/search` with §5.13's empty states.
  - Seeded 16 expenses through the Route Handler, ran 11 labelled queries both
    ways, then a fairer any-word keyword baseline.
  - Deployed; diagnosed a production miss with `wrangler tail`; re-verified;
    cleaned the index and D1.
- **Defect found in earlier work:** every binding type was `any`. ADR-0015's
  `--include-runtime=false` left the names undefined, and `skipLibCheck`
  hid it. Found with a `const x: number = env.DB` probe. Fixed with
  `cloudflare-globals.d.ts`. All existing code typechecked against the real
  types.
- **Caught in my own work:**
  - The `LIKE` escaping was a no-op without `ESCAPE`; fixed before use.
  - ADR-0022 said "most recently joined 50"; the code uses the first 50 by
    name. I corrected the ADR to match the code.
  - I kept the keyword baseline from being a straw man by adding the any-word
    variant (3/11, not 1/11).
- **Assumptions:** `topK` 20, cosine, the seed data and queries (mine, with
  the bias risk stated), and top 3 as the scoring rule.
- **Verification:**
  - 23/23 tests.
  - 25 vectors, exactly as expected; meaning 11/11 against keyword 1/11 and
    3/11.
  - Production: the tail showed "indexed", and search for "groceries" found
    "Tesco big shop".
  - The index went from 28 to 0; production is back to 0 rows and 0 keys.
- **Open questions:** Cluster E starts with the E.1 decision (Raffaele's);
  checking D1's bound-parameter limit (backlog).

## 2026-09-25T10:00Z — Cluster E core: the GroupLedger Durable Object
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "yes, let's do it": commit D.5–D.8 (done, `2759b12`..`cab658f`),
  then the E.1 questions and the build.
- **Inputs read:**
  - `REQ-E.1`, `E.2`, `E.3`, `E.5`.
  - The workers-types entries (`DurableObject`, `WorkerEntrypoint`,
    `blockConcurrencyWhile`, the Vectorize and DO types).
  - The `@cloudflare/vitest-plugin` type declarations (`runInDurableObject`,
    `runDurableObjectAlarm`, `applyD1Migrations`, `readD1Migrations`).
- **Decisions asked:** four (own or arbitrate, which writes, the key's
  origin, the demo). All matched the recommendations. Recorded in ADR-0023.
- **Actions:**
  - Wrote the contract, the shared balance loader, the ledger Worker (DO plus
    RPC entrypoint), the typed service binding (and a module shim for the
    app's program), the `LedgerEnv` drift guard (mutation-checked), and
    `recordSettlement` through RPC.
  - The key is minted when the form renders.
  - workerd tests; local and production races, and idempotency.
  - A bisect of the size jump in a git worktree.
  - Cleaned production D1 and the index.
- **Caught in my own work:**
  1. `JSON.parse` of the body was an unchecked cast via `any`. The DO now
     returns a typed decision as well as the body.
  2. An exported constant broke workerd's startup.
  3. The loser was told the wrong winner: duplicate `name` columns in a D1
     batch. I first guessed a timestamp tie and added a `rowid` tie-break,
     which didn't fix it, and then found the real cause by querying D1
     directly.
  4. The 2-way race test couldn't detect the lock's removal; it's now
     30-way, and proved 6/6.
  5. The cookies were lost because the scratchpad was cleared overnight, and
     the first local race got 401s. I re-signed-in before concluding
     anything.
  6. The zsh word-splitting in `delete-vectors`.
- **Verification:**
  - `tsc` for the app and the ledger, ESLint.
  - 23 pure tests plus 6 workerd tests.
  - Production: 5/5 rounds with one winner, correctly named; a byte-identical
    replay; the ledger public URL gives 1042; `[AUDIT]` lines from the DO in
    `wrangler tail`.
  - Production is back to 0 rows; the index is back to 0.
- **Open questions:** E.7 (the RAG AI Worker) is an AI decision, so it goes
  to Raffaele first. The size fix (backlog).

## 2026-09-25T11:00Z — Commit Cluster E, and a handover audit for a new session
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "Commit first, then tell me: if I move to another
  session, do we have everything documented to start from the same point?"
- **Actions:**
  - Committed and pushed `a0e2910`..`b78ebbd`.
  - Read `HANDOVER.md` *as a new session would*, rather than asserting it was
    fine. Found its body stale in six places, and missing the fresh-machine
    setup, the two-process dev, the resource and secret names, and the
    real-cloud side-effects of local dev.
  - Found that the verification scripts had lived in the scratchpad and were
    deleted overnight.
  - Rewrote the handover.
- **Verification:** the counts were checked against the repo (36 commits, 23
  ADRs, 15 evidence files, 3 Worker secrets). `CLAUDE.md` §2 points new
  sessions to this file, and memory holds the two standing preferences.
- **Open question:** whether to commit re-runnable versions of the lost
  verification scripts (offered to Raffaele).

## 2026-09-25T11:30Z — The CI/CD plan
- **Agent:** Claude Opus 5.5 (1M context), tech lead in the main session
- **Prompt intent:** "OK (to the verification scripts), and we need a plan for
  CI/CD with GitHub Actions; what we're doing isn't ideal."
- **Inputs read:** the requirements (CI/CD isn't among them), `CLAUDE.md` §6
  (no GitHub settings; push only to `main`), and the git remote and
  credential helper.
- **Decisions asked:** four. Raffaele chose GitHub Actions, **production only**
  (I had recommended staging), PRs with required checks, and smoke tests plus
  a nightly E2E.
- **Actions:** wrote ADR-0024 (three workflows, the size budget, the scripts,
  the split of work, the rollout), and updated the handover, study guide,
  backlog and changelog. **Nothing is built yet.** It's a plan, as asked.
- **Flagged, not assumed:**
  - The PR flow conflicts with `CLAUDE.md` §6 ("push only to `main`"), so
    that rule is Raffaele's to amend.
  - Pushing workflow files needs the credential's `workflow` scope.
  - With production only, the smoke tests keep creating and deleting
    production test data.
  - The CI token's permission names are to be confirmed in the dashboard.
- **Open questions:** approval to start rollout step 1; the §6 amendment.

## 2026-09-25T10:30Z — CI rollout step 1: the verification scripts
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** "Read the handover and continue." Raffaele answered the
  two open questions: yes to the §6 amendment, and start with CI step 1. Two
  more were asked mid-task: `puppeteer-core`, and a generated receipt.
- **Inputs read:** HANDOVER, ADR-0024, the E.1 evidence, both Route
  Handlers, the expense and settlement schemas, `create-group`/`join-group`,
  the D1 migration (foreign keys), the vector-id and receipt-key formats,
  and the register, join, add-expense, settle and search UIs. `wrangler`
  help for KV, R2 and Vectorize.
- **Actions:**
  - amended `CLAUDE.md` §6;
  - wrote `scripts/verify/*` and `.nvmrc`;
  - added `puppeteer-core`;
  - rendered the fixture receipt;
  - ran smoke, race and e2e against `next dev` plus a local ledger;
  - deleted 7 orphaned test photos this session's failed E2E runs had left in
    R2 (keys taken from this session's own dev log).
- **Alternatives considered:**
  - Group creation through the UI in smoke: rejected, because the Server Action
    id rotates (ADR-0010), so smoke uses a D1 insert, as the plan said.
  - Listing R2 over S3: rejected, because it keeps the S3 keys out of CI, so
    photos are found through D1 and the E2E hands over its key.
  - Failing the E2E on a model misread: rejected, because it would make the
    nightly flaky on a job the vision eval does. A misread is reported instead.
- **Assumptions:**
  - Vectorize applies mutations in order, so a delete queued after an upsert
    wins. The vector check after cleanup is consistent with this.
  - GitHub's ubuntu runners have Chrome. Unverified until step 5.
- **Verification:**
  - All four scripts pass locally; outputs are in the evidence file.
  - Controls tested: a failed run cleans up, vectors are really gone
    (`get-vectors`), a photo uploaded before a deliberate failure is gone
    (`r2 object get` → key does not exist), and cleanup refuses a real email.
  - `tsc --noEmit` passes for both programs, and ESLint is clean.
- **Found:**
  - A real UX bug: the first click below the autofocused description is lost
    to a layout shift (backlog).
  - An orphaned local `wrangler dev` ledger (PID 8310, started 09:12) had
    dropped out of the dev registry. Left running; a second ledger was
    started on 8792.
  - Older local test data sits in production R2 and Vectorize.
- **Open questions:**
  - Running smoke against production: remote D1 was blocked by the
    permission classifier.
  - Whether to sweep the older local test data out of production R2 and
    Vectorize.
  - Whether to fix the layout-shift bug now.

## 2026-09-25T11:00Z — The layout-shift fix, the sweep, the branch and the PR
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** Raffaele's answers:
  1. "I did it" (he ran smoke against production; the output wasn't shared);
  2. "ok" to the sweep;
  3. "I don't want any UI issue";
  4. commit to a new feature branch and open a PR to `main`.
- **Inputs read:** `screens-cluster-b.md` §7.4, both forms that validate on
  blur, and every `onBlur`/`autoFocus` in `src/` (only those two forms).
- **Actions:**
  - In both forms: pristine-blur rule, reserved error lines, form gap
    `gap-5` → `gap-3`.
  - The E2E's swallowed-click warning became a failing check.
  - Ran the sweep.
  - Created the feature branch, committed, pushed it and opened the PR, at his
    explicit request.
- **Alternatives considered:**
  - Removing `autoFocus`: rejected. It's the spec's focus behaviour, and it
    would fix only the pristine case, not an error that appears after typing.
  - Absolutely positioned errors: rejected, because they can overlap the next
    field.
  - The pristine rule alone: rejected, because a real error appearing on blur
    would still move things mid-click.
- **Verification:**
  - The E2E passes with the new guard, which failed before the fix.
  - A scratch probe: *New group*'s first "Create group" click submits (1
    POST); an amount error appears and "Who paid?" stays at y=616; the click
    after it lands.
  - Screenshots show both forms evenly spaced, with fields at identical
    heights with and without errors.
  - `npm test` 23 + 6, smoke and race: all green.
  - `tsc` and ESLint are clean.
  - The sweep's second dry run: nothing to remove.
- **Open questions:** Raffaele's production smoke output, for the evidence
  file. Creating this PR was done at his request. `CLAUDE.md` §6 still says
  he opens PRs, and it's unchanged unless he says so.

## 2026-09-25T11:20Z — Recorded the production smoke run
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** Raffaele pasted his `smoke.mjs` output against production.
- **Actions:** Pasted it verbatim into the evidence file, updated the
  backlog, study guide, handover and changelog, and pushed a commit to the
  open PR's branch.
- **Assumptions:** The paste ends at cleanup, without the final
  `smoke passed` line. Every check shown passed and cleanup finished, which
  is what exit 0 requires, but the exit code itself wasn't seen.
- **Verification:** none beyond reading the output; the agent can't reach
  production D1.
- **Open questions:** none new.

## 2026-09-25T12:00Z — CI rollout step 2: `ci.yml`
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** "merged, go on" (after PR #1).
- **Inputs read:** ADR-0024, `package.json`, the ledger's tsconfigs, the
  adapter's `initOpenNextCloudflareForDev` source, the Next 16
  `next.config.js` docs (the phase function), `session.ts`/`auth.ts`, and
  the current action releases (public API, unauthenticated; `gh api` is ruled
  out by §6).
- **Actions:**
  - wrote `ci.yml` and `scripts/ci/size-budget.mjs`;
  - made `next.config.ts` a phase function;
  - reordered `getSession()`;
  - widened the E2E search poll;
  - new branch `ci/ci-workflow`, pushed with a PR, as with PR #1.
- **Alternatives considered:**
  - Giving `ci.yml` the Cloudflare token so the build could connect:
    rejected, because the build shouldn't need it and the ADR keeps `ci.yml`
    credential-free.
  - `export const dynamic = "force-dynamic"` on the `(app)` layout: rejected,
    because it treats the symptom; the real defect was touching D1 before the
    request.
  - An env check (`NODE_ENV`) around the init: rejected in favour of Next's
    documented phase constant.
- **Verification:**
  - A strict simulation (`set -euo pipefail`, a clean copy, an empty `HOME`)
    ran every workflow step: all passed.
  - The size gate was mutation-checked (fails at a 2,000 KiB budget).
  - `next dev` still has its bindings: local smoke passes, and so does the E2E
    (its first run hit the 2-minute search window with the receipt already
    indexed; after widening to 5 minutes it passed in 47 s).
  - `tsc` and ESLint are clean.
- **Assumptions:** `ubuntu-latest` behaves like the simulation. It will be
  seen on the PR's first run.
- **Open questions:** whether Raffaele's credential can push
  `.github/workflows/` (the `workflow` scope). The push below shows it.

## 2026-09-25T12:30Z — CI rollout step 4: `deploy.yml`
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** "merged, pls continue" (after PR #2).
- **Inputs read:** ADR-0024, wrangler 4.140's `deployments status`/`rollback`
  help, and its source for how `d1 migrations apply` confirms when not
  interactive (a fallback "yes" in CI).
- **Actions:** wrote `deploy.yml`, made `ci.yml` reusable, and opened a PR on
  branch `ci/deploy-workflow`.
- **Alternatives considered:**
  - Keeping `ci.yml` on push to `main` as well: rejected, because the checks
    would run twice and wouldn't gate the deploy.
  - Automatic rollback: kept out, as ADR-0024 decided.
  - `cancel-in-progress: true`: rejected, because it could cut a deploy
    between the ledger and the app.
- **Verification:**
  - actionlint (Docker `rhysd/actionlint`, with shellcheck) is clean.
  - The version-recording snippet was run locally against the live Workers
    (read-only).
  - **Not run end to end:** it needs the repo secrets, and its first run is the
    merge itself.
- **Assumptions:** the token has the permissions ADR-0024 lists. Smoke's
  setup and cleanup need D1, KV, R2 and Vectorize, beyond deploying.
- **Open questions:** has Raffaele done step 3 (token, secrets, `production`
  environment, branch protection)? It isn't visible to the agent, because §6
  rules out authenticated GitHub calls.

## 2026-09-25T13:00Z — The first deploy run failed safely; a preflight added
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** "just merged" (PR #3).
- **Actions:**
  - Watched run 36134011199 through the public API: `ci / checks` green, then
    the deploy failed at "Record the live versions", with every mutating step
    skipped.
  - The annotations gave only "exit code 1", and the log needs authentication
    (§6).
  - Added a preflight and readable `::error::` annotations; PR on
    `ci/deploy-preflight`.
- **Verification:**
  - The new steps were run locally in bash, with the real login (they print
    the live ids) and with a bogus token and an empty `HOME` (a readable
    `[code: 6003]` annotation).
  - actionlint is clean.
- **Assumptions:** the most likely cause is missing secrets or a token
  without Workers Scripts access. **Unconfirmed**: only the log, or the next
  run's annotation, shows it.
- **Open questions:** Raffaele: were the secrets set before the merge? What
  does the failed step's log say?

## 2026-09-25T13:10Z — The first deploy confirmed; step 5 built
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** "fixed, the CI/CD completed."
- **Actions:**
  - Read run 36134628524's steps through the public API: all green, in order
    by their timestamps.
  - Checked the live versions (`wrangler deployments status`, read-only) and
    the site's 200.
  - Wrote `e2e-nightly.yml`, and added `paths-ignore` for docs on
    `deploy.yml`.
  - Opened a PR on `ci/e2e-nightly`.
- **Alternatives considered:**
  - Running the E2E on every deploy: rejected in ADR-0024 (neurons, time,
    flakiness).
  - A separate concurrency group for the E2E: rejected, because it could test
    mid-deploy.
  - `paths-ignore` on `ci.yml` too: rejected, because a required check on a
    skipped workflow never reports, and PRs would hang.
- **Verification:** actionlint is clean. **The E2E workflow is unrun**: it can
  only be dispatched after the merge.
- **Assumptions:** the runner's `google-chrome` works headless for
  `puppeteer-core` with `channel: "chrome"`. The "Chrome on the runner" step
  shows the version, and the first dispatch shows the rest.
- **Open questions:** none new.

## 2026-09-25T15:00Z — E.7 decisions (ADR-0025)
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** "What's your idea for the open decisions?", then "deal,
  continue".
- **Inputs read:** ADR-0016, ADR-0017, `REQ-E.4`, `REQ-F.5`, the C.3 and D.6
  spike numbers, and build-plan E.7.
- **Decisions asked:** four structured questions, each with a recommendation
  and alternatives. Raffaele chose the recommendation on all four.
- **Actions:** wrote ADR-0025, and updated the index, study guide, handover
  and backlog. **No code yet.**
- **Assumptions:** the budgets (8/5/3/30 s) are starting values. The eval and
  the E.7 tests may adjust them, and any change is recorded.
- **Open questions:** Raffaele's approval of the eval labels, which is next.

## 2026-09-25T15:20Z — E.7 step 1: seed corpus and eval set drafted; labels approved
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** Draft the data for ADR-0025. Raffaele: "approved".
- **Actions:** Generated both JSON files with a script that checks the
  category keys and leakage, then presented all 30 eval labels plus the two
  groups' habits for review.
- **Assumptions (flagged at review):**
  - shorthand items show the model only the raw print (the worst case);
  - s08 → drinks;
  - "Uber to the airport" in the flat matches the seed default, so only its
    trip twin truly needs RAG.
- **Verification:** the generator's assertions: 11 keys, counts
  (50/40/30), and no leakage.
- **Open questions:** none on the labels.

## 2026-09-25T16:30Z — E.7: the AI Worker built, the eval run, the model chosen
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** "approved" (labels), then continue E.7.
- **Decisions asked:**
  1. Where the neighbours' labels come from: **D1 lookup** (ADR-0025 §5).
  2. The production model: **8B + RAG**.
  3. The threshold: **0.6**.

  Each was asked with a recommendation and the eval's numbers.
- **Inputs read:** the ledger Worker (the pattern), `vector-text.ts`
  (ids-only metadata), the generated runtime types (both model ids exist),
  and the C.3/D.6 evidence for how neurons are measured (`usage.neurons`).
- **Actions:**
  - Pure logic in `src/lib/categorise/`, the Worker wiring in `workers/ai/`,
    and a dev-only harness.
  - Loaded 90 reference vectors (seed plus the eval histories) into the
    production index under `seed`, `eval-flat` and `eval-trip`.
  - Ran the eval: 1 run, then 3 runs, then the sweep.
- **Alternatives considered:**
  - A cast on the model id: rejected (coding standards); each id is called
    literally.
  - Batching all items into one call per cell: rejected, because per-item
    calls measure per-item latency.
  - Loading reference vectors through a production RPC method: rejected, to
    keep the production surface to one method; the dev-only harness loads them.
- **Found:**
  - Wrangler types the Vectorize binding as `VectorizeIndex`; `env-check.ts`
    caught the mismatch.
  - Vectorize took about 3 minutes to make new vectors queryable.
  - 70B follows the group's habits less than 8B.
- **Verification:**
  - 16 unit tests, with 2 mutations each caught.
  - `tsc` passes for the app and `workers/ai`, and ESLint is clean.
  - Eval output is in the evidence file.
  - A wrong secret is refused through the real binding, and plain HTTP gets 404.
- **Cost:** about 4,000 Workers AI neurons for the eval today.
- **Open questions:** none blocking. Next is step 4: deploy `splitr-ai`,
  set its secret, and wire the app.

## 2026-09-25T17:30Z — E.7 step 4: wiring categorisation into the app
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Prompt intent:** "merged" (PR #6), so continue with step 4.
- **Actions:**
  - A pure `categoriseAfterSave` with injected dependencies (8 tests), and
    the server wiring `categorise-expense.ts`.
  - `add-expense` step 9, the app's `AI_WORKER` binding, and the AI Worker in
    `deploy.yml`.
  - A local-only `AI_SHARED_SECRET` added to `./.dev.vars`.
- **Alternatives considered:**
  - Awaiting categorisation before responding: rejected by ADR-0016 §5.
  - Overwriting existing labels: rejected; the write is conditional on
    `uncategorised`.
  - A dev-only workaround (deferring the RPC call) for the blocking proxy:
    rejected. Tool-specific code in production for a local artefact; it's
    documented instead.
  - A cast for drizzle's non-empty batch tuple: replaced by destructuring.
- **Verification:**
  - A real local end-to-end run (the three items labelled correctly).
  - `REQ-M.7` with the AI Worker not running: 201 in about 60 ms, items left
    `uncategorised`, and an `error:unreachable` audit line.
  - A timer probe located the dev-only block (reverted).
  - `tsc` passes for all three programs, ESLint is clean, and 47 + 6 tests
    pass.
- **Mistake, and a lesson:** stopping `wrangler dev` "by port" left the
  parent processes registered, so a stale AI Worker answered the first "AI
  down" test and made it invalid. I killed this session's stale processes by
  PID (sparing Raffaele's 09:12 ledger), and the handover now says to kill the
  `wrangler` process.
- **Open questions:** Raffaele sets `AI_SHARED_SECRETS` (on `splitr-ai`) and
  `AI_SHARED_SECRET` (on the app) after the merge's deploy. Then production
  verification.

## 2026-09-26T00:10Z — PR #7's CI caught an untyped secret
- **Agent:** Claude Opus 5.5 (1M context), main session
- **Actions:**
  - Read the failed annotation ("Property 'AI_SHARED_SECRET' does not exist
    on type 'CloudflareEnv'").
  - Reproduced it on a clean copy with no `.dev.vars`.
  - Found why the R2 secrets don't fail: OpenNext declares
    `R2_ACCESS_KEY_ID` itself.
  - Replaced the typed read with an `in`-narrowed, possibly-absent read.
- **Alternatives considered:**
  - Augmenting `CloudflareEnv` with `AI_SHARED_SECRET?: string`: rejected. It
    conflicts with the generated `string` whenever `.dev.vars` exists.
  - Committing a `.dev.vars.example` for `wrangler types`: rejected, as it
    couples type generation to a file of secret names.
- **Verification:** `tsc` passes on the clean copy and locally, and 24
  categorisation tests pass.
- **Lesson:** a second case today of a local file hiding what a clean machine
  lacks (after the build credentials). The clean-copy simulation is the check
  that finds these.
