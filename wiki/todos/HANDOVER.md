# Handover — start here in a new session

Written 2026-09-22 at the close of the first session; updated 2026-09-23
mid-way through the second, after `REQ-C.1`. Read this, then
[`build-plan.md`](./build-plan.md) and [`backlog.md`](./backlog.md).
**Raffaele's own reading list is [`STUDY-GUIDE.md`](./STUDY-GUIDE.md). Keep it current.**

## Where we are

| | |
|---|---|
| Repo | [github.com/rafio-dgn/splitr](https://github.com/rafio-dgn/splitr). **Cluster C work is uncommitted**; the last commit is `18b7c24` |
| Live | **https://splitr.raffaele-digennaro.workers.dev** (Worker `splitr`, D1 `splitr`, WEUR) |
| Cluster A | ✅ Done |
| Cluster B | 🟡 4/6 — see below |
| Cluster C | 🟡 `REQ-C.1` ✅ · `REQ-C.2` ✅ (torn down) · `REQ-C.3` ✅ (on `-fp8`: the course's model is deprecated, ADR-0017) · next is C.6, the three-modules write-up (`REQ-C.4`) |

Splitr runs on Workers via OpenNext ([ADR-0014](../decisions/0014-opennext-as-the-deploy-adapter.md)).
**Accounts persist in D1**, locally and deployed. `better-sqlite3` is gone
([ADR-0015](../decisions/0015-one-database-driver-d1-everywhere.md)). Groups and
expenses still don't persist; both write paths honestly report "nothing was
stored". Group membership is a fixture (`grp_demo`). Real tables are `REQ-D.1`.

```bash
docker compose up -d          # http://localhost:3000
npm run dev -- -p 3100        # or natively, any port
```

## Do these first, in this order

1. **Restart Claude Code** if you have not since 2026-09-22. The six agents in
   `.claude/agents/` only register on a fresh start (the skills already work).
   Then `claude --agent tech-lead`, or `@frontend` / `@backend` / `@qa-test`.
2. ~~`wrangler login`~~ ✅ done.
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

The rest of Cluster C is written, not coded:

- **C.6, `REQ-C.4`:** three modules *from Raffaele's own past projects* that
  won't run on Workers, each with one paragraph on why and an edge-friendly
  replacement. It must be **his** projects, so ask him which ones; an agent
  can't know them.
- **C.7, `REQ-C.5`:** five spoken questions. The evidence files now hold
  concrete material for Q2 (`timingSafeEqual` as a Workers-only Web Crypto
  API), Q4 (the `GREETING` var vs the `HELLO_KEY` secret) and Q5 (served from
  `MAD`, data in `WEUR`).

## New since 2026-09-23 — read before touching the deploy

- **Local setup changed.** A fresh clone needs `npm run cf:types` (or `tsc`
  fails) and `npm run db:local` (the auth tables). `npm run preview` also needs
  a `.dev.vars` with a blank `BETTER_AUTH_URL=`, or every sign-in returns 403.
  See `.env.example`.
- **Worker is at ~69% of the free plan's 3 MiB gzipped limit** before Cluster D.
  Watch it on every deploy.
- **F-1 recurred on the first deploy**, as `403 INVALID_ORIGIN` on a new host,
  and was caught because the probe sent an `Origin` header. That's lesson one
  above working as intended. It's captured in
  [`../evidence/REQ-C.1-deployed.md`](../evidence/REQ-C.1-deployed.md).
- **A decision for Raffaele:** `wiki/techstack/` contains EdgeLedger-derived
  specifics, a possible leak in the seal. It's in `backlog.md` under
  *Raised in Cluster C*.
- **AI is decided with Raffaele, not by an agent.** ADR-0016 records twelve
  answers from three rounds of questions, ADR-0017 records the model
  substitution, and the C.4 spike raised a new question: should OCR expand
  receipt abbreviations? Ask him; don't settle it in code.
