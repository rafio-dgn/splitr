# Capture protocol

How to turn a course page into requirement entries without losing or inventing
anything. Follow this exactly — the value of `requirements/` depends entirely on
it being a faithful record.

## 1. Capture raw first, interpret second

Before writing any requirement, save the raw course text verbatim to
`wiki/requirements/_raw/<phase>-<slug>.md` with the source URL and the date
retrieved at the top. Never paraphrase during capture.

Raw captures are **never edited**. If the course changes, capture a new file and
note the supersession. This is what lets us prove later that a requirement was
really asked for.

## 2. Split into atomic requirements

One requirement = one thing that can independently pass or fail.

- "Build a login page with rate limiting and CAPTCHA" is **three** requirements.
- Anything joined by "and" is suspect. Split it.
- If you cannot write an acceptance criterion for it, it is not a requirement —
  it is context. Put it in `wiki/context/`.

## 3. Write the entry

```markdown
### REQ-4.1.3 — Idempotent transaction creation

**Statement:** Re-submitting a create request with the same idempotency key must
return the original result without creating a second transaction.

**Acceptance criteria:**
- [ ] Two POSTs with an identical key produce one row in `transactions`
- [ ] The second response body is byte-identical to the first
- [ ] Cached keys are evicted after 24h

**Source:** <course URL>#<section-heading> (retrieved 2026-09-22)
**Status:** Not started
**Reference evidence:** `edgeledger-transaction-do-worker/src/index.ts:52-70,121-128`
**Notes:** —
```

## 4. Mark what you are unsure about

If the course is ambiguous, set status to `Needs clarification` and write the
specific question in **Notes**. Do not resolve ambiguity by picking the reading
that matches the reference project — that is how the reference project's
accidents become our requirements.

## 5. Distinguish requirement from suggestion

Course prose mixes both. Classify explicitly:

| Course wording | Treat as |
|---|---|
| "must", "the app should", "implement", numbered task lists | Requirement |
| "you could also", "a nice extension", "optionally" | `wiki/todos/backlog.md`, tagged `stretch` |
| Explanations of how a service works | `wiki/context/` or `wiki/techstack/` |
| Commands to run, versions to install | `wiki/techstack/` |

## 6. Log it

Capturing requirements is a change to the wiki, so it gets a `CHANGELOG.md`
entry and an `AI-AUDIT.md` entry like anything else — including which course
pages were read and which were not reachable.
