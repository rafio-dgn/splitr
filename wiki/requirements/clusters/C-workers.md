# Cluster C — Cloudflare Workers (Wrangler)

**Part 2 — The edge platform.** The app leaves localhost.

Source: capture §6.

---

### REQ-C.1 — Deploy the Cluster B app to Cloudflare

**Statement:** Deploy the Cluster B app to Cloudflare.

**Acceptance criteria:**
- [x] The Next.js app is deployed and reachable at a public URL:
      https://splitr.raffaele-digennaro.workers.dev
- [x] It is the same app from Cluster B, not a rebuild. It's the same
      `next build` with the same 15 routes, and only the DB driver changed

**Source:** capture §6 · **Status:** ✅ **Done**, 2026-09-23. Adapter:
[ADR-0014](../../decisions/0014-opennext-as-the-deploy-adapter.md). Driver:
[ADR-0015](../../decisions/0015-one-database-driver-d1-everywhere.md).
Evidence: [`REQ-C.1-deployed.md`](../../evidence/REQ-C.1-deployed.md).

**Notes:** The course does not name the adapter. EdgeLedger uses
`@opennextjs/cloudflare`; the stack list (§12) mentions Pages. Pick one and
record it as an ADR — this is a genuine decision, not a lookup.

---

### REQ-C.2 — Hello-world Worker, full lifecycle

**Statement:** Spin up a hello-world Worker in its own directory
(`npm create cloudflare@latest`), then take it through the whole lifecycle.

**Acceptance criteria:**
- [x] Created in its own directory via `npm create cloudflare@latest` (`workers/hello/`)
- [x] `wrangler.jsonc` configured (one var, observability, no secret in the file)
- [x] A secret set with `wrangler secret put` (`HELLO_KEY`, 500 before and 200 after)
- [x] Hit with `curl`, response captured
- [x] Watched with `wrangler tail`
- [x] **Torn down cleanly** afterwards. The Worker, its secret and the
      directory were all deleted, and each was checked afterwards

**Source:** capture §6 · **Status:** ✅ **Done**, 2026-09-23.
Evidence: [`REQ-C.2-throwaway-worker.md`](../../evidence/REQ-C.2-throwaway-worker.md).

**Notes:** The teardown is part of the requirement. This Worker is a throwaway
exercise, separate from the app.

---

### REQ-C.3 — First LLM call on the edge

**Statement:** Give the Worker a brain: add an `ai` binding and have it answer
with `@cf/meta/llama-3.1-8b-instruct` — no API key, no SDK.

**Acceptance criteria:**
- [x] An `ai` binding is declared in `wrangler.jsonc`
- [x] The Worker responds using `@cf/meta/llama-3.1-8b-instruct`, as its
      `-fp8` variant, because the exact id was deprecated on 2026-05-30
      ([ADR-0017](../../decisions/0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md))
- [x] No third-party API key involved
- [x] No SDK, only the binding

**Source:** capture §6 · **Status:** ✅ **Done**, 2026-09-23, with the model
substitution above. Evidence: [`REQ-C.3-first-edge-llm-call.md`](../../evidence/REQ-C.3-first-edge-llm-call.md).

**Notes:** Exact model id. Cluster E (`REQ-E.4`) builds on this with RAG; Cluster
D (`REQ-D.4`) adds the embedding model `@cf/baai/bge-base-en-v1.5`.

**⚠️ 2026-09-23: the exact id no longer exists.** Cloudflare deprecated
`@cf/meta/llama-3.1-8b-instruct` on 2026-05-30, and every call fails with
`AiError 5028`, which was measured. We use `@cf/meta/llama-3.1-8b-instruct-fp8`,
the same weights quantised. It has no JSON mode, so output is validated in
code. See [ADR-0017](../../decisions/0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md).

---

### REQ-C.4 — Three modules that won't run on Workers

**Statement:** Find **three modules** from past projects that won't run on Workers
(e.g. `bcrypt`, anything importing `fs`, long-lived TCP) and write a one-paragraph
*why* plus an edge-friendly replacement for each.

**Acceptance criteria:**
- [x] Three real modules identified, from actual past projects: `bcrypt`,
      `puppeteer`/`playwright` and `socket.io`, all from Raffaele's own list
- [x] One paragraph each explaining *why* it fails on V8 isolates, one
      failure class each
- [x] An edge-friendly replacement named for each

**Source:** capture §6 · **Status:** ✅ **Done**, 2026-09-24. Reviewed by
Raffaele and cut to three paragraphs at his request:
[`docs/modules-that-wont-run-on-workers.md`](../../../docs/modules-that-wont-run-on-workers.md)

**Notes:** A written deliverable, not code. It belongs in the repo — put it in
the README or a `docs/` note so it survives to the demo. The examples given
(`bcrypt`, `fs`, long-lived TCP) are hints, not the required three.

---

### REQ-C.5 — Answer the cluster questions

**Statement:** Be able to answer, unaided:
1. When would you use a Worker instead of a Node.js server?
2. Why doesn't `bcrypt` run on Workers, and what replaces it?
3. What is `ctx.waitUntil` for, and what breaks if you forget it?
4. Secrets vs vars in `wrangler.jsonc`: which goes where, and why?
5. Where does "cold start ≈ 0" actually break down?

**Acceptance criteria:**
- [ ] All five answered without notes

**Source:** capture §6 · **Status:** Not started

**Notes:** Q3 and Q4 are the ones that catch people. `ctx.waitUntil` matters for
`REQ-E.6`'s scheduled handler — work not wrapped in it is killed when the handler
returns.

---

## Concepts to master

| Concept | What it gets you |
|---|---|
| Why V8 isolates ≠ Node | Predict which libraries break on the edge before wiring them in. |
| Wrangler: dev, deploy, tail | Run and ship Workers from the terminal; debug production the same way. |
| Fetch handler & `ctx.waitUntil` | Know where a Worker starts and how work continues after the response. |
| CPU-time billing | Reason about latency budgets, and why long jobs belong in Queues. |

**Optional refresher:** Full intro to Cloudflare application components (30 min).
