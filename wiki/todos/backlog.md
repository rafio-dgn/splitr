# Backlog

## Standing constraints

- [!] **The AI performs no GitHub operations.** No repo creation, no `gh`, no
      remotes, pushes, PRs or issues — not even read-only API calls. Raffaele
      owns the account and creates the repository himself. Local `git` in the
      working tree is fine. (`CLAUDE.md` §6)
- [!] **EdgeLedger is sealed until `REQ-X.6`.** Do not read
      `typescript-cloudflare-project/` or `../reference-edgeledger/`.
      ([ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md))

## Blockers

- [!] `blocker` **`wrangler login` — Raffaele must run it.** Interactive (opens a
      browser); an agent cannot. `wrangler whoami` currently reports not
      authenticated. **Needed from Cluster C onward** — Clusters A and B are
      local-only, so this does not block starting.

- [x] ~~`REQ-0.3` — GitHub repo~~ → [rafio-dgn/splitr](https://github.com/rafio-dgn/splitr),
      cloned, wiki moved in, README written
- [x] ~~`REQ-0.1` — toolchain~~ → Node v24.21.0 (nvm), npm 11.19.0,
      Wrangler 4.136.2. See [`../guidelines/workflow.md`](../guidelines/workflow.md)
      for the PATH quirk
- [x] ~~`REQ-P.1` — project idea~~ → **Splitr**.
      [ADR-0004](../decisions/0004-project-is-splitr.md),
      [`../context/project-brief.md`](../context/project-brief.md)

## For Raffaele — Cluster A

- [ ] Answer `REQ-A.5`'s three questions unaided —
      [notes](./cluster-a-questions.md)
- [ ] Review the Cluster A code (`REQ-M.3`/`REQ-A.4`): `src/lib/fetch.ts`,
      `src/app/page.tsx`, `src/app/layout.tsx`. Four questions per file in
      [`../guidelines/ai-collaboration.md`](../guidelines/ai-collaboration.md)
- [ ] Start the `REQ-X.2` notes — *what surprised you* — while Cluster A is fresh

## Open questions — need a human answer

- [x] ~~Are the `[OPTIONAL]` items in scope?~~ → **Cluster F in, Queues out.**
      [ADR-0005](../decisions/0005-optional-scope.md). Free tier throughout.
- [ ] `question` `REQ-C.1` — Next.js deploy adapter: `@opennextjs/cloudflare` or
      Cloudflare Pages? §12 names Pages; nothing mandates either. Needs an ADR.
- [x] `question` `REQ-B.5` — which auth library? **Settled: Better Auth 1.7.5**,
      see [ADR-0009](../decisions/0009-better-auth-on-local-sqlite-via-drizzle.md).
      (The old candidate list here — Auth.js / Lucia / Clerk — was the course's;
      Lucia has since been deprecated outright and Better Auth was not on it.)
- [ ] `question` Which Cloudflare account to `wrangler login` with? Free tier is
      sufficient — Queues is dropped, so no Paid plan is needed at all.
- [ ] `question` Vision model for receipt OCR — `@cf/meta/llama-3.2-11b-vision-instruct`,
      `@cf/llava-hf/llava-1.5-7b-hf`, or Moondream 3? Decide at build-plan step
      D.6 after testing OCR quality on real receipts.
- [ ] `question` Any deadline for the demo (`REQ-X.8`)?

## Queued

- [x] ~~Write `context/project-brief.md`~~ → done
- [x] ~~Map the idea onto the eight building blocks~~ → done, 8/8 (`REQ-P.2`)
- [x] ~~Produce the cluster-by-cluster build plan~~ → [`build-plan.md`](./build-plan.md)
- [x] ~~Put the brief at the top of the repo README (`REQ-0.5`)~~ → done
- [ ] Fill the `techstack/` gaps from official docs, as each cluster needs them:
      Vectorize, R2 presigned URLs, RAG, AI Gateway, zod
- [ ] Decide the test strategy and record it as an ADR
      (`../guidelines/testing.md` is a proposal, not an inherited standard)
- [ ] Write `context/domain-model.md` as Cluster D settles the schema
- [ ] Write `context/architecture.md` as Cluster E settles the topology

## Written deliverables not to forget

Easy to lose because they aren't code:

- [ ] `REQ-C.4` — three modules that won't run on Workers, with a paragraph each
      on why, plus an edge-friendly replacement. Goes in the repo.
- [ ] `REQ-F.1` — the rate-limit window/count rationale, written down.
- [ ] `REQ-X.2` — running notes: what surprised you, what you got wrong, what
      you'd do differently. **Start these at Cluster A** — "what surprised you"
      cannot be reconstructed afterwards.
- [ ] `REQ-X.5` — architecture diagram in the README.
- [ ] `REQ-X.6` — the EdgeLedger comparison write-up. The payoff for the
      quarantine.

## Evidence to capture as you go

Several requirements are proven by a demonstration, not by code. Keep the
commands and their output — they are demo material (`REQ-X.8`):

- [x] `REQ-B.2` — curl an invalid payload past the client; server rejects it —
      [`../evidence/REQ-B.2-server-side-validation.md`](../evidence/REQ-B.2-server-side-validation.md)
      (the browser-side half was added to the same file on 2026-09-22)
- [x] `REQ-B.3` — devtools showing no client-side data calls on the main page —
      [`../evidence/REQ-B.3-no-client-side-data-calls.md`](../evidence/REQ-B.3-no-client-side-data-calls.md)
- [ ] `REQ-D.6` — what D1 transaction limit you hit, and how you avoided it
- [ ] `REQ-E.2` — replayed idempotency key: one write, identical response
- [ ] `REQ-E.6` — scheduled handler run twice, identical result
- [ ] `REQ-F.1` — sixth rapid request returns 429
- [ ] `REQ-F.2` — forged submit rejected server-side
- [ ] `REQ-F.3` — `wrangler tail | grep AUDIT` yielding parseable JSON
- [ ] `REQ-F.5` — secret rotation done wrong, then right

## Stretch

- [x] ~~A vision model~~ → **required**, inherent to Splitr. Not a stretch.
- [ ] `stretch` Per-item split assignment (who had the pad thai) rather than
      equal shares — richer use of the OCR output. Decide at D.1.
- [ ] `stretch` Multi-currency.

## Proposed from the Cluster B screen design — not requirements

Raised while writing [`../context/screens-cluster-b.md`](../context/screens-cluster-b.md).
Every one of these is something a real bill-splitter would want and **no course
requirement asks for**, so none of them is in the spec. Logged here rather than
built (`CLAUDE.md` §6, product-designer rules).

- [ ] `proposed` **Account settings** — change your own name, email or password.
      No screen exists for this; Better Auth may or may not give one for free.
- [ ] `proposed` **Edit or delete an expense.** Currently an expense is
      write-once. The first typo'd amount will demand this.
- [ ] `proposed` **Leave a group / remove a member / delete a group.**
      Membership is currently add-only, which makes the "someone selected isn't
      in this group any more" error in the add-expense form unreachable.
- [ ] `proposed` **Invite expiry, revocation, and a regenerate-link control.**
      The invite link is currently permanent. The invalid-invite copy is written
      vaguely on purpose so adding expiry later needs no copy change.
- [ ] `proposed` **Email the invite.** Splitr produces a copyable link only; the
      user sends it themselves. Deliberate for now — it avoids email
      infrastructure nothing asks for.
- [ ] `proposed` **Notifications** of any kind, in-app or push. Note the nightly
      settle-up reminder (`REQ-E.6`) is required and has no delivery channel
      designed — worth resolving when Cluster E is reached.

## Raised while building the Cluster B routes — not requirements

- [ ] `proposed` **Copy for a "we can't find that expense" 404.**
      `screens-cluster-b.md` writes §5.7 for a missing *group* but nothing for a
      missing expense. `expenses/[expenseId]/not-found.tsx` currently follows
      §5.7's shape; the product designer should confirm or replace it.
- [ ] `proposed` **§4.6 A's pairwise breakdown** — "Marta owes you £12.00 · Sam
      owes you £12.00". That is debt simplification, i.e. settlement arithmetic,
      so it belongs with `REQ-E.1`. The headline sentence and §4.6 B's per-member
      positions are built; the pairwise line is not.
- [ ] `proposed` **Give the balance its own query at `REQ-D.1`.** Today the
      dashboard's balance and its expense feed come from one read, so §5.6's
      "the balance above is still accurate" fallback cannot be reached from a
      data failure — only from a render failure inside the feed.
- [ ] `proposed` **Render the invite link on the members error state.** §5.8 asks
      for it; the invite code is not a route param yet, so there is no honest way
      to show it when the group read has failed. Revisit when invites are rows.
