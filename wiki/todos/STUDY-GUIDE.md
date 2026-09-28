# Study guide: what you need to know, and where it's written

**For Raffaele.** The demo (`REQ-X.8`) is 15 minutes, spoken and unaided, and
`REQ-M.4` says every decision must be explainable **in your own words**. This
page lists every document that holds something you'll be asked about, what
you need to take from each one, and what's still to be written or answered.

**It's kept current.** Every session that adds an ADR, evidence file,
deliverable or open question also updates this page (`CLAUDE.md` §3).
*Last updated: 2026-09-25, after E.1–E.6 (the Durable Object).*

---

## 1. The pitch: know these by heart

| What | The line | Where |
|---|---|---|
| What Splitr is | Photograph a receipt; a vision model itemises it; the group's balance updates; when someone settles up, exactly one settlement lands, never two | [README](../../README.md), [project brief](../context/project-brief.md) |
| **The contested write** (`REQ-E.7` Q1) | *"Splitr's Durable Object prevents the same debt being settled twice when two group members record the same payment at the same moment."* | [project brief](../context/project-brief.md) |
| Why a DO, not "last write wins" | Both writes are valid alone; merging them is wrong, not just lossy; the loser must be *told* | README, *The contested write* |
| The AI story | "The AI suggests, the human confirms the money, and the write never waits." | [ADR-0016](../decisions/0016-ai-integration-strategy.md) |
| Architecture | Seven flow diagrams, with built vs planned marked | [README → Architecture](../../README.md#architecture) |

## 2. Decisions: one line each, in your own words (`REQ-M.4`)

Read each ADR's **Context** and **Decision** sections. The line below is the
answer to "why?".

| ADR | The question | What was decided, and why |
|---|---|---|
| [0001](../decisions/0001-wiki-as-knowledge-base.md) | Where does project knowledge live? | A wiki with a thin `CLAUDE.md`, because git can't carry the *why* |
| [0002](../decisions/0002-course-is-requirements-source-of-truth.md) | What counts as a requirement? | Only the course. Nothing inferred from the reference build |
| [0003](../decisions/0003-edgeledger-is-comparison-not-template.md) | How is EdgeLedger used? | Sealed until `REQ-X.6`, so the comparison at the end is honest |
| [0004](../decisions/0004-project-is-splitr.md) | Which project? | Splitr: its contested write has an obviously correct behaviour and is visible without explanation |
| [0005](../decisions/0005-optional-scope.md) | Optional scope? | Cluster F is in; Queues is out (it needs a paid plan) |
| [0006](../decisions/0006-repo-layout.md) | Repo shape? | Next.js at the root (the course names exact paths), Workers in `workers/<name>/` |
| [0007](../decisions/0007-docker-for-local-development.md) | Docker? | For development only, via OrbStack. **Production isn't containers** |
| [0008](../decisions/0008-agent-team-and-skills.md) | How the AI agents work | Six agents, and skills written for failures we've actually had |
| [0009](../decisions/0009-better-auth-on-local-sqlite-via-drizzle.md) | Which auth library? | Better Auth as a black box, with `schema.ts` written once. (Lucia was deprecated; Clerk would own the user table) |
| [0010](../decisions/0010-validation-entry-points.md) | Why both a Server Action *and* a Route Handler? | One validation path, two entry points. The Route Handler is the stable curl target, since Server Action ids rotate |
| [0011](../decisions/0011-one-membership-check-per-request.md) | Where is group membership checked? | Once per request, in the group layout, memoised with React `cache()` |
| [0012](../decisions/0012-test-the-invariants-and-the-money-nothing-else.md) | What gets tested? | The contested-write invariants and the money arithmetic, because those failures look like success |
| [0013](../decisions/0013-base-url-is-the-request-host-not-a-port-in-env.md) | Why no `BETTER_AUTH_URL` locally? | The base URL comes from the request host, so no port is written anywhere (the fix for F-1) |
| [0014](../decisions/0014-opennext-as-the-deploy-adapter.md) | Deploy adapter? | OpenNext. Pages can't host a Durable Object; vinext (Cloudflare's default) is beta and replaces the compiler |
| [0015](../decisions/0015-one-database-driver-d1-everywhere.md) | Why D1 locally too? | Two drivers would make every local check say nothing about the deployed database |
| [0016](../decisions/0016-ai-integration-strategy.md) | What does the AI do? | 12 decisions **you** made: RAG categorises items, money needs a human, English only, a closed list of 11 categories, after the write, behind the AI Worker, one vector per item, group first then a seed corpus, a labelled eval |
| [0017](../decisions/0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md) | The course's Llama is dead | It was deprecated on 2026-05-30 (error 5028). We use the same weights as `-fp8`; the eval picks E.4's model |
| [0024](../decisions/0024-ci-cd-github-actions.md) | CI/CD (**beyond the course, your scope**) | **Your answers:** GitHub Actions + wrangler; production only; PRs with required checks; smoke tests every deploy and the full E2E nightly. Why the order is ledger → migrations → app → smoke. **Step 1's addendum:** `puppeteer-core` (not a 150 MB Chrome download per PR), a synthetic receipt, and why cleanup deletes D1 *last*. **Step 4:** merge = deploy; checks gate it; rollback is manual, with the exact commands in the job summary; migrations never roll back, so they must be backward-compatible |
| [0025](../decisions/0025-rag-worker-eval-seed-secret-fallback.md) | E.7 RAG Worker (**your four answers**) | **Eval:** 3×10 items (clean, receipt shorthand, *group-dependent*); you approve the labels; the 2×2 grid picks the model. **Seed:** ~50 items, `groupId "seed"`, a top-up below a measured threshold. **Secret:** an RPC argument checked against a *list*, so the F.5 rotation is config. **Fallbacks:** a budget per call, no retries; the cron is the retry; search falls back to keyword |
| [0023](../decisions/0023-group-ledger-arbitrates-settlements.md) | **The Durable Object** | **Your answers:** it *arbitrates* (D1 stays the truth); settlements go through it now, voids and leaving when built; the idempotency key is minted when the form renders; the "before" is recorded and the "after" shown live. Mechanism: `blockConcurrencyWhile`, because a DO admits the next request while it awaits D1 |
| [0022](../decisions/0022-semantic-search-design.md) | How does search work? | **Your answers:** across all your groups; item vectors **plus** one per hand-typed expense; each reads "item, at merchant", never the raw shorthand. Vectorize holds ids only, and D1 re-checks every hit |
| [0021](../decisions/0021-receipt-reading-approach.md) | How are receipts read? | **Your answers:** two Llamas compared; each line stored raw *and* expanded (a new column, which is `REQ-D.5`); a "Read receipt" button; you confirm the total; test receipts are yours plus SROIE (CC-BY-4.0). You accepted Meta's Llama 3.2 licence. **Model: Llama 4 Scout** (your choice): 5/6 totals against 4/6, valid JSON 12/12 against 9/12, JSON mode, twice as fast, twice the neurons |
| [0020](../decisions/0020-receipts-via-presigned-r2-urls.md) | How do receipt photos get stored? | The browser PUTs straight to R2 with a 5-minute presigned URL; the Worker only signs, and stores the key. It's checked on attach (group prefix, exists, ≤10 MB, image type) |
| [0019](../decisions/0019-kv-holds-recent-descriptions-not-balances.md) | What goes in KV? | Recent descriptions for autofill, **not** the balance: KV can be a minute stale, and a stale balance is a wrong balance. **Your choice**, which changed the original plan |
| [0018](../decisions/0018-splitr-domain-model.md) | The domain model | **Your 8 answers:** equal shares (items are informational); a settlement is "A paid B", valid only if A owes and B is owed; void-and-re-add, never edit; one currency per group; one rotatable invite code; leave only when square; any member may void; only the two parties record a settlement |

**Still to decide, each with its own ADR:** the vision model (by spike, D.6); whether the DO *owns* the balance or only
*arbitrates*, and whether **every** balance-changing write goes through it (E.1,
raised by ADR-0018); which Worker hosts `scheduled()` (E.8).

## 3. Evidence: what you'll show, and what each piece proves

| File | Proves | The line to say |
|---|---|---|
| [REQ-B.2 server-side validation](../evidence/REQ-B.2-server-side-validation.md) | A curl past the browser is rejected by the server | "Client validation is UX, never a control" |
| [REQ-B.3 no client-side data calls](../evidence/REQ-B.3-no-client-side-data-calls.md) | The dashboard renders on the server | ⚠️ Read F-2 first (section 6) |
| [REQ-B cluster verification](../evidence/REQ-B-cluster-verification.md) | QA's adversarial re-run, and how F-1 was found | "Brief QA to attack, not to confirm" |
| [REQ-C.1 deployed](../evidence/REQ-C.1-deployed.md) | Live on Workers; a forged `Origin` gets 403 | "F-1 came back on deploy, and the `Origin` header caught it" |
| [REQ-C.2 throwaway Worker](../evidence/REQ-C.2-throwaway-worker.md) | The full lifecycle, including a clean teardown | Var vs secret, and "tail says `Ok` even for a 401" |
| [REQ-C.3 first edge LLM call](../evidence/REQ-C.3-first-edge-llm-call.md) | Llama through a binding; the categorisation spike | "14/15 on descriptions, **2/10 on receipt shorthand**: that's why RAG" |
| [REQ-D.1 schema and first migration](../evidence/REQ-D.1-schema-and-first-migration.md) | The generated migration is genuinely the first; the database refuses bad rows itself | "Six bad writes, six refusals, each naming the rule it broke" |
| [D.3 writes through D1](../evidence/REQ-D.1-writes-through-d1.md) | The whole flow in two real browsers, on production; `REQ-B.4`'s empty states render; 11 tests plus a mutation check | "The fixture was built to be swapped, and no page changed its contract" |
| [REQ-D.2 KV recent descriptions](../evidence/REQ-D.2-kv-recent-descriptions.md) | The one KV value: rebuildable, not primary, harmless if stale | "I deleted the key by hand and the page didn't notice" |
| [REQ-D.3 presigned uploads](../evidence/REQ-D.3-presigned-receipt-uploads.md) | Photos never touch the Worker; the attach check refuses bad objects | "The only request to our server during an upload was 52 bytes" |
| [D.6 vision spike and receipt reading](../evidence/D.6-vision-spike.md) | Scout chosen on evidence; "Read receipt" works in production; the confirm gate is enforced on the server | "The AI suggests, the human confirms the money, and I proved a UI bug can't skip that" |
| [REQ-D.5 schema change](../evidence/REQ-D.5-unanticipated-schema-change.md) | `raw_text` added by a second migration, with the first untouched | "A test result forced it: 2/10 on receipt shorthand" |
| [REQ-D.4 semantic search](../evidence/REQ-D.4-semantic-search.md) | Search by meaning 11/11, keyword 1/11 (3/11 any-word) | "'The thing for the kitchen': keyword says Bangkok Street *Kitchen*, meaning says IKEA" |
| [**RAG categorisation eval**](../evidence/REQ-E.4-rag-categorisation-eval.md) | RAG beats no RAG, on labels **you** approved: 8B 23/30 → **28/30**; group habits 5/10 → 8/10; and 70B is *worse* at following a group | "Same text, 'Peroni 4 pack', two groups, two right answers: only the group's own history can know. And the bigger model got it wrong more" |
| [**The double settlement, WITH the DO**](../evidence/REQ-E.1-group-ledger-refuses-the-double-settlement.md) | **The "after"**: 201 + 409 in 5/5 production rounds (£200 for five £40 debts, against £280 before); the lock is proved necessary | "Same race, same code path, one change: the arbiter. **The centre of the demo**" |
| [**The double settlement, without the DO**](../evidence/REQ-E.1-double-settle-without-the-do.md) | **E.2's "before"**: two concurrent settlements of one £40 debt, both accepted | "The ledger is internally consistent and factually wrong. That's why the DO exists." **The centre of the demo** |

| [CI steps 1–4: the scripts and the first CI deploy](../evidence/CI-1-verification-scripts.md) | merge → checks → ledger → migrations → app → smoke, green on production in ~3 min (run 36134628524) | "Every merge is tested, deployed in order, and smoke-tested on the live site, with the rollback commands printed if it fails" |
| [CI step 1: the verification scripts](../evidence/CI-1-verification-scripts.md) | smoke, race, E2E and cleanup are back in the repo; all pass locally, and **smoke passes on production** (your run) | "`race.mjs` is the demo's live 'after'. `--keep` leaves the group so I can show it in a browser" |

## 4. The spoken questions: where your material is

These are answered aloud and unaided. The column on the right is where to study
from; **the answers must be yours.**

**Cluster A (`REQ-A.5`):** [notes](./cluster-a-questions.md)
1. Follow a request from the browser to the rendered page → README Flow 1
2. Why `fetchJson<T>` looks the way it does → `src/lib/fetch.ts`
3. Which hook would be wrong where → cluster-a-questions.md

**Cluster B (`REQ-B.6`)**
1. Server, client or both, for any component? → `src/app/**`: files with `"use client"` vs without
2. Where does validation actually run? → README Flow 3, ADR-0010
3. The loading state on a flaky network → the `loading.tsx` files, `REQ-B.4`

**Cluster C (`REQ-C.5`)**
1. A Worker vs a Node server → [the modules write-up](../../docs/modules-that-wont-run-on-workers.md), ADR-0014
2. Why `bcrypt` fails, and its replacement → the same write-up, paragraph 1 (bundles, then fails at runtime; `bcryptjs` is 59 ms vs the 10 ms CPU limit)
3. `ctx.waitUntil`, and what breaks without it → **live in the code now:** the KV refill and the KV delete both run after the response (ADR-0019, `recent-descriptions.ts`), and production KV was written that way (D.2 evidence). ADR-0016 §5 uses it for categorisation next
4. Secrets vs vars → C.2 evidence (`GREETING` vs `HELLO_KEY`), `wrangler.jsonc` (`BETTER_AUTH_URL` is a var, the secret isn't)
5. Where "cold start ≈ 0" breaks down → the Worker served from `MAD` while D1 is in `WEUR`. The isolate is everywhere; the data isn't

**Cluster D (`REQ-D.6`)**
1. Why does each piece of data live where it does? → money in D1 (it must be correct); recent descriptions in KV (only fast, fine a minute stale, ADR-0019); photos in R2 (big, and never through the Worker, ADR-0020); meaning in Vectorize (nearest-neighbour search, ids only, with D1 the truth, ADR-0022)
2. D1 transaction limits, and how you avoided them → writes use `db.batch` (one transaction, all or nothing); embeddings go to Vectorize, not D1, so the predicted D.7 bite never came. ⚠️ Still to check: D1's per-query bound-parameter limit on a large multi-row insert (backlog)
3. Why doesn't the upload pass through the Worker? → ADR-0020's Context: memory, cost, attack surface. The D.3 evidence shows the 52-byte request

**Cluster E (`REQ-E.7`)**
1. **In one sentence:** *"Splitr's Durable Object prevents the same debt being settled twice when two group members record the same payment at the same moment."*
2. What happens if the AI or service Worker is slow or down? → the ledger down means the settle form says "we couldn't record that, nothing was saved" (a 503), and nothing is half-written. The AI Worker's answer comes at E.7
3. Why is it safe to run the scheduled task twice? → ⏳ E.8/E.9

**Cluster F (`REQ-F.6`):** listed in
[`../requirements/clusters/`](../requirements/clusters/). Their material is built
in those clusters.

## 5. Deliverables that are documents, not code

| Deliverable | Where | State |
|---|---|---|
| `REQ-0.5` brief in the README | [README](../../README.md) | ✅ |
| `REQ-C.4` three modules that won't run on Workers | [docs/modules-that-wont-run-on-workers.md](../../docs/modules-that-wont-run-on-workers.md) | ✅ `bcrypt`, `puppeteer`, `socket.io` (your choice) |
| `REQ-X.5` architecture diagram | [README → Architecture](../../README.md#architecture) | 🟡 drawn; built vs planned marked; must be "accurate as shipped" at the end |
| `REQ-X.2` notes: what surprised you, what you got wrong, what you'd do differently | ⏳ **yours to write**. Raw material in section 6 | Not started |
| `REQ-X.6` EdgeLedger comparison | ⏳ after the seal lifts | Not started |
| `REQ-X.7` the Slack post | ⏳ at the end | Not started |

## 6. Traps and surprises: raw material for `REQ-X.2`

Observations collected while building. **Your notes must be your own words**;
these are here so you don't have to reconstruct them later.

- **F-1:** browser sign-in was broken while every curl passed, because curl
  sends no `Origin` header. It was marked Done on the wrong evidence. It came
  back on the first deploy and was caught that time. *Verify in the medium the
  requirement names.*
- **F-2 (still open, your decision):** the "0 fetch requests" evidence was taken
  on `next dev`, and a production build shows 9 prefetches. The deployed URL is
  now a production build you could re-measure on.
- **The course's model no longer exists.** It was deprecated before we reached
  it, and the docs were wrong twice about what replaces it. Only real calls
  were reliable.
- **`bcrypt` bundles fine and fails at runtime** (`__dirname`), which isn't
  the failure you'd predict.
- **`wrangler tail` says `Ok` for a 401 or a 404.** The outcome is about the
  invocation, not the HTTP status.
- **The 8B model: 14/15 on descriptions, 2/10 on receipt shorthand.** A test
  set that's too clean flatters the model.
- **A prompt injection passed as a valid label.** A closed list isn't
  protection; the trust boundary is.
- **The workerd runtime types broke the Next.js typecheck** through a DOM
  `Element` clash.
- **A `var` leaked into local preview** and broke auth there too. Wrangler reads
  `.dev.vars`, not `.env`.
- **A Durable Object is not automatically a lock.** It admits the next
  request while it awaits D1, so the check and the write needed
  `blockConcurrencyWhile`. Without it, a 2-way race failed only ~1 run in 12,
  and a 30-way race failed 6/6. That's why the test is 30-way.
- **The loser was told the wrong winner**, because two joined columns were
  both called `name`, and D1's batch results are keyed by column name.
- **Every new Route Handler can carry its own copy of Better Auth** (~190 KiB
  gzipped). The Worker went from 76% to 83% of the free limit; bisected to
  that cause.
- **Every Cloudflare binding was silently `any` for two clusters.** A
  declaration file plus `skipLibCheck` hid the missing type names. A
  one-line probe (`const x: number = env.DB`) exposed it. Now they're real
  types, and all the existing code happened to be correct.
- **A just-saved expense takes 45–90 s to become searchable**, because
  Vectorize writes are asynchronous.
- **Verifying straight after a deploy can hit the old version.** The first
  production search test missed for exactly that (most likely) reason.
- **"Money needs a human" was silently broken once.** The "confirm the
  amount" gate landed on the wrong element. The browser test caught it, and
  the rule is now enforced on the server as well, not only by a button.
- **Twice today, an edit changed the first match of a string that appeared
  twice** (the gate, and earlier the brief's table). The lesson: check that
  the text you're replacing is unique before you replace it.
- **A better prompt made the smaller model worse.** Llama 3.2 went from 12/12 to
  9/12 valid JSON when the prompt got longer; it wrote a Markdown report
  instead. And a "tax summary" line fooled *both* models, even when told
  explicitly to ignore it.
- **The "pinned" Content-Type wasn't pinned.** Cloudflare's own `aws4fetch`
  example signs only `host`, and a `text/html` PUT was accepted. It was found
  by attacking it, and fixed with `allHeaders: true`. The attach check would
  have caught it anyway: defence in depth, demonstrated.
- **The plan said "KV balance snapshot", and the requirement's own note rules
  that out.** It was caught on re-reading `REQ-D.2` at D.4, before building it.
- **The sequential duplicate was refused, and the concurrent one wasn't.** Same
  rule, same code. The only difference is *timing*, and that's the whole case
  for a Durable Object.
- **ADR-0012 promised tests "now", and none existed until D.3.** The first run
  of the mutation check proved they catch the bug they're for.
- **The first migration collided with tables that already existed**, and
  production held your own account. The row counts were checked before
  anything was dropped, and it turned out not to be empty.

- **The E2E found a bug no one had noticed.** The first click below the
  autofocused description is lost: blurring it shows an error, which pushes the
  page 24 px down between mousedown and mouseup. Setting the file directly
  (`uploadFile`) hid it; clicking like a person exposed it. Lesson one again:
  verify in the medium the requirement names. **Fixed**, by the spec's own rule
  (§7.4, "never validate an untouched field": autofocus isn't a touch) and by
  reserving each error's line. The E2E now fails if it comes back.
- **The test raced the app before it tested it.** Streaming skeletons,
  pre-hydration clicks, and eventually consistent search each failed a run
  before the app did. A browser test has to wait for what a person waits for.

- **The build had been connecting to Cloudflare, and nobody knew.** Simulating
  CI with no login showed that `next build` started the dev bindings proxy, and
  pre-rendered signed-in pages through D1, because the session code opened the
  database before reading the request. On a laptop, credentials hid both.
  Fixing the order (request first) made `ci.yml` need no secrets at all
  (ADR-0024, step-2 addendum).

- **Local dev lied about `waitUntil`.** With the AI Worker up, local saves
  took the AI's time, as if the response waited for it. A timer showed the
  service-binding call itself blocks under `next dev` (wrangler's proxy); in
  workerd it doesn't. With the AI Worker *down*, saves took 60 ms. That's the
  REQ-M.7 proof, and why it gets measured on production too.

## 7. Open questions waiting on you

Kept in sync with [`backlog.md`](./backlog.md):

- **Set the two AI secrets** after the step-4 merge deploys `splitr-ai` (commands in the handover).

- **F-2:** demo on `next dev`, or re-word the criterion and record both logs.
- **The `wiki/techstack/` seal leak:** move the EdgeLedger-derived parts, or accept them.
- **D.6:** should OCR expand receipt abbreviations?
- **Tell the course owners** that `REQ-C.3`'s model is dead?
- **D.8:** does search cover the current group or all your groups? The brief and the build plan disagree.
- **Re-register on the live site.** Your account was dropped by the first migration, your choice.
- **The seal leak also covers `wiki/context/glossary.md`** (EdgeLedger's domain terms).
- **D.6: photograph 3–5 English receipts** into `splitr/.data/receipts/mine/`. Then you choose the vision model from the spike.
- **CI/CD setup (ADR-0024):** the Cloudflare API token, the GitHub secrets, the `production` environment, branch protection and the `workflow` scope. (§6 is amended, 2026-09-25.)
- **Spoken answers:** `REQ-A.5`, `REQ-B.6`, `REQ-C.5`.
