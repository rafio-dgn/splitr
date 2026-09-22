# Cluster A — The language and the runtime

**Part 1 — Foundations.** TypeScript, React and Next.js only. **No Cloudflare
yet.** Part 1 ends with a typed, working application running locally.

Source: capture §4.

---

### REQ-A.1 — Scaffold a fresh Next.js app

**Statement:**
```bash
npx create-next-app@latest <yourapp> --typescript --app --tailwind --src-dir
```

**Acceptance criteria:**
- [ ] App created with exactly these flags: TypeScript, App Router, Tailwind, `src/`
- [ ] It runs locally
- [ ] It is inside the project repo from `REQ-0.3`

**Source:** capture §4 · **Status:** Not started

**Notes:** The flags fix the project shape for every later cluster — App Router
(not Pages), `src/` layout, Tailwind. `REQ-D.1` assumes `src/db/schema.ts`,
consistent with `--src-dir`.

---

### REQ-A.2 — Typed `fetchJson<T>` helper

**Statement:** Write a typed helper `fetchJson<T>(url): Promise<T>` at
`src/lib/fetch.ts`.

**Acceptance criteria:**
- [ ] Lives at exactly `src/lib/fetch.ts`
- [ ] Signature is `fetchJson<T>(url): Promise<T>`
- [ ] Generic — the caller supplies the response type
- [ ] Non-OK responses are handled, not silently returned
- [ ] You can explain why it is shaped this way (`REQ-A.5`)

**Source:** capture §4 · **Status:** Not started

**Notes:** This is the vehicle for the generics lesson. The question "why does
`fetchJson<T>` look the way it does?" is asked directly — expect to defend the
generic parameter, the `Promise<T>` return, and the fact that `T` is an unchecked
assertion about the response body, not a validation of it.

---

### REQ-A.3 — Marketing landing page

**Statement:** Build the marketing landing page, so there is something real to
click.

**Acceptance criteria:**
- [ ] A landing page renders and is navigable
- [ ] It describes the actual chosen project (`REQ-P.1`)

**Source:** capture §4 · **Status:** Not started (unblocked — [ADR-0004](../../decisions/0004-project-is-splitr.md))

---

### REQ-A.4 — Audit every file the agent writes

**Statement:** Audit every file the agent writes — don't let any sneak in.

**Acceptance criteria:**
- [ ] Every file in the repo has been read and understood
- [ ] No unexplained scaffolding survives from `create-next-app`

**Source:** capture §4 · **Status:** Not started · **See also:** `REQ-M.3`

---

### REQ-A.5 — Answer the cluster questions

**Statement:** Be able to answer, unaided:
1. Can you follow a request from the browser to the page it renders?
2. Why does `fetchJson<T>` look the way it does?
3. Which hook would be wrong in which situation?

**Acceptance criteria:**
- [ ] All three answered without notes

**Source:** capture §4 · **Status:** Not started

---

## Concepts to master

Not separately testable, but they are what the cluster is *for*:

| Concept | What it gets you |
|---|---|
| The TypeScript execution model | Types vanish at runtime; the compiler checks but never runs your code. Explains why `any` is a genuine runtime risk. |
| Narrowing, unions, generics | Describe data so the compiler catches mistakes early; write helpers like `fetchJson<T>` cleanly. |
| React hooks | Reach for the right hook; avoid stale-closure traps. |
| Controlled inputs & lifting state | Wire a multi-field form without losing state across re-renders. |
| Promises & async/await | Explain why `fetch` returns a `Response`, not data, and what `await` really does. |

**Optional refreshers:** Matt Pocock · TS Crash Course · Master TypeScript ·
React Hooks · useState in 15 min.
