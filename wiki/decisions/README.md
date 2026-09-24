# Decisions (ADRs)

Every choice that closed off a viable alternative gets a file here. If you
weighed two options, that was a decision — record it, even if the winner seems
obvious in hindsight.

## Rules

- Filename: `NNNN-kebab-slug.md`, numbered sequentially, never renumbered.
- Copy [`adr-template.md`](./adr-template.md) to start.
- An ADR is **immutable once accepted**. To reverse one, write a new ADR that
  supersedes it and add a `Superseded by` line to the old one. Never rewrite
  history.
- Link the ADR from the `CHANGELOG.md` entry of the change that implements it.

## What deserves an ADR

- Choosing a library, framework version, or Cloudflare service over an alternative.
- Any deviation from the reference project's approach.
- Any conflict between the course requirements and what we actually built.
- Data model shapes, auth model, trust boundaries.
- Anything you are tempted to explain in a code comment starting with "we do this
  because…".

## What does not

- Formatting, naming, and other things already settled in `guidelines/`.
- Reversible details with no downstream consequence.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-wiki-as-knowledge-base.md) | Wiki as the knowledge base, `CLAUDE.md` as a thin router | Accepted |
| [0002](./0002-course-is-requirements-source-of-truth.md) | The course is the source of truth for requirements | Accepted (working method superseded by 0003) |
| [0003](./0003-edgeledger-is-comparison-not-template.md) | EdgeLedger is a comparison artifact, not a template | Accepted |
| [0004](./0004-project-is-splitr.md) | The project is Splitr | Accepted |
| [0005](./0005-optional-scope.md) | Cluster F is in scope; Queues is not | Accepted |
| [0006](./0006-repo-layout.md) | Next.js at the repo root; Workers in `workers/` | Accepted |
| [0007](./0007-docker-for-local-development.md) | Docker for local development, via OrbStack | Accepted |
| [0008](./0008-agent-team-and-skills.md) | A dispatching agent team, with skills encoding our failure modes | Accepted |
| [0009](./0009-better-auth-on-local-sqlite-via-drizzle.md) | Better Auth, on local SQLite through Drizzle, rebound to D1 at Cluster D | Accepted |
| [0010](./0010-validation-entry-points.md) | One validation path, two entry points — the Route Handler is the curl target | Accepted |
| [0011](./0011-one-membership-check-per-request.md) | One membership check per request, in the group layout, memoised with React `cache()` | Accepted |
| [0012](./0012-test-the-invariants-and-the-money-nothing-else.md) | Test the invariants of the contested write and the money arithmetic — nothing else | Accepted |
| [0013](./0013-base-url-is-the-request-host-not-a-port-in-env.md) | Better Auth's local base URL is the request's host, not a port in `.env` | Accepted |
| [0014](./0014-opennext-as-the-deploy-adapter.md) | `@opennextjs/cloudflare` as the deploy adapter, not Pages and not vinext | Accepted |
| [0015](./0015-one-database-driver-d1-everywhere.md) | One database driver: D1 everywhere, from Cluster C | Accepted |
| [0016](./0016-ai-integration-strategy.md) | What the AI does in Splitr, and where it is allowed to reach | Accepted |
| [0017](./0017-llama-3-1-8b-fp8-replaces-the-deprecated-model.md) | `llama-3.1-8b-instruct-fp8` replaces the deprecated course model; the eval picks E.4's model | Accepted |
| [0018](./0018-splitr-domain-model.md) | Splitr's domain model: equal shares, pairwise settlements, void-not-edit | Accepted |
