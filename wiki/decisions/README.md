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
