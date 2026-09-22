# Cross-cutting rules

Requirements that apply to **every** cluster. Source: capture §1 and §13.

---

### REQ-M.1 — One project, built incrementally

**Statement:** There is no separate coursework. One single project is built and
extended across six clusters. Never separate exercises.

**Acceptance criteria:**
- [ ] All cluster work lands in one GitHub repository
- [ ] Each cluster extends the previous one rather than starting something new

**Source:** capture §1, §13 · **Status:** Not started

---

### REQ-M.2 — Clusters in order, one capability per step

**Statement:** Work through the clusters in order, adding exactly one capability
per step.

**Acceptance criteria:**
- [ ] No cluster is started before its predecessor is complete
- [ ] Each step adds one capability, not several

**Source:** capture §1 Step 2 · **Status:** Not started

**Notes:** This constrains the build plan directly. Do not parallelise clusters.

---

### REQ-M.3 — Every agent-written file is reviewed and understood

**Statement:** Build with an agentic tool writing alongside you, but read
everything it produces rather than pasting blindly. Audit every file the agent
writes — don't let any sneak in.

**Acceptance criteria:**
- [ ] No file exists in the repo that has not been read line by line
- [ ] Nothing was accepted because it "looked right"

**Source:** capture §1 Step 3, §4 (Cluster A), §13 · **Status:** Not started

**Notes:** This is a requirement *on Raffaele*, and it shapes how the AI should
work: produce reviewable increments, explain what each file does, never dump a
large generated tree. See [`../guidelines/ai-collaboration.md`](../guidelines/ai-collaboration.md).

---

### REQ-M.4 — Every decision explainable in your own words

**Statement:** Understand each choice; be able to explain every decision in your
own words.

**Acceptance criteria:**
- [ ] Every architectural choice has a recorded rationale
- [ ] Each cluster's "Questions you must be able to answer" can be answered
      unaided

**Source:** capture §1 Step 4, §13 · **Status:** Not started

**Notes:** This is what `../decisions/` and the per-cluster question lists are
for. The 15-minute demo (`REQ-X.6`) tests it directly.

---

### REQ-M.5 — Every mutation emits an `[AUDIT]` line

**Statement:** Every mutation emits an `[AUDIT]` line.

**Acceptance criteria:**
- [ ] Every write path in the app emits one
- [ ] `wrangler tail | grep AUDIT` returns parseable lines
- [ ] Fields include actor, action, target, timestamp, outcome (per `REQ-F.3`)

**Source:** capture §13, §8, §9 · **Status:** Not started

**Notes:** Stated in the cross-cutting rules *and* in Cluster E, so it applies
from the first mutation onward — not only once Cluster F is reached. Cluster F is
optional; this rule is not.

---

### REQ-M.6 — Retries must be safe

**Statement:** Idempotency keys on writes; UPSERT-on-conflict on scheduled work.

**Acceptance criteria:**
- [ ] Replaying any write with the same idempotency key produces no second write
- [ ] Running any scheduled task twice produces an identical result

**Source:** capture §13 · **Status:** Not started

---

### REQ-M.7 — AI and secondary Workers never block the primary write path

**Statement:** AI and secondary Workers must never block or break the primary
write path.

**Acceptance criteria:**
- [ ] The primary write succeeds when the AI Worker is down
- [ ] The primary write succeeds when the AI Worker is slow
- [ ] Failure is recorded, not propagated

**Source:** capture §13, §8 · **Status:** Not started

---

### REQ-M.8 — Internal Worker-to-Worker calls use service bindings

**Statement:** Internal Worker-to-Worker calls use service bindings, never public
HTTP.

**Acceptance criteria:**
- [ ] No internal call uses a public hostname
- [ ] Every internal callee sets `workers_dev: false`

**Source:** capture §13, §8 · **Status:** Not started
