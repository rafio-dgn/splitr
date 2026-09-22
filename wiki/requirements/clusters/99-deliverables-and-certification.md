# Deliverables and certification

Source: capture §10, §11.

---

## Deliverables

### REQ-X.1 — A working application

**Statement:** A working application you built yourself, using most of the
Cloudflare building blocks.

**Acceptance criteria:**
- [ ] It works
- [ ] Built by you (with an agentic tool, per `REQ-M.3`)
- [ ] Uses most of the eight building blocks (`REQ-P.2`)

**Source:** capture §10 · **Status:** Not started

---

### REQ-X.2 — Notes to review

**Statement:** Notes to review — what surprised you, what you got wrong, what
you'd do differently.

**Acceptance criteria:**
- [ ] Written notes exist covering all three prompts
- [ ] They are specific, not generic

**Source:** capture §10 · **Status:** Not started

**Notes:** Start these from cluster one, not at the end — "what surprised you" is
unrecoverable after the fact. [`../../AI-AUDIT.md`](../../AI-AUDIT.md) and the
ADRs are the raw material; this is the human-written distillation of them.

---

### REQ-X.3 — A short walkthrough

**Statement:** A short walkthrough — a tour of your app's architecture you can
give from memory, diagram in hand.

**Acceptance criteria:**
- [ ] Deliverable from memory
- [ ] Backed by the architecture diagram (`REQ-X.5`)
- [ ] Covers what it does, how it's built, and why

**Source:** capture §10 · **Status:** Not started

---

## Finishing steps

### REQ-X.4 — Deploy the app

**Acceptance criteria:**
- [ ] Deployed and reachable at a public URL

**Source:** capture §10 · **Status:** Not started

---

### REQ-X.5 — Architecture diagram in the README

**Acceptance criteria:**
- [ ] A diagram is in the project README
- [ ] It shows every Cloudflare service in use and how they connect
- [ ] It is accurate as shipped

**Source:** capture §10 · **Status:** Not started

**Notes:** EdgeLedger's README opens with an ASCII diagram — a reasonable format,
and the one place looking at the reference is unambiguously fine, since it is
presentation rather than implementation.

---

### REQ-X.6 — Read EdgeLedger and compare notes

**Statement:** Read **EdgeLedger** (the reference build) and compare notes.

**Acceptance criteria:**
- [ ] EdgeLedger read **after** the build is complete
- [ ] A written comparison: where the approaches differ and why
- [ ] Differences understood, not treated as mistakes

**Source:** capture §10 · **Status:** Not started

**Notes:** ⚠️ This is a **finishing** step. It is the payoff for having *not*
copied from EdgeLedger during the build (`REQ-0.4`). Reading it early does not
just break a rule — it destroys this deliverable, because there is nothing left to
compare. See [ADR-0003](../../decisions/0003-edgeledger-is-comparison-not-template.md).

---

## Certification

### REQ-X.7 — Post the build in Slack

**Statement:** Post your build using the *Post Your Cloudflare App* button in the
`#project-jedi` Slack channel.

**The submission asks for:**
- [ ] App name
- [ ] Repository URL
- [ ] Deployed URL
- [ ] A short description
- [ ] Which Cloudflare services you used

**Source:** capture §11.1 · **Status:** Not started

---

### REQ-X.8 — 15-minute demo

**Statement:** Submitting tags the review panel, who arrange a 15-minute demo.
Walk through the application: what it does, how it's built, and why.

**Acceptance criteria:**
- [ ] Demo delivered in 15 minutes
- [ ] Covers what / how / why
- [ ] Every cluster's questions answerable under questioning (`REQ-M.4`)

**Source:** capture §11.2 · **Status:** Not started

**Notes:** This is where `REQ-M.4` is actually tested. The per-cluster question
lists are effectively the panel's likely questions — treat them as the revision
guide.

---

### REQ-X.9 — Certificate

**Statement:** Issued after the demo.

**Source:** capture §11.3 · **Status:** Not started

**Notes:** Covers the TypeScript + Cloudflare course only. The Claude
certifications and the rest of Project JEDI live on the program portal.
