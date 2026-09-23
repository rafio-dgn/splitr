# Handover — start here in a new session

Written 2026-09-22 at the close of the first working session. Read this, then
[`build-plan.md`](./build-plan.md) and [`backlog.md`](./backlog.md).

## Where we are

| | |
|---|---|
| Repo | [github.com/rafio-dgn/splitr](https://github.com/rafio-dgn/splitr), clean, pushed to `main` |
| Last commit | `8adf547` — the auth origin fix |
| Cluster A | ✅ Done |
| Cluster B | 🟡 4/6 — see below |
| Cluster C | Not started. **Blocked on `wrangler login`** |

Splitr runs locally. **Nothing persists yet** — both write paths validate and
honestly report "nothing was stored" rather than a 201 implying a write. Group
membership is a fixture (`grp_demo`). Real tables are `REQ-D.1`.

```bash
docker compose up -d          # http://localhost:3000
npm run dev -- -p 3100        # or natively, any port
```

## Do these first, in this order

1. **Restart Claude Code** if you have not since 2026-09-22. The six agents in
   `.claude/agents/` only register on a fresh start (the skills already work).
   Then `claude --agent tech-lead`, or `@frontend` / `@backend` / `@qa-test`.
2. **`wrangler login`** — interactive browser flow, a human must run it. It
   blocks all of Cluster C. `wrangler whoami` currently says not authenticated.
3. **Answer `REQ-A.5` and `REQ-B.6`** — six questions, spoken, unaided. Notes in
   [`cluster-a-questions.md`](./cluster-a-questions.md). These are graded at the
   demo (`REQ-X.8`) and cannot be delegated.

## Open decisions — Raffaele's, not an agent's

**F-2, and it is the one that could embarrass you live.** `REQ-B.3`'s "0 fetch,
0 xhr" evidence was captured on `next dev`, which disables `<Link>` prefetch. A
**production build shows 9 fetch requests** on the same page. They are navigation
prefetches, not the page fetching its own data — the substance holds, and curl
still returns every word the page renders. But the criterion is about what the
Network tab shows.

Choose one: demo on `next dev` and explain why, or re-word the criterion and
record both logs. Evidence: `wiki/evidence/REQ-B-cluster-verification.md`.

## Cluster B's two loose ends

- **`REQ-B.4` is `In progress`**, deliberately downgraded. Four of thirteen empty
  states are coded but have **never rendered** — unreachable until `REQ-D.1`
  gives us real tables. QA's verdict, which I accepted: *"compiled is not has"*.
  Revisit at `REQ-D.1`.
- **`REQ-B.6`** — the three spoken questions.

## Known defects, logged not fixed

In `backlog.md` under *Cluster B QA findings*:

- **O-1** — a missing group returns **HTTP 200**, not 404. `notFound()` fires
  after the streaming shell is flushed, so `curl -f` sees success.
- **O-2** — the auth gate drops the return path; spec wants
  `/login?next=<path>`, nothing implements it.
- **O-3** — the most interesting. `listGroupExpenses` is read twice per render,
  neither `cache()`d (two D1 queries per view from Cluster D), and because the
  page's read runs first, **a real feed failure can never reach the
  `SectionErrorBoundary`** — the page-level boundary always wins. That boundary
  cannot catch the failure it was added for.

## Two lessons this session paid for

**Verify in the medium the requirement names.** `REQ-B.5` was marked Done on curl
evidence while browser authentication was completely broken — curl sends no
`Origin` header, so Better Auth's check never fired. Three agents and two
verification passes missed it; a fourth, briefed adversarially, found it in
minutes.

**Brief QA to attack, not to confirm.** The agent that found it was told to *try
to prove the others wrong* and forbidden from fixing what it found. Both halves
of that mattered — a QA agent that silently repairs things destroys the signal.

## Standing constraints

- **EdgeLedger is sealed** until `REQ-X.6`. Do not read
  `../typescript-cloudflare-project/` or `wiki/reference-edgeledger/`.
  ([ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md))
- **No GitHub changes** — no `gh`, PRs, issues, settings. Commit and push only
  when Raffaele asks. (`CLAUDE.md` §6)
- **One capability per step**, clusters in order (`REQ-M.2`).
- **Docker is dev-only.** Workers are V8 isolates; `wrangler deploy` ships code,
  not an image. Never present the container as deployment
  ([ADR-0007](../decisions/0007-docker-for-local-development.md)).

## Next real work

Cluster C, once `wrangler login` is done: deploy the app to Cloudflare, stand up
and tear down a throwaway Worker, make the first edge LLM call with
`@cf/meta/llama-3.1-8b-instruct`, and write up three modules that will not run on
Workers (`REQ-C.4` — a written deliverable, easy to forget).

`REQ-C.1` needs an ADR first: OpenNext vs Cloudflare Pages as the deploy adapter.
Neither is mandated.
