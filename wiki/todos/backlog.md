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

## Open questions — need a human answer

- [x] ~~Are the `[OPTIONAL]` items in scope?~~ → **Cluster F in, Queues out.**
      [ADR-0005](../decisions/0005-optional-scope.md). Free tier throughout.
- [ ] `question` `REQ-C.1` — Next.js deploy adapter: `@opennextjs/cloudflare` or
      Cloudflare Pages? §12 names Pages; nothing mandates either. Needs an ADR.
- [ ] `question` `REQ-B.5` — which auth library? Auth **is** needed (Splitr has
      groups, so it needs identity). Auth.js / Lucia / Clerk — black box only.
      Decide at build-plan step B.2; needs an ADR.
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

- [ ] `REQ-B.2` — curl an invalid payload past the client; server rejects it
- [ ] `REQ-B.3` — devtools showing no client-side data calls on the main page
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
