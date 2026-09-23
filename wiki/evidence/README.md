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
  200 after), curled, and tailed. **The teardown is still owed** at C.5.
- [`REQ-C.3-first-edge-llm-call.md`](./REQ-C.3-first-edge-llm-call.md): the
  first Llama call through an `ai` binding, and the categorisation spike. 14/15
  on clean descriptions, **2/10 on receipt shorthand**, 15/15 stable, and one
  prompt injection contained while another passed as a valid label.
