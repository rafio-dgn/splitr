# Prerequisites and setup

Source: capture §0, §3.

---

### REQ-0.1 — Toolchain installed

**Statement:** Install and register everything before Cluster A.

**Acceptance criteria:**
- [x] Node.js **≥ 20** with npm
- [x] A code editor
- [x] Git, and a GitHub account
- [x] A Cloudflare account — **free tier is sufficient for the whole path**
- [x] An agentic coding tool (Claude Code / Cursor / Copilot)
- [x] Wrangler CLI, installed via npm

**Source:** capture §0.2 · **Status:** ✅ **Done** (the `wrangler login` gap closed at Cluster C; production has been deployed since). Verified 2026-09-22:
Node **v24.21.0** (via nvm 0.40.8), npm **11.19.0**, git **2.50.1**, Wrangler
**4.136.2**, VS Code, Claude Code, GitHub account. **Outstanding:** `wrangler login`
— interactive, Raffaele must run it. Not needed until Cluster C.

**Notes:** "Free tier is sufficient" is load-bearing. It is why Queues is the one
`[OPTIONAL]` item in Cluster E, and why Workflows never appear.

---

### REQ-0.2 — Assumed knowledge

**Statement:** JavaScript fundamentals (functions, objects, arrays, modules);
basic React (components, props); Git and terminal basics; HTTP requests,
responses and JSON.

**Acceptance criteria:**
- [x] No cluster is blocked on a gap in these

**Source:** capture §0.1 · **Status:** n/a (self-assessed; refresher links per cluster)

---

### REQ-0.3 — Create the project repository

**Statement:** Create a new GitHub repository for the project. Every cluster's
work lands there.

**Acceptance criteria:**
- [x] A new, dedicated GitHub repo exists
- [x] It is not a fork or copy of the reference repo

**Source:** capture §3.1 · **Status:** ✅ **Done** —
[github.com/rafio-dgn/splitr](https://github.com/rafio-dgn/splitr), created by
Raffaele, public, cloned to `ts-training/splitr/`.

---

### REQ-0.4 — Clone the reference repository, read-only

**Statement:** Clone `https://github.com/NewPage-Solutions-Inc/typescript-cloudflare-project.git`
next to the project repo.

**Acceptance criteria:**
- [x] Cloned beside the project, not inside it
- [x] **Never built inside**
- [x] **Not copied from at this stage** — it is for comparison later

**Source:** capture §3.2 · **Status:** ✅ Done — at
`../typescript-cloudflare-project/`, a sibling of the project repo, never inside
it.

**Notes:** ⚠️ The "do not copy from it at this stage" clause is a real constraint
on how we work, not a formality. See
[ADR-0003](../../decisions/0003-edgeledger-is-comparison-not-template.md).

---

### REQ-0.5 — Write the project pick into the README

**Statement:** Write your pick at the top of your repo's README: **what it is,
who it's for, and the contested write at its heart.**

**Acceptance criteria:**
- [x] README opens with the project name and one-line description
- [x] States who would use it
- [x] **Names the contested write explicitly** — the thing two users can change
      at once where one must win

**Source:** capture §3.3 · **Status:** ✅ **Done** — the README opens with what
Splitr is, who it's for, and the contested write.

**Notes:** The contested write is called out separately from the description,
which tells you it is the load-bearing part of the project choice. Cluster E's
Durable Object exists to arbitrate exactly this.

---

### REQ-0.6 — Open Cluster A with the agentic tool running

**Statement:** Begin Cluster A with an agentic coding tool active.

**Acceptance criteria:**
- [ ] Claude Code (or equivalent) is driving alongside, with `REQ-M.3` observed

**Source:** capture §3.4 · **Status:** 🟡 Claude Code has driven every cluster since A (see `wiki/AI-AUDIT.md`). The box stays open until `REQ-M.3` is: that's Raffaele's review of every file
