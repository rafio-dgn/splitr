Source: https://jedi.newpage.io/typescript-cloudflare/course (all 21 slides)
Retrieved: 2026-09-22
Captured by: Raffaele Di Gennaro (pasted into session; site is login-gated)
Status: authoritative capture — DO NOT EDIT

---

# raw_requirements

**Source:** Project JEDI — TypeScript + Cloudflare learning path (`jedi.newpage.io/typescript-cloudflare/course`)
**Scope:** every requirement stated across all 21 slides of the course, in English, grouped by phase.
**Reading key:** `[MUST]` = explicitly required to complete the path · `[OPTIONAL]` = marked optional or "if needed" on the slide.

---

## 0. Prerequisites

### 0.1 Knowledge you are expected to already have
- `[MUST]` JavaScript fundamentals: functions, objects, arrays, modules.
- `[MUST]` Basic React: components and props (rusty is acceptable — each cluster links refreshers).
- `[MUST]` Git basics and comfort working in a terminal.
- `[MUST]` How the web talks: HTTP requests, responses, and JSON.

### 0.2 Tools and platforms to install / register before Cluster A
- `[MUST]` Node.js **20 or newer**, with npm.
- `[MUST]` A code editor (VS Code or similar).
- `[MUST]` Git **and** a GitHub account — needed to create the project repository and clone the reference repository.
- `[MUST]` A Cloudflare account (free tier is sufficient for the whole path).
- `[MUST]` An agentic coding tool — Claude Code, Cursor, or Copilot (any one).
- `[MUST]` Wrangler, Cloudflare's CLI, installed via npm.

---

## 1. Working method (how the course must be followed)

- `[MUST]` There is no separate coursework: **one single project** is built and extended across six clusters.
- `[MUST]` Step 1 — Pick a project idea and write down what it is and who would use it.
- `[MUST]` Step 2 — Work through the clusters **in order**, adding exactly one capability per step.
- `[MUST]` Step 3 — Build with an agentic tool writing alongside you; **read everything it produces** rather than pasting blindly.
- `[MUST]` Step 4 — Understand each choice: be able to explain every decision in your own words.

---

## 2. Project selection requirements

### 2.1 Building-block coverage rule
- `[MUST]` Choose a project that naturally uses **about five** of the Cloudflare building blocks listed below, so each one earns its place.
- `[MUST]` If the idea only uses three or four, **add a stretch feature** to cover the rest.

### 2.2 The building blocks to choose from
| Block | Purpose | When it fits |
|---|---|---|
| **D1** | SQL database | Related records you query — the app's main store |
| **KV** | Key-value cache | Small, hot values that change often and can be rebuilt if lost |
| **R2** | Object store | Files: uploads, exports, generated documents |
| **Durable Objects** | Coordination | Several users change one thing at once and it must stay correct |
| **Queues** | Background jobs | Deferred work that must survive a crash and can retry |
| **Workers AI + Vectorize** | LLMs & search | Call an LLM, or search your own data by meaning |
| **Cron** | Scheduled work | Recurring work: a nightly summary or a cleanup sweep |
| **Turnstile + Audit** | Trust & records | Bot-check public forms; keep a durable log of every change |

### 2.3 Reference examples already built by the team (for inspiration, not requirements)
- **Recover Well** — post-surgical recovery monitoring; patients log vitals and wound photos, clinicians get a triage dashboard *(Workers AI, D1, R2, Queues)*.
- **Applicant tracker** — recruiter ATS with candidate pipeline, interview scheduling, AI-generated interview questions *(Workers, AI questions)*.
- **Larum** — budgeting app that recomputes the spending plan the moment an unplanned expense lands *(Workers, D1, Cron)*.
- **Care platform** — book appointments, issue digital prescriptions, order medicine from a pharmacist *(Workers, Pages, Claude)*.
- **Meeting assistant** — pulls Teams transcripts, writes summary and action items, pushes them to Jira *(Workers AI, R2, Jira)*.
- **Drug-interaction checker** — check whether two drugs are safe together, find nearby stores that stock them *(Workers, D1, LLM)*.

### 2.4 Suggested project ideas ("ideas to steal")
- **ClaimCheck — MLR pre-flight.** Medical/regulatory reviewers upload a promotional asset; AI extracts every product claim and checks each against the approved-claims library before MLR. Two reviewers can open the same asset, so one verdict must win. *(Claim extraction with Llama · approved-library match via RAG · route to one reviewer · nightly label-change sweep)*
- **BrandVoice — on-brand copy on tap.** Commercial/marketing teams submit a brief; AI drafts on-brand variants grounded in approved messaging; marketers claim campaign slots — one slot, one owner. *(Draft variants with Llama · ground in approved copy via RAG · claim a campaign slot · queue the generation)*
- **TrialDesk — study inbox that answers first.** Clinical operations: incoming site queries get an instant AI draft grounded in the protocol and past answers; coordinators race to claim and send, so the claim is contested. *(Draft replies with Llama · search protocol & history via RAG · claim a query · bot-check the intake form)*
- **BenchBook — the lab notebook that writes itself.** Lab scientists dictate at the bench; AI transcribes and structures steps and reagents into a clean entry; shared reagent stock updates from many benches at once. *(Whisper transcription · structure the entry with Llama · reconcile reagent stock · "have we run this?" search)*
- **InsightDesk — field intelligence, summarised.** Commercial field teams log visit notes by voice; AI transcribes, summarises and tags them so managers see themes across a territory; notes on one account merge cleanly. *(Whisper · summarise & tag with Llama · merge per-account notes · territory-wide search)*
- **Splitr — snap the bill.** Anyone splitting a shared expense photographs a receipt; a vision model itemises it and the group settles one shared balance; two people settling at once must not double-count. *(Vision receipt reading · photos in R2 · hold the shared balance · auto-categorise items)*

### 2.5 Reference architecture (how ClaimCheck is wired) — the shape a full build is expected to take
- **Client tier:** a web app (reviewer dashboard: upload an asset, see verdicts) and a public intake form (agencies drop assets in).
- **Edge tier:** Next.js on Workers (routes + Server Actions); Turnstile bot check gating the public form; a rate-limit write guard on the submit route; structured audit logs, one line per decision.
- **Coordination tier:** a Durable Object acting as verdict arbiter (one asset, one reviewer); Queues for the claim-check pipeline with retries then a DLQ; Cron for the label-change sweep that re-flags on updates.
- **AI tier:** AI Gateway as one front door (caching, logs, spend cap); Workers AI for claim extraction; Vectorize for RAG matching against the approved library.
- **Data tier:** D1 for assets & verdicts (the relational core); KV as the hot, rebuildable approved-claim cache; R2 for asset files via presigned uploads.

---

## 3. Start-building checklist (before Cluster A)

1. `[MUST]` Create a **new GitHub repository** for your project. Every cluster's work lands here.
2. `[MUST]` Clone the **reference repository** next to it, read-only:
   `git clone https://github.com/NewPage-Solutions-Inc/typescript-cloudflare-project.git`
   It holds **EdgeLedger**, the finished reference build.
   - `[MUST]` Never build inside it.
   - `[MUST]` Do not copy from it at this stage — it is for comparison later.
3. `[MUST]` Write your pick at the top of your repo's README: **what it is, who it's for, and the contested write at its heart.**
4. `[MUST]` Open Cluster A with your agentic tool running.

---

## PART 1 — FOUNDATIONS
*Work entirely in TypeScript, React and Next.js. No Cloudflare yet. Part 1 ends with a typed, working application running locally.*

### 4. Cluster A — The language and the runtime

**What to build**
- `[MUST]` Scaffold a fresh app:
  `npx create-next-app@latest <yourapp> --typescript --app --tailwind --src-dir`
- `[MUST]` Write a typed helper `fetchJson<T>(url): Promise<T>` at `src/lib/fetch.ts`.
- `[MUST]` Build the marketing landing page, so there is something real to click.
- `[MUST]` Audit **every** file the agent writes — don't let any sneak in.

**Questions you must be able to answer**
- Can you follow a request from the browser to the page it renders?
- Why does `fetchJson<T>` look the way it does?
- Which hook would be wrong in which situation?

**Concepts to master, and what each gets you**
- *The TypeScript execution model* — types disappear at runtime; the compiler checks but never runs your code. Tells you what is checked vs. what actually runs, and why `any` is a real runtime risk.
- *Narrowing, unions, generics* — describe your data so the compiler catches mistakes early, and write helpers like `fetchJson<T>` cleanly.
- *React hooks* — reach for the right hook; avoid stale-closure traps.
- *Controlled inputs & lifting state* — wire a multi-field form without losing state across re-renders.
- *Promises & async/await* — explain why `fetch` returns a `Response`, not data, and what `await` really does.

**Optional refreshers:** Matt Pocock · TS Crash Course · Master TypeScript · React Hooks · useState in 15 min.

### 5. Cluster B — Routing and forms

**What to build**
- `[MUST]` Build the route tree: public routes plus the main `(app)` group.
- `[MUST]` One form on a **shared zod schema**; prove it runs on both sides by curl-ing an invalid payload past the client and confirming the server rejects it.
- `[MUST]` Make the main page a **Server Component** that fetches server-side; verify in devtools that there are **no client-side data calls**.
- `[MUST]` Add `loading.tsx` and an error boundary.
- `[OPTIONAL]` If auth is needed: drop in a library (Auth.js, Lucia, Clerk) as a black box — just `getSession()` and route gating. The reference build EdgeLedger ships Workers-native auth (Web Crypto hashing, sessions in KV); read it afterwards.

**Questions you must be able to answer**
- For any component: server, client, or both — and why?
- Where does your form's validation actually run?
- What happens to your loading state on a flaky network?

**Concepts to master, and what each gets you**
- *The App Router* — place every route in the right file without guessing.
- *Server vs client components* — decide which side each component belongs on, and say why.
- *Server Actions* — wire forms to server mutations with no API route and no manual fetch.
- *One shared zod schema* — validate the same way on client and server, with clean field errors.
- *Suspense & error boundaries* — give every async page a loading, error and empty state.

**Optional refresher:** Master Next.js the easy way — App Router & Server Actions.

---

## PART 2 — THE EDGE PLATFORM
*The app leaves localhost: deploy to Cloudflare, learn what the Workers runtime will and won't run, then put each kind of data where it belongs.*

### 6. Cluster C — Cloudflare Workers *(Wrangler)*

**What to build**
- `[MUST]` Deploy the Cluster B app to Cloudflare.
- `[MUST]` Spin up a hello-world Worker in its own directory (`npm create cloudflare@latest`):
  - configure `wrangler.jsonc`
  - set a secret with `wrangler secret put`
  - hit it with `curl`
  - watch `wrangler tail`
  - then tear it down cleanly.
- `[MUST]` Give the Worker a brain: add an `ai` binding and have it answer with `@cf/meta/llama-3.1-8b-instruct` — the first LLM call on the edge, no API key, no SDK.
- `[MUST]` Find **three modules** from past projects that won't run on Workers (e.g. `bcrypt`, anything importing `fs`, long-lived TCP) and write a one-paragraph *why* plus an edge-friendly replacement for each.

**Questions you must be able to answer**
- When would you use a Worker instead of a Node.js server?
- Why doesn't `bcrypt` run on Workers, and what replaces it?
- What is `ctx.waitUntil` for, and what breaks if you forget it?
- Secrets vs vars in `wrangler.jsonc`: which goes where, and why?
- Where does "cold start ≈ 0" actually break down?

**Concepts to master, and what each gets you**
- *Why V8 isolates ≠ Node* — predict which libraries break on the edge before wiring them in.
- *Wrangler: dev, deploy, tail* — run and ship Workers from the terminal; debug production the same way.
- *Fetch handler & `ctx.waitUntil`* — know where a Worker starts and how work continues after the response.
- *CPU-time billing* — reason about latency budgets, and why long jobs belong in Queues.

**Optional refresher:** Full intro to Cloudflare application components (30 min).

### 7. Cluster D — Storing data *(D1 · KV · R2 · Vectorize)*

**What to build**
- `[MUST]` Provision **D1**; design the schema in `src/db/schema.ts` with Drizzle; generate the first migration with `drizzle-kit generate` and apply it.
- `[MUST]` Put one piece of hot, short-lived state in **KV**: a feature flag, hot config, or a read-many cache such as the dashboard's "recent items".
- `[MUST]` **R2** uploads via presigned URLs: the Worker hands out a signed URL, the client uploads directly, the Worker stores only the object key.
- `[MUST]` Embed each record with Workers AI (`@cf/baai/bge-base-en-v1.5`), upsert the vectors into **Vectorize**, and ship a `/search` route that finds records by meaning.
- `[MUST]` Make one schema change you didn't anticipate: add a column, generate the migration, apply it, update the affected code paths.

**Questions you must be able to answer**
- For each piece of data, why does it live where it does?
- The D1 transaction-size limits: how did you avoid them?
- Why doesn't your file upload pass through the Worker?

**Concepts to master, and what each gets you**
- *D1: SQLite at the edge* — real relational queries close to the user; mind the transaction limits.
- *Drizzle on D1* — type-safe queries and readable migrations, with no deploy surprises.
- *KV: cache, eventual consistency* — use it for things you can rebuild; never for primary data.
- *R2: presigned URLs, zero egress* — hand file uploads off the Worker; pay nothing for bandwidth.
- *A decision framework* — stop reaching for KV by default; stop putting files in D1.
- *Vectorize: the fourth store* — search by meaning, not keywords: store embeddings, query by similarity — the memory every LLM feature needs.

**Optional refreshers:** Cloudflare D1 + Drizzle getting-started · Vectorize docs.

---

## PART 3 — GOING FURTHER
*The hard, interesting part: correctness under concurrency, background work, and hardening.*

### 8. Cluster E — Shared state and background work *(Durable Objects · Queues · Workers AI · Cron)*

**What to build**
- `[MUST]` Build the **contested-write Durable Object**: one instance per owning entity via `idFromName`; it validates pre-conditions, writes to D1, returns the result.
- `[MUST]` Accept an `idempotencyKey` header and cache the response for **24h**: a replay returns the cached result, never a duplicate write. Emit an `[AUDIT]` line on **every** mutation.
- `[MUST]` Call the DO from your Server Action through a **service binding**, not over HTTP.
- `[MUST]` Make the AI Worker do **RAG**: retrieve similar records from Vectorize, generate with Llama grounded in your own data. Requirements:
  - no public URL (`workers_dev: false`)
  - a shared-secret check
  - a fallback so its failure never blocks the primary write.
- `[OPTIONAL]` Queue + consumer: the DO emits events after each mutation; the consumer batches, retries with backoff, dead-letters failures. Type events as a **discriminated union** so exhaustiveness checks catch unhandled cases.
- `[MUST]` Add a `scheduled()` handler using **UPSERT-on-conflict**; run it twice and confirm the result is identical.

**Questions you must be able to answer**
- In one sentence, what conflict does your DO prevent?
- What happens if the AI or service Worker is slow or down?
- Why is it safe to run your scheduled task twice?

**Concepts to master, and what each gets you**
- *Durable Objects: single-writer* — recognise a contested write on sight; know when a DO is the answer.
- *Idempotency keys & alarms* — make retries safe; schedule deferred work without a scheduler.
- *Service bindings* — one Worker calls another: no public URL, no HTTPS hop.
- *Scheduled handlers* — recurring work that is safe to run twice.
- *Queues: retry & DLQ* — async work that survives a consumer crash.
- *Workers AI + RAG* — inference without a third-party key, and with Vectorize, answers grounded in your own data.

**Optional refreshers:** Durable Objects (Theo's intro) · Private AI chatbot with Llama 3.1 on Workers · Workers AI in 3 minutes.

### 9. Cluster F — Protecting the app *(marked OPTIONAL on the slide)* *(Turnstile · Rate limiting · AI Gateway)*

**What to build**
- Add a **rate-limit binding** to your busiest write route: hit it six times fast; the sixth should return **429**. Pick a production window + count and write the rationale.
- Add **Turnstile** to a public form; verify the token server-side in the Server Action; forge a submit and confirm the server rejects it.
- Emit a structured `[AUDIT]` JSON line — **actor, action, target, timestamp, outcome** — on every mutation; `wrangler tail | grep AUDIT` should return parseable lines.
- Put **AI Gateway** in front of every model call: caching, logs, rate limits, and a spend cap on the LLM route.
- Run the **secret-rotation drill**: do it wrong first and watch it break; then the right way — dual-key window, deploy the consumer first, update the producer, retire the old key.

**Questions you must be able to answer**
- What breaks if you rotate a secret in the wrong order?
- Could you trace every change to a record from logs alone?

**Concepts to master, and what each gets you**
- *Rate-limiting binding* — stop abuse at the edge, before it touches D1 or your DO.
- *Turnstile on public forms* — stop bots without inflicting CAPTCHAs on real users.
- *Structured audit logging* — every change grep-able from logs; investigations stop being archaeology.
- *Secret rotation* — rotate across Workers without downtime; know what breaks if you skip a step.

**Optional refresher:** AI Gateway docs.

---

## 10. Deliverables at the end of the path

- `[MUST]` **A working application** you built yourself, using most of the Cloudflare building blocks.
- `[MUST]` **Notes to review** — what surprised you, what you got wrong, what you'd do differently.
- `[MUST]` **A short walkthrough** — a tour of your app's architecture you can give from memory, diagram in hand.

**Finishing steps**
- `[MUST]` Deploy the app.
- `[MUST]` Put the architecture diagram in your README.
- `[MUST]` Read **EdgeLedger** (the reference build) and compare notes.

---

## 11. Certification requirements

1. `[MUST]` **Post your build** using the *Post Your Cloudflare App* button in the `#project-jedi` Slack channel. The submission asks for:
   - app name
   - repository URL
   - deployed URL
   - a short description
   - which Cloudflare services you used.
2. `[MUST]` **Demo it** — submitting tags the review panel, who arrange a **15-minute demo**. Walk through the application: what it does, how it's built, and why.
3. `[MUST]` **Get your certificate** — issued after the demo.

*Note: this certificate covers the TypeScript + Cloudflare course only, one of the Project JEDI trainings. The Claude certifications and the rest of the path live on the program portal.*

---

## 12. Consolidated technical stack (everything named across the slides)

**Language & framework:** TypeScript · React · Next.js (App Router, Server Components, Server Actions) · Tailwind · zod
**Tooling:** Node.js ≥ 20 + npm · Git/GitHub · Wrangler CLI · `create-next-app` · `npm create cloudflare@latest` · drizzle-kit · curl · an agentic coding tool
**Cloudflare compute:** Workers · Durable Objects · Queues (+ DLQ) · Cron / `scheduled()` handlers · service bindings · Pages
**Cloudflare data:** D1 (with Drizzle ORM) · KV · R2 (presigned URLs) · Vectorize
**Cloudflare AI:** Workers AI (`@cf/meta/llama-3.1-8b-instruct`, `@cf/baai/bge-base-en-v1.5`) · AI Gateway · RAG
**Cloudflare security:** Turnstile · rate-limiting binding · secrets (`wrangler secret put`) · structured `[AUDIT]` logging · secret rotation
**Optional auth:** Auth.js / Lucia / Clerk (or Workers-native: Web Crypto hashing + sessions in KV, as in EdgeLedger)

---

## 13. Cross-cutting rules (apply throughout)

- One project, built incrementally — never separate exercises.
- Every file produced by the agentic tool must be reviewed and understood.
- Every decision must be explainable in your own words.
- Every mutation emits an `[AUDIT]` line.
- Retries must be safe: idempotency keys on writes, UPSERT-on-conflict on scheduled work.
- AI and secondary Workers must never block or break the primary write path.
- Internal Worker-to-Worker calls use service bindings, never public HTTP.
