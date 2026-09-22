---
name: demo-evidence
description: Capture the command-and-output proof for requirements that are satisfied by a demonstration rather than by code. Use whenever a requirement says "prove it", "run it twice", "confirm", or names an expected status code. The evidence cannot be reconstructed later.
user-invocable: true
allowed-tools: Read, Write, Bash
---

## Why this exists

Several requirements are **not** satisfied by implementing the feature. They are
satisfied by running the thing and keeping the output. Capture it at the moment
it works — after the fact it is gone, and it is the material for the 15-minute
demo (`REQ-X.8`).

## What to capture

For each, store the exact command, its **real output**, and the date:

| Evidence | Req |
|---|---|
| curl an invalid payload past the client; server rejects it | `REQ-B.2` |
| devtools showing no client-side data calls on the main page | `REQ-B.3` |
| the D1 transaction limit you hit, and how you worked around it | `REQ-D.6` |
| semantic search returning a result keyword search would miss | `REQ-D.4` |
| double-settle succeeding **without** the DO, then refused **with** it | `REQ-E.1` |
| replayed `idempotencyKey`: one row written, identical response | `REQ-E.2` |
| the scheduled job run twice, identical result | `REQ-E.6` |
| sixth rapid request returns **429** | `REQ-F.1` |
| forged Turnstile submit rejected server-side | `REQ-F.2` |
| `wrangler tail \| grep AUDIT` yielding parseable JSON | `REQ-F.3` |
| secret rotation done wrong (and breaking), then right | `REQ-F.5` |

## Where it goes

`wiki/evidence/<req-id>-<slug>.md`:

```markdown
# REQ-E.2 — idempotency replay

**Date:** YYYY-MM-DD
**Requirement:** REQ-E.2 — replay returns cached result, never a duplicate write

## Command
​```bash
<the exact command>
​```

## Output
​```
<the real output, pasted — not described>
​```

## What this proves
<one or two sentences tying it to the acceptance criteria>
```

## Rules

- **Paste real output.** Never describe it, never reconstruct it from memory,
  never tidy it up. A cleaned-up log is not evidence.
- **Capture failures too** where the requirement asks for them. `REQ-F.5`
  explicitly wants the rotation done *wrong* first and the breakage observed;
  `REQ-E.1` wants the double-settle bug shown *before* the fix. The contrast is
  the demo.
- **If it did not work, say so.** A green claim that was never executed is the
  one thing that gets caught live in front of a panel.
- Beware tight retry loops with no delay — they report a false failure before
  the server is listening. Use `curl --retry --retry-connrefused`.

## The strongest demo moment

`REQ-E.1`: show the double-settle producing two settlements **without** the
Durable Object, then the same two clicks refused **with** it. That contrast is
Splitr's entire reason to exist, and it needs no domain explanation.
