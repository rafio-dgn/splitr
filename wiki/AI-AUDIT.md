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
