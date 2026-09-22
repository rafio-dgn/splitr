# Cluster F — Protecting the app

> **This cluster is marked `[OPTIONAL]` on the slide — and we are doing it.**
> [ADR-0005](../../decisions/0005-optional-scope.md): Cluster F costs effort, not
> money, and it is what makes the build defensible at the demo.
>
> `REQ-F.3` (structured `[AUDIT]` logging) was never optional anyway — it also
> appears in the cross-cutting rules (§13) and in Cluster E (§8) as `[MUST]`. It
> applies from the **first mutation in Cluster E**, not deferred to here. See
> `REQ-M.5` and `REQ-E.3`.

Turnstile · Rate limiting · AI Gateway. Source: capture §9.

---

### REQ-F.1 — Rate-limit binding on the busiest write route

**Statement:** Add a rate-limit binding to your busiest write route: hit it six
times fast; the sixth should return **429**. Pick a production window + count and
write the rationale.

**Acceptance criteria:**
- [ ] A rate-limit binding guards the busiest write route
- [ ] **Demonstrated:** six rapid requests, the sixth returns **429**
- [ ] A production window and count are chosen
- [ ] The **rationale is written down**

**Source:** capture §9 · **Status:** ✅ **In scope** ([ADR-0005](../../decisions/0005-optional-scope.md))

**Notes:** The written rationale is part of the requirement. "Five per minute"
without a reason does not satisfy it.

---

### REQ-F.2 — Turnstile on a public form, with a forged-submit test

**Statement:** Add Turnstile to a public form; verify the token server-side in the
Server Action; forge a submit and confirm the server rejects it.

**Acceptance criteria:**
- [ ] Turnstile widget on a public form
- [ ] Token verified **server-side**, inside the Server Action
- [ ] **Demonstrated:** a forged submit is rejected by the server
- [ ] The forged-submit command is recorded as evidence

**Source:** capture §9 · **Status:** ✅ **In scope** ([ADR-0005](../../decisions/0005-optional-scope.md))

**Notes:** Requires a genuinely public, unauthenticated form — see the reference
architecture's "public intake form" (§2.5). If the chosen project has no public
surface, this requirement has nowhere to live; worth checking at `REQ-P.1`.

---

### REQ-F.3 — Structured `[AUDIT]` JSON on every mutation

**Statement:** Emit a structured `[AUDIT]` JSON line — **actor, action, target,
timestamp, outcome** — on every mutation. `wrangler tail | grep AUDIT` should
return parseable lines.

**Acceptance criteria:**
- [ ] Every mutation emits an `[AUDIT]` line
- [ ] Each line carries **actor, action, target, timestamp, outcome**
- [ ] The payload is **parseable JSON**
- [ ] **Demonstrated:** `wrangler tail | grep AUDIT` yields parseable output
- [ ] Every change to a record is traceable from logs alone

**Source:** capture §9, §8, §13 · **Status:** **`[MUST]`** — see the note above

**Notes:** This is the one Cluster F item that is not optional. The five named
fields are exact; use them as the field names.

---

### REQ-F.4 — AI Gateway in front of every model call

**Statement:** Put AI Gateway in front of every model call: caching, logs, rate
limits, and a spend cap on the LLM route.

**Acceptance criteria:**
- [ ] **Every** model call routes through AI Gateway
- [ ] Caching enabled
- [ ] Logs visible
- [ ] Rate limits configured
- [ ] A spend cap set on the LLM route

**Source:** capture §9 · **Status:** ✅ **In scope** ([ADR-0005](../../decisions/0005-optional-scope.md))

**Notes:** "Every model call" covers both the Llama generation (`REQ-C.3`,
`REQ-E.4`) and the embedding calls (`REQ-D.4`).

---

### REQ-F.5 — Secret-rotation drill

**Statement:** Run the secret-rotation drill: do it wrong first and watch it
break; then the right way — dual-key window, deploy the consumer first, update the
producer, retire the old key.

**Acceptance criteria:**
- [ ] Rotation performed **the wrong way first**, and the breakage observed
- [ ] Then correctly: dual-key window → deploy consumer → update producer →
      retire old key
- [ ] No downtime during the correct rotation
- [ ] Both outcomes written up

**Source:** capture §9 · **Status:** ✅ **In scope** ([ADR-0005](../../decisions/0005-optional-scope.md))

**Notes:** Breaking it deliberately is part of the requirement — the lesson is the
failure mode. Dual-key means the consumer accepts an **array** of valid secrets
during the window.

---

### REQ-F.6 — Answer the cluster questions

**Statement:** Be able to answer, unaided:
1. What breaks if you rotate a secret in the wrong order?
2. Could you trace every change to a record from logs alone?

**Acceptance criteria:**
- [ ] Both answered without notes
- [ ] Q2 answerable **yes**, with a demonstration

**Source:** capture §9 · **Status:** Not started

**Notes:** Q2 is really an acceptance test for `REQ-F.3`, which is mandatory. So
this question must be answerable even if the rest of Cluster F is skipped.

---

## Concepts to master

| Concept | What it gets you |
|---|---|
| Rate-limiting binding | Stop abuse at the edge, before it touches D1 or your DO. |
| Turnstile on public forms | Stop bots without inflicting CAPTCHAs on real users. |
| Structured audit logging | Every change grep-able from logs; investigations stop being archaeology. |
| Secret rotation | Rotate across Workers without downtime; know what breaks if you skip a step. |

**Optional refresher:** AI Gateway docs.
