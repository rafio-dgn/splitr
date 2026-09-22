# ADR-0008: A dispatching agent team, with skills encoding our failure modes

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Raffaele Di Gennaro
- **Requirement:** **None** — Raffaele's requirement, not the course's. `REQ-0.1`
  requires *an* agentic tool; it says nothing about structuring one into roles.

## Context

Raffaele asked for a developer system of code agents: a team leader dispatching
product-designer, frontend, backend, devops and QA-test specialists, plus a set
of skills "that help us avoid mistakes based on our needs".

The course requires an agentic coding tool (`REQ-0.1`) and — importantly —
requires that **every file it writes is read and understood** (`REQ-M.3`) and
**every decision is explainable in your own words** (`REQ-M.4`).

Those two requirements pull hard against a large agent team. More agents produce
more code faster, which makes the review obligation *harder*, not easier. Any
design here has to take that seriously rather than optimise for throughput.

## Options considered

### Option A — No agent team; one session, one context
- Pros: simplest; the whole conversation stays in one place, which suits
  `REQ-M.3` review; no dispatch overhead.
- Cons: no role separation; a single context carries frontend, backend and infra
  concerns at once and degrades on long clusters. Doesn't meet the request.

### Option B — Roles as prompt conventions, no agent files
- Pros: nothing to maintain; flexible.
- Cons: nothing is enforced. The point of the request is that the *structure*
  stops mistakes; convention that lives in someone's head stops nothing.

### Option C — Six agent definitions + six skills, committed to the repo
- Pros: each role carries only its own rules, so context stays focused; skills
  preload the constraints that matter for that role; committed, so they travel
  with the repo and are themselves reviewable.
- Cons: files to maintain as the project changes; a risk of ceremony — agents
  invoked because they exist rather than because the task needs them.

### Option D — Option C plus generic best-practice skills
- Rejected. Skills for "write clean code" or "follow SOLID" are noise. A skill
  earns its place only by preventing a mistake this project has actually made or
  is measurably set up to make.

## Decision

**Option C.** Six agents in `.claude/agents/`, six skills in `.claude/skills/`,
committed.

The skills are deliberately **specific to failures we have had or will have**:

| Skill | The failure it prevents | Already happened? |
|---|---|---|
| `verify-api` | Writing Next 16 / Wrangler 4 APIs from stale memory | Yes — `LayoutProps<"/">` is a generated global; `getServerSideProps` doesn't exist in the App Router |
| `edgeledger-guard` | Reading the sealed reference, destroying `REQ-X.6` | **Yes** — the wiki was first populated by reading EdgeLedger and had to be quarantined |
| `audit-log` | Mutations shipping without an `[AUDIT]` line | Not yet — but `REQ-M.5` is stated three times in the course and nothing breaks when you forget it |
| `demo-evidence` | Losing proof that can't be reconstructed | Not yet — 11 requirements are proven by demonstration |
| `req-check` | Inventing scope; false "done" | Guarded by the course's own insistence that scope is its own |
| `wiki-discipline` | Losing the reasoning `REQ-M.4`/`REQ-X.2` depend on | Ongoing risk every turn |

## Consequences

- The **main session remains the default tech lead** — it holds the conversation
  and the wiki already. The `tech-lead` agent is for clean-context planning or
  `claude --agent tech-lead`. Nested dispatch is available, not mandatory.
- Every dispatch must carry the `REQ-*` ids it serves. An agent without them
  invents scope; this is the most common and cheapest-to-prevent failure.
- All six agents are `model: opus`. Splitr's hard parts — the contested write,
  the client/server boundary, secret rotation — are judgement, not volume.
  Revisit per-agent if cost becomes a factor.
- **`REQ-M.3` gets harder, and this is the real cost.** Raffaele must still read
  and understand every file. The skills are aimed at keeping output *reviewable*
  — traceable to a requirement, logged, verified — rather than at producing more
  of it. If review starts lagging, use fewer agents, not more.
- Agent and skill files are themselves project artifacts: changes to them get a
  changelog entry like any other.
- Revisit if: agents get invoked ceremonially rather than usefully, or if the
  role split stops matching how the work actually divides.

## On "superpowers"

Raffaele mentioned "think about using superpowers". Interpreted as: give the
agents the standing knowledge that prevents our specific mistakes, via preloaded
skills — which is what the `skills:` frontmatter does. If a specific third-party
"superpowers" plugin/marketplace was meant instead, that is a separate decision
and gets its own ADR.

## Verification

Frontmatter schemas checked against the current Claude Code documentation
(`code.claude.com/docs/en/sub-agents` and `/skills`) on 2026-09-22, not recalled
— the supported fields have changed over time. All twelve files validated as
parseable YAML frontmatter.
