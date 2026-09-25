# Evidence

Command-and-output proof for requirements satisfied by a **demonstration**
rather than by code. See the `demo-evidence` skill.

One file per requirement: `<req-id>-<slug>.md`, containing the exact command,
the real pasted output, and the date.

- [`REQ-B.2-server-side-validation.md`](./REQ-B.2-server-side-validation.md) —
  curl an invalid payload past the client and watch the server reject it; plus,
  from 2026-09-22, the browser-side half (per-field errors from the same schema).
- [`REQ-B.3-no-client-side-data-calls.md`](./REQ-B.3-no-client-side-data-calls.md) —
  the main page's network log, the same page with JavaScript off, and `curl`
  returning every word it displays.
- [`REQ-B-cluster-verification.md`](./REQ-B-cluster-verification.md) — qa-test's
  independent adversarial re-run of every `REQ-B.1`…`REQ-B.5` criterion
  (2026-09-22). 21 of 23 hold; two do not. **Read this before demoing Cluster
  B** — the `REQ-B.3` network log above was captured on `next dev`, and a
  production build behaves differently. Since 2026-09-22 it also carries
  **"F-1 — fix verified"**: the origin/port defect and the silent sign-out are
  fixed and re-proved in a real browser on both ports (F-2, F-3 and O-1…O-4 are
  still open).
- [`REQ-C.1-deployed.md`](./REQ-C.1-deployed.md): Splitr live on Workers
  (2026-09-23). Public URL, same 15-route build, and browser-shaped auth (with
  `Origin`) passing and a forged `Origin` refused. Also the `INVALID_ORIGIN`
  failure captured on the first deploy, before `BETTER_AUTH_URL` was set.
- [`REQ-C.2-throwaway-worker.md`](./REQ-C.2-throwaway-worker.md): the throwaway
  `splitr-hello` Worker. Created with C3, configured, a secret put (500 before,
  200 after), curled, tailed, and **torn down**, with its state recorded before
  and after.
- [`REQ-C.3-first-edge-llm-call.md`](./REQ-C.3-first-edge-llm-call.md): the
  first Llama call through an `ai` binding, and the categorisation spike. 14/15
  on clean descriptions, **2/10 on receipt shorthand**, 15/15 stable, and one
  prompt injection contained while another passed as a valid label.
- [`REQ-D.1-schema-and-first-migration.md`](./REQ-D.1-schema-and-first-migration.md):
  10 tables from `0000_initial_schema.sql`, applied locally and remotely. Six
  bad writes each refused by a named `CHECK` or foreign key, and the handling
  of the auth tables that already existed (including Raffaele's own account).
- [`REQ-D.1-writes-through-d1.md`](./REQ-D.1-writes-through-d1.md) (D.3):
  groups, joining, expenses and settlements in D1. A two-browser run passed
  locally and on production; `REQ-B.4`'s four empty states rendered; the
  `[AUDIT]` lines show `persisted: true`; 11 tests pass, plus a mutation check.
- [`REQ-E.1-double-settle-without-the-do.md`](./REQ-E.1-double-settle-without-the-do.md):
  **E.2's "before"**. Two concurrent settlements of one £40 debt, both
  accepted, and visible in the audit log.
- [`REQ-D.2-kv-recent-descriptions.md`](./REQ-D.2-kv-recent-descriptions.md):
  KV holds each group's recent descriptions. Miss, hit, loss-and-rebuild and
  invalidation are shown, and production KV was written after the response
  via `waitUntil`.
- [`REQ-D.3-presigned-receipt-uploads.md`](./REQ-D.3-presigned-receipt-uploads.md):
  photos go straight from the browser to R2 (from the browser's own request
  log). A Content-Type pin that **didn't hold** until `allHeaders: true` was
  added, and five attach-time attacks, all refused.
- [`D.6-vision-spike.md`](./D.6-vision-spike.md): Llama 4 Scout
  against Llama 3.2 Vision on six SROIE receipts, with two prompts. Scout gets
  5/6 totals and valid JSON 12/12; Llama 3.2 drops to Markdown on a longer
  prompt. Raffaele's receipts are still to come.
  **Built:** "Read receipt" works in production, and the confirm gate is
  enforced on the server after the browser test caught it not gating.
- [`REQ-D.5-unanticipated-schema-change.md`](./REQ-D.5-unanticipated-schema-change.md):
  `line_item.raw_text`, forced by the C.4 shorthand finding and ADR-0021. A
  second migration, the first one untouched.
- [`REQ-D.4-semantic-search.md`](./REQ-D.4-semantic-search.md): search by
  meaning 11/11 against keyword 1/11 (3/11 with any-word matching) on 11
  labelled queries; indexing on save in production; 45–90 s to searchable.
- [`REQ-E.1-group-ledger-refuses-the-double-settlement.md`](./REQ-E.1-group-ledger-refuses-the-double-settlement.md):
  **the "after"**. The GroupLedger DO gives 201 + 409 in 5/5 production
  rounds (it was 201 + 201 before). The lock is proved necessary (a 30-way
  race fails 6/6 without it). The idempotent replay is byte-identical.
- [`CI-1-verification-scripts.md`](./CI-1-verification-scripts.md): ADR-0024
  rollout step 1 (2026-09-25). `scripts/verify/` smoke, race, E2E and cleanup,
  their local runs, the controls tested (failed runs still clean up; vectors and
  photos really gone), and the layout-shift bug the E2E found.
- [`REQ-E.4-rag-categorisation-eval.md`](./REQ-E.4-rag-categorisation-eval.md):
  the 2×2 eval (2026-09-25) that picked **8B + RAG (28/30)**, the threshold
  sweep, the AI Worker refusing a wrong secret through a real service binding,
  and the unit tests.
