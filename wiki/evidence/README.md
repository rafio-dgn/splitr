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
