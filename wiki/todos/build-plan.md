# Build plan — Splitr

Derived from the requirements. **Cluster order is mandatory** (`REQ-M.2`), and
each step adds exactly one capability. Do not parallelise, do not jump ahead.

Scope per [ADR-0005](../decisions/0005-optional-scope.md): all `[MUST]`s, plus
Cluster F. Queues (`REQ-E.8`) is out.

---

## Step 0 — Repo, brief and toolchain · ✅ done

| # | Task | Req | State |
|---|---|---|---|
| 0.1 | Create the GitHub repo — **Raffaele only** | `REQ-0.3` | ✅ [rafio-dgn/splitr](https://github.com/rafio-dgn/splitr) |
| 0.2 | Clone it beside `typescript-cloudflare-project/` | `REQ-0.3` | ✅ |
| 0.3 | Move `wiki/` + `CLAUDE.md` into the repo | — | ✅ |
| 0.4 | Write the README with the project brief | `REQ-0.5` | ✅ |
| 0.5 | Install the toolchain: Node 24 LTS via nvm, npm, Wrangler | `REQ-0.1` | ✅ |
| 0.6 | `wrangler login` — **interactive, Raffaele** | `REQ-0.1` | ✅ done by 2026-09-23 |

**Exit:** ✅ repo exists with the brief in its README; toolchain verified.
**Not yet committed** — nothing has been committed or pushed. Awaiting the go-ahead.

---

## Cluster A — Language and runtime · *local only* · ✅ done

| # | Task | Req | State |
|---|---|---|---|
| A.1 | `create-next-app --typescript --app --tailwind --src-dir` | `REQ-A.1` | ✅ Next 16.3.5 / React 19.2.8 |
| A.2 | Review and prune every scaffolded file | `REQ-A.4` | ✅ 5 demo SVGs, favicon, demo page removed |
| A.3 | `src/lib/fetch.ts` → `fetchJson<T>(url): Promise<T>` | `REQ-A.2` | ✅ |
| A.4 | Marketing landing page for Splitr | `REQ-A.3` | ✅ serves HTTP 200 |
| A.5 | Answer the three cluster questions | `REQ-A.5` | ⏳ **Raffaele** — [notes](./cluster-a-questions.md) |

**Exit:** ✅ typed Next.js app running locally with a real landing page.
`npm run build`, `tsc --noEmit` and `eslint` all clean.

**Gotcha hit:** `create-next-app` refuses a non-empty directory, so the scaffold
went to a temp dir and was merged in — which also protected the README carrying
`REQ-0.5`. And `LayoutProps<"/">` in `layout.tsx` is a **generated** global that
only exists after a build, so `tsc` fails on a fresh clone until `npm run build`
has run once.

---

## Cluster B — Routing and forms · *local only*

| # | Task | Req | Done |
|---|---|---|---|
| B.1 | Route tree: public routes + `(app)` group. **Include the public `/join/[invite]` page now** — Turnstile needs it at F.2 | `REQ-B.1` | ✅ 2026-09-22 — 15 routes; `/join/[inviteCode]` built, Turnstile's slot reserved |
| B.2 | Add auth from a library, black box only (`getSession()` + route gating). **ADR needed** for which | `REQ-B.5` | ✅ 2026-09-22 — Better Auth, [ADR-0009](../decisions/0009-better-auth-on-local-sqlite-via-drizzle.md); QA finding F-1 (origin pinned to one port, silent sign-out) fixed and re-verified in a browser on both ports, [ADR-0013](../decisions/0013-base-url-is-the-request-host-not-a-port-in-env.md) |
| B.3 | Shared zod schema for the "add expense" form; client + server both validate | `REQ-B.2` | ✅ 2026-09-22 — both halves exercised |
| B.4 | **Prove it:** curl an invalid payload straight at the server; capture output | `REQ-B.2` | ✅ [evidence](../evidence/REQ-B.2-server-side-validation.md) |
| B.5 | Group dashboard as a Server Component; verify no client-side data calls in devtools | `REQ-B.3` | ✅ [evidence](../evidence/REQ-B.3-no-client-side-data-calls.md) — 0 fetch/xhr |
| B.6 | `loading.tsx`, error boundary, empty states | `REQ-B.4` | ✅ 2026-09-22 — 6 loading, 6 error + 1 section boundary, 13 surfaces |
| B.7 | Answer the three cluster questions | `REQ-B.6` | ⬜ outstanding — the only Cluster B task left |

**Exit:** ✅ **Part 1 complete** — typed, working app, running locally, no
Cloudflare. Reached 2026-09-22 apart from B.7, which is a spoken answer, not code.
**Watch:** B.1 — designing the public join page now, rather than retrofitting at
Cluster F, is the single highest-value bit of foresight in this plan.

---

## Cluster C — Workers

| # | Task | Req | Done |
|---|---|---|---|
| C.1 | Choose the deploy adapter: OpenNext vs Pages. **ADR** | `REQ-C.1` | ✅ 2026-09-23. OpenNext, [ADR-0014](../decisions/0014-opennext-as-the-deploy-adapter.md). A third option, vinext, was also weighed |
| C.2 | Deploy the Cluster B app to Cloudflare | `REQ-C.1` | ✅ 2026-09-23. [Live](https://splitr.raffaele-digennaro.workers.dev); D1 brought forward for the auth tables, [ADR-0015](../decisions/0015-one-database-driver-d1-everywhere.md); [evidence](../evidence/REQ-C.1-deployed.md) |
| C.3 | Throwaway hello-world Worker: `npm create cloudflare@latest`, configure `wrangler.jsonc`, `wrangler secret put`, curl it, `wrangler tail` it | `REQ-C.2` | ✅ 2026-09-23. `splitr-hello`, [evidence](../evidence/REQ-C.2-throwaway-worker.md) |
| C.4 | Add an `ai` binding; answer with `@cf/meta/llama-3.1-8b-instruct`. **Per [ADR-0016](../decisions/0016-ai-integration-strategy.md) §12:** a no-RAG line-item categoriser over the closed taxonomy, measuring latency, output format and failure modes. It's also the eval's no-RAG baseline | `REQ-C.3` | ✅ 2026-09-23. `-fp8` stands in for the deprecated model ([ADR-0017](../decisions/0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md)). 14/15 on descriptions, **2/10 on receipt shorthand**, [evidence](../evidence/REQ-C.3-first-edge-llm-call.md) |
| C.5 | **Tear the throwaway Worker down cleanly** | `REQ-C.2` | ✅ 2026-09-23. Worker, secret and directory deleted; before and after recorded in the [evidence](../evidence/REQ-C.2-throwaway-worker.md) |
| C.6 | Write up three modules that won't run on Workers + replacements → commit to the repo | `REQ-C.4` | ✅ 2026-09-24. `bcrypt`, `puppeteer`, `socket.io` (Raffaele's choice), three paragraphs, [`docs/…`](../../docs/modules-that-wont-run-on-workers.md) |
| C.7 | Answer the five cluster questions | `REQ-C.5` | ⬜ |

**Exit:** Splitr is live on Cloudflare; first edge LLM call proven.
**Watch:** C.5 is part of the requirement, not tidying. C.6 is a written
deliverable that is easy to forget.

---

## Cluster D — Storing data

| # | Task | Req | Done |
|---|---|---|---|
| D.1 | Design the D1 schema in `src/db/schema.ts` with Drizzle: users, groups, members, expenses, expense_items, settlements. **ADR** for the split model (equal shares vs per-item). Item `category` is constrained to the 12 keys, default `uncategorised` ([ADR-0016](../decisions/0016-ai-integration-strategy.md) §4). The auth tables that already existed in D1 (ADR-0015) were **dropped and recreated by the first migration**, so the history is complete (see the evidence) | `REQ-D.1` | ✅ 2026-09-24. Equal shares, pairwise settlements, void-not-edit ([ADR-0018](../decisions/0018-splitr-domain-model.md)); [evidence](../evidence/REQ-D.1-schema-and-first-migration.md) |
| D.2 | `drizzle-kit generate`, apply the migration | `REQ-D.1` | ✅ 2026-09-24. `0000_initial_schema.sql`, applied locally and remotely |
| D.3 | Wire expenses + settlements through D1; group balance computed from them | `REQ-D.1` | ✅ 2026-09-24. Groups, joining, expenses and settlements in D1; the fixture is gone; **settlement is naive by design** (E.2's before); [evidence](../evidence/REQ-D.1-writes-through-d1.md) |
| D.4 | KV: hot per-group balance snapshot, rebuildable from D1 | `REQ-D.2` | ⬜ |
| D.5 | R2 **presigned URL** flow: Worker issues the URL, client uploads the photo direct, only the key is stored | `REQ-D.3` | ⬜ |
| D.6 | Vision model itemises the receipt into a **draft the user confirms**, never straight into the ledger. **Spike every available vision model on the same ~10 real English receipts**, then write the ADR for the choice ([ADR-0016](../decisions/0016-ai-integration-strategy.md) §2, §10). Manual entry stays the fallback | `REQ-D.3`, ADR-0004 | ⬜ |
| D.7 | Vectorize: **one vector per line item** with `@cf/baai/bge-base-en-v1.5`, `groupId` in the metadata, upsert. Plus the **seed corpus** of about 50 labelled example items for the RAG cold start ([ADR-0016](../decisions/0016-ai-integration-strategy.md) §7, §8) | `REQ-D.4` | ⬜ |
| D.8 | `/search` route: semantic search over past expenses, **scoped to the viewer's group**, with item hits grouped back to their expense. **Show it beats keyword** with about 10 labelled queries, semantic vs keyword ([ADR-0016](../decisions/0016-ai-integration-strategy.md) §9) | `REQ-D.4` | ⬜ |
| D.9 | Let a schema change arise naturally; migrate; update call sites | `REQ-D.5` | ⬜ |
| D.10 | Answer the three cluster questions | `REQ-D.6` | ⬜ |

**Exit:** ✅ **Part 2 complete** — every store in use, each justifiable.
**Watch:** D.5 must not stream through the Worker. D.7 is where D1's
transaction-size limit will likely bite (`REQ-D.6` Q2) — batch, and record what
you hit.

---

## Cluster E — Shared state and background work · *the heart of it*

| # | Task | Req |
|---|---|---|
| E.1 | `GroupLedger` Durable Object, `idFromName(groupId)`. Validates pre-conditions, writes to D1, returns the new balance. **ADR:** does the DO own the balance or only arbitrate? | `REQ-E.1` |
| E.2 | **Refuse the second settlement.** Two concurrent settlements of the same debt → one wins, one is told it lost. 🟡 **"Before" captured on 2026-09-24:** [both accepted](../evidence/REQ-E.1-double-settle-without-the-do.md). The "after" is owed | `REQ-E.1`, `REQ-P.3` |
| E.3 | `idempotencyKey` **header**, cached 24h in DO storage; replay returns the cached result, no second write | `REQ-E.2` |
| E.4 | DO alarm evicts expired idempotency entries | `REQ-E.2` |
| E.5 | `[AUDIT]` line on every mutation: actor, action, target, timestamp, outcome | `REQ-E.3`, `REQ-M.5` |
| E.6 | Call the DO from the Server Action via **service binding**; DO worker `workers_dev: false` | `REQ-E.5` |
| E.7 | AI Worker doing RAG **line-item categorisation**: retrieve the group's similar items (seed corpus as fallback) → Llama picks from the closed list → zod-validated. Started with `ctx.waitUntil` *after* the write. `workers_dev: false`, shared-secret check, **fallback so failure never blocks the write**. **Then move every model call behind it** (embeddings, OCR) and remove the app Worker's `ai` binding. Run the ~30-item eval, with and without RAG ([ADR-0016](../decisions/0016-ai-integration-strategy.md)) | `REQ-E.4`, `REQ-M.7` |
| E.8 | `scheduled()` handler: nightly settle-up reminders, and a backfill of items still `uncategorised` (**never** `other`), UPSERT-on-conflict | `REQ-E.6` |
| E.9 | **Run the cron twice; prove identical result.** Add a manual trigger | `REQ-E.6` |
| E.10 | Answer the three cluster questions — Q1 in one sentence | `REQ-E.7` |

**Exit:** the contested write is arbitrated and demonstrable.
**Watch:** E.2 is the whole project. Build the *failure* case first — show the
double-settle bug without the DO, then fix it with one. That contrast is the demo.

---

## Cluster F — Protecting the app

| # | Task | Req |
|---|---|---|
| F.1 | Rate-limit binding on the settle-up route; 6 rapid requests → 6th returns **429**. **Write the window/count rationale** | `REQ-F.1` |
| F.2 | Turnstile on the public `/join/[invite]` form; verify server-side in the Server Action | `REQ-F.2` |
| F.3 | **Forge a submit; confirm the server rejects it.** Capture the command | `REQ-F.2` |
| F.4 | Audit lines as parseable JSON; prove `wrangler tail \| grep AUDIT` works | `REQ-F.3` |
| F.5 | AI Gateway in front of **every** model call — vision, Llama, embeddings. Caching, logs, rate limits, spend cap | `REQ-F.4` |
| F.6 | Secret-rotation drill: **wrong way first**, observe the breakage; then dual-key → deploy consumer → update producer → retire old key | `REQ-F.5` |
| F.7 | Write up both rotation outcomes | `REQ-F.5` |
| F.8 | Answer the two cluster questions | `REQ-F.6` |

**Exit:** ✅ **Part 3 complete.**
**Watch:** F.5 says *every* model call — three model types by now. F.6's
deliberate breakage is the requirement, not a mishap.

---

## Finish

| # | Task | Req |
|---|---|---|
| X.1 | Final deploy | `REQ-X.4` |
| X.2 | Architecture diagram into the README. 🟡 **Drawn early (2026-09-24)**, with built vs planned marked. Finish it by making it accurate as shipped | `REQ-X.5` |
| X.3 | Consolidate the running notes: what surprised you, what you got wrong, what you'd do differently | `REQ-X.2` |
| X.4 | 🔓 **Quarantine lifts.** Read EdgeLedger + `wiki/reference-edgeledger/`; write the comparison | `REQ-X.6` |
| X.5 | Rehearse the walkthrough from memory | `REQ-X.3` |
| X.6 | Post in `#project-jedi`: name, repo URL, deployed URL, description, services used | `REQ-X.7` |
| X.7 | 15-minute demo | `REQ-X.8` |

---

## Running throughout

Not steps — continuous obligations:

- **`REQ-X.2` notes start at Cluster A.** "What surprised you" cannot be
  reconstructed later. Capture it as it happens.
- **Every mutation emits `[AUDIT]`** from E.5 onward (`REQ-M.5`).
- **Every file reviewed and understood** (`REQ-M.3`, `REQ-A.4`).
- **Every decision gets an ADR** — `REQ-M.4` is tested at the demo.
- **Changelog + AI-audit entries every turn** (`CLAUDE.md` §3).
- **EdgeLedger stays sealed until X.4.**

## Evidence to keep as you go

Demo material. Capture at the moment it works, not afterwards:

| Evidence | Step |
|---|---|
| curl bypassing client validation, rejected | B.4 |
| devtools: no client-side data calls | B.5 |
| D1 transaction limit hit, and the workaround | D.7 |
| Semantic search beating keyword search | D.8 |
| Double-settle failing **without** the DO, then refused **with** it | E.2 |
| Idempotency replay: one write, identical response | E.3 |
| Cron run twice, identical result | E.9 |
| 6th request → 429 | F.1 |
| Forged submit rejected | F.3 |
| `wrangler tail \| grep AUDIT` parseable | F.4 |
| Secret rotation broken, then clean | F.6 |

## Decisions still owed

| Decision | By | Req |
|---|---|---|
| Auth library | B.2 | `REQ-B.5` |
| Deploy adapter — OpenNext vs Pages | C.1 | `REQ-C.1` |
| Split model: equal shares ✅ ([ADR-0018](../decisions/0018-splitr-domain-model.md)) | D.1 | `REQ-D.1` |
| Vision model for receipt OCR, chosen by spike ([ADR-0016](../decisions/0016-ai-integration-strategy.md) §10) | D.6 | ADR-0004 |
| DO owns the balance, or only arbitrates | E.1 | `REQ-E.1` |
| Test strategy | before A.1 | `../guidelines/testing.md` |
