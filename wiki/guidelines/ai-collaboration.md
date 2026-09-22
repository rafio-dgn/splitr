# Working with the agentic tool

The course requires an agentic coding tool (`REQ-0.1`) **and** requires that
every file it produces be read and understood (`REQ-M.3`), with every decision
explainable in your own words (`REQ-M.4`). Those pull against each other. This
page is how they are reconciled.

> §1 Step 3 — *"Build with an agentic tool writing alongside you; **read
> everything it produces** rather than pasting blindly."*
>
> §4 — *"Audit **every** file the agent writes — don't let any sneak in."*
>
> §13 — *"Every file produced by the agentic tool must be reviewed and
> understood. Every decision must be explainable in your own words."*

The 15-minute demo (`REQ-X.8`) tests this directly, and per-cluster question
lists are effectively the panel's script.

## Rules for the AI

### Produce reviewable increments
One capability per step (`REQ-M.2`). Never generate a large tree in one go. If a
change spans more than a handful of files, stop and say what the pieces are
before writing them.

### Explain before writing, not after
State what you are about to create and why. A file that appears with a
post-hoc rationale is harder to review than one whose purpose was agreed first.

### Flag every decision
Any point where you chose between options, say so explicitly — even small ones.
If it closes off an alternative, it is an ADR ([`../decisions/`](../decisions/)).
Silent choices are the failure mode `REQ-M.4` is guarding against.

### Never copy from EdgeLedger
See [ADR-0003](../decisions/0003-edgeledger-is-comparison-not-template.md) and
[`../context/reference-project.md`](../context/reference-project.md). If a
solution comes from there, it is not ours and cannot be explained as ours.

### Do not scaffold beyond what was asked
`create-next-app` produces files nobody asked for; `REQ-A.4` says don't let any
sneak in. Point out what the scaffold generated and what can go.

### Say what you did not verify
If something was not run, not type-checked, not tested — say so plainly. An
unverified claim that survives to the demo is worse than a gap that was flagged.

### Surface the cluster questions
Each cluster has a "Questions you must be able to answer" list. When finishing a
cluster, restate them and check they can actually be answered. They are the
acceptance criteria for `REQ-M.4`.

## Rules for the human review

A file is reviewed when you can answer, for every part of it:

1. What does this do?
2. Why is it here rather than somewhere else?
3. What would break if it were removed?
4. Would I have written it this way, and if not, why is this way acceptable?

If any answer is "I'm not sure", it is not reviewed yet. `REQ-A.4`'s "don't let
any sneak in" is about exactly this.

## What goes in the audit log

[`../AI-AUDIT.md`](../AI-AUDIT.md) already requires an entry per AI task. For
this project, two fields carry extra weight:

- **Alternatives considered** — the raw material for `REQ-M.4` and for
  `REQ-X.2` ("what you got wrong, what you'd do differently").
- **Verification** — what was actually run, with its output. Not "it works".

## Red flags

Stop and review harder if any of these appear:

- A file you do not remember asking for
- A dependency added without discussion
- A pattern that appeared fully formed with no design step
- An explanation that begins "this is the standard way to…" and stops there
- Anything you could not defend in 15 minutes to a panel
