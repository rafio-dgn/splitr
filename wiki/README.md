# Project wiki — index

Knowledge base for the Project JEDI TypeScript + Cloudflare build. The root
`CLAUDE.md` is the thin entry point; everything substantive lives here, one topic
per file, so an agent loads only what a task needs.

## How to use it

1. Find the folder that answers your question (below).
2. Read that folder's `README.md` first — it is the local index.
3. Load only the pages you need.
4. When you learn something that contradicts a page, **fix the page in the same
   turn** and log it in `CHANGELOG.md`.

## Folders

| Folder | Holds | Source of truth for |
|---|---|---|
| [`requirements/`](./requirements/) | The course's demands, cluster by cluster, with acceptance criteria | **What** to build |
| [`techstack/`](./techstack/) | Cloudflare platform mechanics and the mandated stack | **With what** |
| [`context/`](./context/) | Our domain model, architecture, glossary | **Why it hangs together** |
| [`guidelines/`](./guidelines/) | Coding standards, security, observability, testing, AI collaboration | **How** to build |
| [`todos/`](./todos/) | Backlog, blockers, open questions | **What's next** |
| [`decisions/`](./decisions/) | ADRs — every choice that closed off an alternative | **Why it is like this** |
| 🔒 [`reference-edgeledger/`](./reference-edgeledger/) | Sealed EdgeLedger analysis | **Nothing, until `REQ-X.6`** |

## The two logs

| File | Rule |
|---|---|
| [`CHANGELOG.md`](./CHANGELOG.md) | One entry per change to code or wiki, same turn as the change |
| [`AI-AUDIT.md`](./AI-AUDIT.md) | One entry per AI task, including tasks that produced no code |

Not a formality: `REQ-M.4` requires every decision explainable in your own words
at the demo, and `REQ-X.2` requires written notes on what surprised you. Both are
built from these files.

## ⛔ The one hard rule

**Do not read `typescript-cloudflare-project/` or
[`reference-edgeledger/`](./reference-edgeledger/) until `REQ-X.6`.** The course
forbids copying from the reference build during the project; the final comparison
deliverable only exists if the two builds were reached independently.
[ADR-0003](./decisions/0003-edgeledger-is-comparison-not-template.md).

## Status

| Area | State |
|---|---|
| `requirements/` | ✅ **Captured** — all 21 slides, 9 cluster files, ~55 `REQ-*` entries |
| `techstack/` | Platform mechanics written. Gaps: Vectorize, presigned R2, RAG, AI Gateway, zod |
| `context/` | Project brief written (**Splitr**). Domain model + architecture follow as Clusters D/E settle them |
| `guidelines/` | Written |
| `todos/` | Backlog + [build plan](./todos/build-plan.md) |
| `decisions/` | ADR-0001 … 0005 |
| `reference-edgeledger/` | 🔒 Sealed |

## The project

**Splitr — snap the bill.** Photograph a receipt, a vision model itemises it, the
group's shared balance updates. The contested write: *two group members recording
the same settlement at the same moment; the second must be refused, not merged.*

[`context/project-brief.md`](./context/project-brief.md) ·
[ADR-0004](./decisions/0004-project-is-splitr.md) ·
[build plan](./todos/build-plan.md)

## ⛔ The blocker

**`REQ-0.3` — the GitHub repo does not exist yet.** Raffaele creates it; the AI
performs no GitHub operations. Everything in build-plan Step 0 waits on it.
