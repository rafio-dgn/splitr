# The agent team

A dispatch structure for building Splitr with code agents: a tech lead that
plans and delegates, five specialists, and six skills that encode the mistakes
*this* project is prone to.

Defined in [`.claude/agents/`](../../.claude/agents/) and
[`.claude/skills/`](../../.claude/skills/), committed so they travel with the
repo. See [ADR-0008](../decisions/0008-agent-team-and-skills.md).

## The team

| Agent | Owns | Model |
|---|---|---|
| [`tech-lead`](../../.claude/agents/tech-lead.md) | Plans, splits work, dispatches, enforces the definition of done | opus |
| [`product-designer`](../../.claude/agents/product-designer.md) | Flows, screens, copy, loading/empty/error coverage | opus |
| [`frontend`](../../.claude/agents/frontend.md) | App Router, React, the client/server boundary, zod forms | opus |
| [`backend`](../../.claude/agents/backend.md) | Workers, D1/Drizzle, Durable Objects, service bindings, AI | opus |
| [`devops`](../../.claude/agents/devops.md) | wrangler, bindings, secrets, Docker, deploys | opus |
| [`qa-test`](../../.claude/agents/qa-test.md) | Automated tests **and** demo evidence | opus |

## How dispatch works

The **main session is the default tech lead** — it already has the full
conversation and the wiki in context. The `tech-lead` agent exists for when you
want planning done in a clean context, or want to drive a whole cluster with
`claude --agent tech-lead`.

Typical flow for a cluster:

```
tech-lead reads the cluster requirements and the build plan
   │
   ├─ product-designer   → flows, screens, states      (output feeds frontend)
   ├─ backend            → data model, workers, DO     ─┐
   ├─ frontend           → routes, components          ─┤ can run in parallel
   ├─ devops             → bindings, secrets, config   ─┘
   └─ qa-test            → tests + evidence            (needs the above first)
   │
tech-lead verifies the definition of done, then reports
```

**One capability per step** (`REQ-M.2`). Clusters run in order and are never
parallelised. Work *within* a cluster may be, where genuinely independent.

Every dispatch carries the `REQ-*` ids it serves. An agent that does not know
which requirement it is satisfying will invent scope — that is the single most
common failure and the cheapest to prevent.

## The skills

Each encodes a specific way this project can go wrong.

| Skill | Prevents | Loaded by |
|---|---|---|
| [`req-check`](../../.claude/skills/req-check/SKILL.md) | Inventing scope; claiming done on unverified criteria | all |
| [`wiki-discipline`](../../.claude/skills/wiki-discipline/SKILL.md) | Losing the reasoning the demo depends on | tech-lead, frontend, backend, devops, qa-test |
| [`verify-api`](../../.claude/skills/verify-api/SKILL.md) | Writing Next 16 / Wrangler 4 APIs from stale memory | frontend, backend, devops |
| [`edgeledger-guard`](../../.claude/skills/edgeledger-guard/SKILL.md) | Reading the sealed reference and destroying `REQ-X.6` | tech-lead |
| [`audit-log`](../../.claude/skills/audit-log/SKILL.md) | Mutations shipping without an `[AUDIT]` line | backend |
| [`demo-evidence`](../../.claude/skills/demo-evidence/SKILL.md) | Losing proof that can't be reconstructed later | qa-test |

Skills listed in an agent's `skills:` frontmatter are preloaded into its context
at startup. All are also user-invocable as `/req-check`, `/verify-api` and so on.

## Why these six skills

They are not generic best practice — each maps to a failure this project has
already had, or is set up to have:

- **`verify-api`** — the Next.js scaffold shipped `LayoutProps<"/">`, a generated
  global. Writing `{ children: React.ReactNode }` from memory would have failed,
  and `getServerSideProps` does not exist in the App Router at all.
- **`edgeledger-guard`** — the wiki was originally populated *by reading
  EdgeLedger*, before the course made clear that is forbidden until the end. That
  analysis had to be quarantined. The skill stops it recurring.
- **`audit-log`** — `REQ-M.5` is stated in three separate places in the course
  and is the easiest requirement to forget, because nothing breaks when you do.
- **`demo-evidence`** — eleven requirements are proven by demonstration. None of
  that output can be reconstructed after the fact.
- **`req-check`** — the course is explicit that scope is the course's, not ours.
- **`wiki-discipline`** — `REQ-M.4` and `REQ-X.2` are both assembled from files
  that must be written in the moment.

## Using them

```bash
claude --agent tech-lead          # drive a whole cluster as the lead
```

In a session: `@frontend`, `@backend`, `@qa-test` to address one directly, or
describe the work and let the lead delegate. `/req-check`, `/wiki-discipline`
etc. to invoke a skill by hand.

Claude Code watches `.claude/agents/` and `.claude/skills/`, so edits take effect
within seconds — no restart.

## What this does not do

It does not replace review. `REQ-M.3` requires **every file an agent writes to be
read and understood** by Raffaele, and `REQ-M.4` requires every decision
explainable in his own words at the demo. More agents producing more code faster
makes that harder, not easier.

The skills exist to keep agent output *reviewable* — traceable to a requirement,
logged, and verified — not to remove the need to review it.
