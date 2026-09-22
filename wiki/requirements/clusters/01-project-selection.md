# Project selection

Source: capture §2. **This is the gate on everything else** — the domain model,
the schema, the Durable Object and the demo all follow from it.

---

### REQ-P.1 — Pick a project idea

**Statement:** Pick a project idea and write down what it is and who would use it.

**Acceptance criteria:**
- [ ] The idea is chosen and written down
- [ ] It states what it is and who it's for
- [ ] It names the contested write at its heart (`REQ-0.5`)

**Source:** capture §1 Step 1, §3.3 · **Status:** ✅ **Done** — **Splitr**. See
[`../../context/project-brief.md`](../../context/project-brief.md) and
[ADR-0004](../../decisions/0004-project-is-splitr.md).

**Notes:** Nothing past Cluster B can be designed without this. Tracked in
[`../../todos/backlog.md`](../../todos/backlog.md).

---

### REQ-P.2 — Cover about five Cloudflare building blocks

**Statement:** Choose a project that naturally uses **about five** of the building
blocks, so each one earns its place. If the idea only uses three or four, add a
stretch feature to cover the rest.

**Acceptance criteria:**
- [ ] The chosen idea maps to ≈5 blocks *naturally* — not bolted on
- [ ] Where a block does not fit naturally, a stretch feature is defined that
      makes it fit
- [ ] Each block's presence can be justified in one sentence

**Source:** capture §2.1 · **Status:** ✅ **Done** — 8/8 blocks mapped; 7 natural,
Vectorize via a declared stretch feature (semantic search over past expenses).

**The eight blocks:**

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

**Notes:** In practice the cluster requirements already force D1, KV, R2,
Vectorize, Workers AI, Durable Objects and Cron — seven. So "about five" is a
floor, not a target. What `REQ-P.2` really tests is whether they fit the domain
*naturally*, which is a property of the idea, not of the build.

---

### REQ-P.3 — The project must have a genuine contested write

**Statement:** Derived from §2.4 (every suggested idea is described in terms of
its contested write) and §8 (the Durable Object exists to arbitrate one).

**Acceptance criteria:**
- [ ] Two users can attempt to change the same thing at the same time
- [ ] Exactly one must win, and that matters to the domain
- [ ] It can be stated in one sentence (`REQ-E.7`)

**Source:** capture §2.4, §3.3, §8 · **Status:** ✅ **Done** — *two group members
recording the same settlement at the same moment; the second must be refused,
not merged.*

**Notes:** This is the hardest part of choosing well. "Two users edit the same
record" is weak — last-write-wins is usually fine. A *real* contested write is
one where the second writer must be **refused**, not merged: claiming a slot,
taking ownership, drawing down a shared balance.

---

## Suggested ideas from the course (§2.4)

Any of these satisfies `REQ-P.1`–`REQ-P.3` as written. All are pharma/enterprise
flavoured except the last.

| Idea | What it does | The contested write |
|---|---|---|
| **ClaimCheck** — MLR pre-flight | Reviewers upload a promo asset; AI extracts product claims and checks each against the approved-claims library | Two reviewers open the same asset — one verdict must win |
| **BrandVoice** — on-brand copy | Teams submit a brief; AI drafts on-brand variants grounded in approved messaging | Marketers claim campaign slots — one slot, one owner |
| **TrialDesk** — study inbox | Site queries get an instant AI draft grounded in the protocol and past answers | Coordinators race to claim and send a query |
| **BenchBook** — self-writing lab notebook | Scientists dictate at the bench; AI transcribes and structures steps and reagents | Shared reagent stock updated from many benches at once |
| **InsightDesk** — field intelligence | Field teams log visit notes by voice; AI transcribes, summarises, tags | Notes on one account must merge cleanly |
| **Splitr** — snap the bill | Photograph a receipt; a vision model itemises it; the group settles one shared balance | Two people settling at once must not double-count |

`BenchBook` and `InsightDesk` additionally imply Whisper transcription; `Splitr`
implies a vision model. Both are extra scope beyond the named Llama and embedding
models in `REQ-C.3` / `REQ-D.4`.

## Team examples (§2.3 — inspiration only, not requirements)

Recover Well (recovery monitoring) · Applicant tracker (ATS) · Larum (budgeting) ·
Care platform (appointments & prescriptions) · Meeting assistant (Teams → Jira) ·
Drug-interaction checker.

## Reference architecture — the expected shape (§2.5)

How ClaimCheck is wired. This is the shape a full build is expected to take, and
it is the closest thing the course gives to a target architecture:

| Tier | Contents |
|---|---|
| **Client** | Web app (dashboard: upload, see verdicts) + a **public intake form** |
| **Edge** | Next.js on Workers (routes + Server Actions); Turnstile on the public form; rate-limit guard on the submit route; structured audit logs, one line per decision |
| **Coordination** | Durable Object as arbiter (one asset, one reviewer); Queues with retries then DLQ; Cron for the nightly sweep |
| **AI** | AI Gateway as the single front door (caching, logs, spend cap); Workers AI for extraction; Vectorize for RAG |
| **Data** | D1 for the relational core; KV as the hot rebuildable cache; R2 for files via **presigned uploads** |

Note the **two client surfaces**: an authenticated app *and* a public unauthenticated
intake form. The public form is what Turnstile (`REQ-F.2`) exists to protect —
so whichever idea is chosen should have a plausible public entry point.
