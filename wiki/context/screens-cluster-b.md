# Screens — Cluster B

The user-facing specification for `REQ-B.1` (route tree) and `REQ-B.4` (loading,
error and empty on every async surface). Written before the code, so that the
frontend and backend agents build against a decided shape rather than inventing
one per file.

**Scope.** Cluster B is **local only** — no Cloudflare, no D1, no R2, no Workers
AI. Several screens here exist to *host* something that lands later (receipt
upload at `REQ-D.3`, OCR line items at `REQ-D.3`/`REQ-D.6`, semantic search at
`REQ-D.4`, settle-up at `REQ-E.1`). Those slots are named and their empty states
written, but their mechanics are **out of scope here** and are marked
`→ Cluster D` / `→ Cluster E` throughout.

**Not specified here.** Which component is a Client Component, how state is
fetched, which file is a Server Action. That is the frontend agent's call
(`REQ-B.3`). This page decides *what the user sees and what it says*.

---

## 1. Screen inventory

`(app)` is a **route group** — parentheses, so it contributes no URL segment. It
is the authenticated area and its layout is where the `getSession()` gate lives
(`REQ-B.5`). Everything outside it is public.

### Public — outside `(app)`

| Screen | Route | File | Who can reach it |
|---|---|---|---|
| Landing | `/` | `src/app/page.tsx` | **Anyone.** Already built (`REQ-A.3`). |
| Log in | `/login` | `src/app/(auth)/login/page.tsx` | **Anyone.** Entry point only — Better Auth owns everything behind it. |
| Sign up | `/register` | `src/app/(auth)/register/page.tsx` | **Anyone.** Entry point only. |
| **Join a group** | `/join/[inviteCode]` | `src/app/join/[inviteCode]/page.tsx` | **Anyone with the link — no session required.** This is Splitr's genuinely public surface. Turnstile lands on it at `REQ-F.2`. |
| Auth callbacks | `/api/auth/...` | owned by Better Auth | Not a designed screen. Library territory (`REQ-B.5`). |

> **Assumption flagged.** This page was briefed to assume **Better Auth** as the
> `REQ-B.5` library. The backlog's open question still lists Auth.js / Lucia /
> Clerk and Better Auth is not among them, so the ADR for `REQ-B.5` is still
> outstanding. **Nothing in this design depends on which library wins** — only
> on `getSession()` existing and the `(app)` layout being able to gate on it.

`(auth)` is a second route group purely for grouping; it adds no segment, so the
URLs stay `/login` and `/register`. It exists so the two auth pages can share a
narrow centred shell without that shell leaking onto `/` or `/join`.

### Authenticated — inside `(app)`

Gate: `src/app/(app)/layout.tsx` calls `getSession()`; no session →
`redirect("/login?next=<path>")`. That is the only auth logic anywhere in the
design.

| Screen | Route | File | Who can reach it |
|---|---|---|---|
| My groups | `/groups` | `(app)/groups/page.tsx` | Any signed-in user. The app's home. |
| Create a group | `/groups/new` | `(app)/groups/new/page.tsx` | Any signed-in user. |
| **Group dashboard** | `/groups/[groupId]` | `(app)/groups/[groupId]/page.tsx` | **Members of that group only.** This is the main page for `REQ-B.3` — Server Component, no client-side data calls on load. |
| Add an expense | `/groups/[groupId]/expenses/new` | `.../expenses/new/page.tsx` | Members only. Hosts the `REQ-B.2` form, and the receipt-upload slot → Cluster D. |
| Expense detail | `/groups/[groupId]/expenses/[expenseId]` | `.../expenses/[expenseId]/page.tsx` | Members only. Hosts OCR line items and their correction path → Cluster D. |
| Members & invite | `/groups/[groupId]/members` | `.../members/page.tsx` | Members only. Where the invite link is produced. |
| Settle up | `/groups/[groupId]/settle` | `.../settle/page.tsx` | Members only. **→ Cluster E.** Sketched in §6 because the refused settlement is the product's whole point and must not be designed in a hurry later. |
| Search | `/search` | `(app)/search/page.tsx` | Any signed-in user, results scoped to their groups. **→ Cluster D (`REQ-D.4`).** Route reserved, empty state written. |

### Route tree, as files

```
src/app/
├─ layout.tsx                                   root shell
├─ page.tsx                                     /                       PUBLIC
├─ (auth)/
│  ├─ layout.tsx
│  ├─ login/page.tsx                            /login                  PUBLIC
│  └─ register/page.tsx                         /register               PUBLIC
├─ join/
│  └─ [inviteCode]/
│     ├─ page.tsx                               /join/<code>            PUBLIC  ← Turnstile at REQ-F.2
│     ├─ loading.tsx
│     └─ error.tsx
└─ (app)/                                       route group — no URL segment
   ├─ layout.tsx                                getSession() gate
   ├─ search/
   │  ├─ page.tsx                               /search                 → Cluster D
   │  ├─ loading.tsx
   │  └─ error.tsx
   └─ groups/
      ├─ page.tsx                               /groups
      ├─ loading.tsx
      ├─ error.tsx
      ├─ new/page.tsx                           /groups/new
      └─ [groupId]/
         ├─ layout.tsx                          group shell + membership check
         ├─ page.tsx                            /groups/<id>            ← REQ-B.3 main page
         ├─ loading.tsx
         ├─ error.tsx
         ├─ not-found.tsx
         ├─ members/
         │  ├─ page.tsx
         │  ├─ loading.tsx
         │  └─ error.tsx
         ├─ settle/page.tsx                     → Cluster E
         └─ expenses/
            ├─ new/page.tsx                     ← REQ-B.2 form
            └─ [expenseId]/
               ├─ page.tsx
               ├─ loading.tsx
               └─ error.tsx
```

---

## 2. Group membership is the spine

Every screen under `/groups/[groupId]` answers one question first: **is the
viewer a member of this group?** Nothing else on those pages renders until that
is settled.

Three consequences, all of them user-visible:

1. **One check, in the group layout.** `(app)/groups/[groupId]/layout.tsx`
   resolves the group *and* the viewer's membership together. Children assume
   both. No page re-derives it.
2. **"Not a member" and "does not exist" look identical.** Both render
   `not-found.tsx`. A stranger poking at group ids learns nothing from the
   difference — they cannot discover that a group exists by being refused
   differently. (Called *enumeration defence* in the glossary.)
3. **The group name is in the header of every nested screen.** "Add an expense"
   with no context is a form floating in space. It reads
   *Flat 12b → Add an expense*, always, so nobody records the rent in the ski
   trip.

The only authenticated screens *not* scoped to a group are `/groups` (the list)
and `/search` (which spans the viewer's groups and labels every result with the
group it came from).

---

## 3. Money

Binding on every screen in this document and every screen after it.

- **Integer minor units underneath.** `4250`, never `42.5`. The word `float`
  should not appear anywhere near an amount. A zod schema that outputs a
  `number` of pounds is a bug, not a shortcut.
- **Always rendered with its currency symbol and always two decimals.**
  `£42.50`, `£0.00`, `£1,204.00`. Never `42.5`, never `£42.5`, never a bare
  number in a balance.
- **One currency for now: GBP.** Not a user choice anywhere. The field exists in
  the data shape from day one so that adding currencies later is a migration,
  not a redesign. Multi-currency is already in `wiki/todos/backlog.md` as a
  stretch; it is **not** in Cluster B.
- **Splits are exact to the penny.** £10.00 split three ways is
  **£3.34 / £3.33 / £3.33**, not £3.33 three times. The remainder pennies are
  handed out one each, to participants in a stable order (ascending user id), so
  the same expense always splits the same way. The UI shows the per-person
  figure, not "≈£3.33".
- **Direction is words, not a minus sign.** "You're owed £24.00" and "You owe
  £16.50" — never `-£16.50`. Red/green colour is decoration on top of the words,
  never the only carrier of meaning.
- **Zero has its own sentence.** Not "£0.00" on its own but "You're square."

---

## 4. The core flows

### 4.1 Sign up

1. `/` → **"Get started"** → `/register`.
2. Form: *Your name*, *Email*, *Password*. Button **"Create account"**.
3. Better Auth creates the session (black box — `REQ-B.5`).
4. Redirect to `/groups`, which is empty, so the user lands on the empty state
   that tells them what a group is (§5.3).

Copy: heading **"Create your Splitr account"**, sub *"Free, and you can start a
group in about ten seconds."* Footer link: *"Already have an account? Log in."*

Failure: **"We couldn't create your account. Check your email and password and
try again."** A taken email says so specifically: **"That email already has a
Splitr account. Log in instead."**

### 4.2 Create a group

1. `/groups` → **"Create a group"** → `/groups/new`.
2. One field: *Group name*. Button **"Create group"**.
3. On success, redirect to `/groups/[groupId]` with the invite panel already
   open — because a group of one is useless and the next thing anyone wants is
   the link.

Copy: heading **"Name your group"**, hint *"Something you'll recognise in six
months — 'Flat 12b', 'Ski trip 2027', 'Thursday dinner'."*

### 4.3 Invite someone

1. `/groups/[groupId]` → **"Invite someone"** → `/groups/[groupId]/members`.
2. The invite panel shows the full link and a **"Copy link"** button:
   `https://splitr.example/join/7fK2pQvm`
3. Copy: **"Anyone with this link can join Flat 12b."** Button feedback on
   click: **"Copied."**
4. Splitr does not send the link. The user sends it in whatever chat thread the
   group already argues in — which is the honest behaviour, and avoids email
   infrastructure nobody asked for. (Emailed invites → backlog.)

### 4.4 Join via invite link — **the public surface**

This is the one screen an unauthenticated stranger can reach, and it is the one
`REQ-F.2` protects. It is designed as a real screen now precisely so that
Turnstile drops into an existing form later rather than forcing a redesign.

1. Recipient opens `/join/7fK2pQvm`. **No session required, no redirect to
   login.** A redirect here would destroy the whole point of the surface.
2. The page resolves the invite server-side and shows what they are being asked
   to join, before asking for anything:

   > **Marta invited you to Flat 12b**
   > 4 people are already splitting here.

3. Two branches:
   - **No session** — the join form: *Your name*, *Email*, *Password*, then
     `[ Turnstile widget → REQ-F.2 ]`, button **"Join Flat 12b"**. Below it:
     *"Already have a Splitr account? Log in to join."*
   - **Has a session** — no form fields, just:
     *"You're signed in as raffaele@newpage.io."* button **"Join Flat 12b"**,
     and *"Not you? Switch account."*
4. On success: membership is created and the user lands on
   `/groups/[groupId]` with a one-line confirmation: **"You're in. Here's where
   Flat 12b stands."**

**Turnstile's placement is decided now, not later:** the widget sits between the
last field and the submit button, and its token is verified **inside the server
action** at `REQ-F.2`. Cluster B leaves the space and ships the form without it.

### 4.5 Add an expense

1. `/groups/[groupId]` → **"Add an expense"** → `/groups/[groupId]/expenses/new`.
2. The form of §7. Button **"Add expense"**.
3. Client validates against the shared schema and shows per-field errors; the
   server validates against the *same* schema independently (`REQ-B.2`).
4. On success, redirect to `/groups/[groupId]` with a confirmation line:
   **"Added — Tesco run, £42.50, split 4 ways."**
5. A **"Snap a receipt instead"** slot sits at the top of this screen from
   Cluster D (`REQ-D.3`). In Cluster B the slot is absent — no disabled button,
   no "coming soon". Do not promise what does not exist.

### 4.6 View the group balance

`/groups/[groupId]` — the main page, a Server Component (`REQ-B.3`).

Three stacked sections:

**A. Where you stand** — the headline.
> **You're owed £24.00**
> Marta owes you £12.00 · Sam owes you £12.00 · You owe nobody.

**B. Everyone's position** — one line per member, so the group can read it
together over a table:
> Marta · owes £12.00 — Sam · owes £12.00 — Raffaele · owed £24.00

**C. What's been spent** — the expense feed, newest first:
> **Tesco run** · £42.50 · Raffaele paid · 19 Sep · split 4 ways → £10.63 each

Actions in the group header: **"Add an expense"**, **"Settle up"**
(→ Cluster E), **"Invite someone"**.

---

## 5. State coverage — every async surface

`REQ-B.4` requires loading, error **and empty** for every async page. Each state
below is named individually. Where a surface has no natural empty state, that is
stated and justified rather than skipped — an unexamined empty state is the gap
this section exists to close.

### 5.0 Summary

| # | Async surface | Loading | Error | Empty |
|---|---|---|---|---|
| 5.1 | Invite lookup, `/join/[inviteCode]` | `join/[inviteCode]/loading.tsx` | `join/[inviteCode]/error.tsx` | **Invite not valid** (the degenerate empty) |
| 5.2 | Join submission | inline, button busy | inline banner + per-field | n/a — user-initiated |
| 5.3 | Group list, `/groups` | `groups/loading.tsx` | `groups/error.tsx` | **No groups yet** |
| 5.4 | Create group submission | inline, button busy | inline banner + per-field | n/a |
| 5.5 | Group dashboard — balance | `[groupId]/loading.tsx` | `[groupId]/error.tsx` | **Everyone's square** |
| 5.6 | Group dashboard — expense feed | nested Suspense skeleton | nested feed error | **No expenses yet** |
| 5.7 | Group not found / not yours | — | — | `[groupId]/not-found.tsx` |
| 5.8 | Members & invite | `members/loading.tsx` | `members/error.tsx` | **Only you here** |
| 5.9 | Expense detail | `[expenseId]/loading.tsx` | `[expenseId]/error.tsx` | **No line items** (the OCR slot → Cluster D) |
| 5.10 | Add-expense form — member list | inline skeleton on the split picker | inline | **You're the only member** |
| 5.11 | Add-expense submission | button busy, form locked | inline banner + per-field | n/a |
| 5.12 | Settle up → Cluster E | blocking, non-dismissible | **must never be generic** — §6 | **Nothing to settle** |
| 5.13 | Search → Cluster D | `search/loading.tsx` | `search/error.tsx` | **two** empties: no query, and no results |

### 5.1 Invite lookup — `/join/[inviteCode]`

- **Loading.** A skeleton of the group card plus a live-region line for screen
  readers: *"Checking this invite…"*. The page must not flash the form before
  the group name is known; showing "Join" before "join *what*" is a dark
  pattern by accident.
- **Empty — and this one matters.** A single-record lookup has no list to be
  empty, so its empty *is* "the invite resolved to nothing":
  > **This invite isn't valid**
  > The link may have been mistyped, or turned off by the group.
  > Ask whoever sent it to send you a fresh one.
  >
  > *[ Go to Splitr ]*

  No group name is shown here — there is nothing to leak.
- **Already a member.**
  > **You're already in Flat 12b.**
  > *[ Open Flat 12b ]*
- **Error (our fault, not the link's).**
  > **We couldn't load this invite**
  > This one's on us, not on your link. Try again in a moment.
  > *[ Try again ]*

### 5.2 Join submission

- **Loading.** Button becomes **"Joining…"** and is disabled; fields stay
  readable, not greyed into illegibility.
- **Errors.** Per-field first (§7 conventions apply). Whole-form failures:
  - Email taken: **"That email already has a Splitr account. Log in instead and
    you'll join Flat 12b."** with a link that preserves the invite code.
  - Invite went stale between page load and submit: **"This invite stopped
    working while you were filling the form. Ask for a new link."**
  - Turnstile, from `REQ-F.2`: **"We couldn't confirm you're a person. Refresh
    the page and try once more."**
  - Anything else: **"We couldn't complete the join. Nothing was created —
    try again."**

### 5.3 Group list — `/groups`

- **Loading.** Three card skeletons, each with a name bar and a balance bar.
- **Empty.**
  > **No groups yet**
  > A group is the set of people you split with — your flat, a trip, the
  > Thursday dinner crowd.
  >
  > *[ Create a group ]*
  > Got an invite link? Open it and you'll land straight inside.
- **Error.**
  > **We couldn't load your groups**
  > Nothing is lost — your groups are safe. This is a display problem.
  > *[ Try again ]*

Each loaded card shows: group name, member count, and the viewer's position
(**"You're owed £24.00"** / **"You owe £16.50"** / **"Square"**).

### 5.4 Create-group submission

- **Loading.** Button **"Creating…"**, disabled.
- **Error.** **"We couldn't create the group. Try again — nothing was saved."**
- Per-field errors in §7.2.

### 5.5 Group dashboard — the balance block

- **Loading.** `[groupId]/loading.tsx`: the group header renders immediately
  (the name is known from the route resolution in the layout), then a skeleton
  for the headline figure and one bar per member.
- **Empty.** A group always has a balance; the meaningful empty is a settled
  one:
  > **Everyone's square**
  > Nothing is owed in Flat 12b right now.
- **Error.** `[groupId]/error.tsx`:
  > **We couldn't work out the balance**
  > Your expenses are safe — we just couldn't add them up. Try again.
  > *[ Try again ]*

  This boundary must never claim data is lost. Splitr's balance is derived; a
  failure to derive it is a display failure, and telling a user their money
  records might be gone is the most damaging thing this app could say.

### 5.6 Group dashboard — the expense feed

The feed sits in its own Suspense boundary so a slow feed does not hold up the
balance the user came for.

- **Loading.** Five row skeletons.
- **Empty.**
  > **No expenses yet**
  > Add the first one and the balance starts working.
  > *[ Add an expense ]*
- **Error.** Scoped to the feed, with the balance above it still on screen:
  > **We couldn't load the expenses**
  > The balance above is still accurate. *[ Try again ]*

### 5.7 Group not found, or not yours

`[groupId]/not-found.tsx`, rendered identically for both cases:
> **We can't find that group**
> It may have been deleted, or you may not be a member of it.
> *[ Back to your groups ]*

### 5.8 Members & invite

- **Loading.** Member-row skeletons; the invite panel renders last.
- **Empty.** A group is never memberless — the viewer is in it. The real empty
  state is being alone:
  > **It's just you in here so far**
  > Splitr doesn't do much with one person. Send someone the link.
  >
  > `https://splitr.example/join/7fK2pQvm`  *[ Copy link ]*
- **Error.** **"We couldn't load the members. Try again."** The invite link is
  rendered from the route, not the failed fetch, so it stays usable — the one
  thing a user on this page most likely came for still works.

### 5.9 Expense detail

- **Loading.** Header skeleton plus a split-table skeleton.
- **Empty — the OCR slot.** In Cluster B every expense is hand-entered, so:
  > **No line items**
  > This expense was entered by hand, so there's nothing to itemise.

  From Cluster D this is where the vision model's line items appear, and where
  a wrong line gets corrected. The correction path is designed at Cluster D;
  the slot and its empty state exist from Cluster B so it has somewhere to land.
- **Error.** **"We couldn't load this expense. Try again."**

### 5.10 Add-expense form — the split picker

The "split between" checkbox list is populated from group membership, which is
an async read, which makes it an async surface inside a form.

- **Loading.** Checkbox-row skeletons; the submit button is disabled until the
  member list is known, because a submit with an unknown participant set is a
  wrong expense.
- **Empty.**
  > **You're the only member of Flat 12b**
  > You can still record this expense, but there's nobody to split it with yet.
  > *[ Invite someone ]*
- **Error.** **"We couldn't load who's in this group, so we can't split this
  yet. Try again."** — and the form does not submit. Better to refuse than to
  silently split an expense one way.

### 5.11 Add-expense submission

- **Loading.** Button **"Adding…"**, form fields locked (not cleared). A
  double-submit must be impossible from the UI, though the server is the only
  real control.
- **Error.** **"We couldn't save this expense. Nothing was added — your details
  are still here, try again."** The values stay in the fields. Re-typing an
  itemised expense because of a failed round-trip is the fastest way to lose a
  user.
- Per-field errors in §7.3.

### 5.12 Settle up → §6

### 5.13 Search — `/search` (→ Cluster D, `REQ-D.4`)

Two distinct empties, and conflating them is a common failure:

- **Empty, no query yet.**
  > **Find a past expense**
  > Search by what it actually was, not what the receipt called it. Try
  > "coffee", or "that Thai place".
- **Empty, query returned nothing.**
  > **Nothing matches "that Thai place near the station"**
  > Try fewer words, or a different way of describing it.
- **Loading.** **"Searching…"** with row skeletons.
- **Error.** **"Search isn't responding. Your expenses are all still there —
  open a group to see them."** Search failing must always point at the working
  path.

---

## 6. The refused settlement — sketching where it lives

Settlements are `REQ-E.1`, Cluster E. Nothing here is built in Cluster B. It is
designed now because it is the reason Splitr exists, and because the failure
being designed for happens **with two people standing next to each other**. A
generic error box at that moment is a design failure, not a rough edge.

**Route:** `/groups/[groupId]/settle` — inside `(app)`, members only.

### 6.1 Entry

> **Settle up in Flat 12b**
> **Marta owes the group £40.00** — prefilled.
> Who paid: [Marta ▾]   Amount: [£ 40.00]
> *[ Record this settlement ]*

Empty state: **"Nothing to settle — everyone in Flat 12b is square."**

### 6.2 Submitting

Blocking and **non-dismissible**: **"Recording…"**. The user cannot navigate
away or tap twice. The whole contested-write problem is two taps; the UI should
not contribute a third.

### 6.3 The four outcomes, each with its own screen state

**(a) Settled.**
> **Settled — £40.00**
> Marta's £40.00 is cleared. Flat 12b is square.
> *[ Back to Flat 12b ]*

**(b) Refused — someone else recorded it first.** The important one.
> **Already settled — £40.00**
>
> Bob recorded this same payment 12 seconds ago, at 19:42.
> We refused yours so the £40.00 isn't counted twice.
>
> **Flat 12b is now square.** Marta owes £0.00.
>
> *[ See Bob's settlement ]*   *[ Back to Flat 12b ]*

Rules for this screen, binding on whoever builds Cluster E:

- **It is not an error screen.** Neutral or positive styling — no red, no
  warning triangle. For the group this is the correct outcome; only this one
  writer lost.
- **It names who won and when.** "Bob, 12 seconds ago, at 19:42." Without a
  name the two people standing there cannot reconcile what just happened.
- **It states the balance after the fact,** in money with a currency symbol.
  The user's actual question is "did the £40 land?", and the answer is yes —
  once.
- **The words "Something went wrong" are forbidden here.** Nothing went wrong.
- **It offers the winning record,** so the loser can see it with their own eyes
  rather than take the app's word for it.

**(c) Refused — more than is owed.**
> **That's more than Marta owes**
> Marta owes £40.00 and you entered £60.00. Enter £40.00 or less.

**(d) Could not reach the ledger.** The only genuine error, and it must be
explicit that nothing happened:
> **We couldn't record that**
> Nothing was saved and no balance changed. Check with each other before trying
> again, so the payment isn't recorded twice.
> *[ Try again ]*

That last sentence is deliberate: an ambiguous failure in a two-person settle-up
is exactly when a double-entry gets created by hand.

---

## 7. The one form Cluster B must ship (`REQ-B.2`)

### 7.1 Recommendation: **Add an expense**

`/groups/[groupId]/expenses/new`, on a shared zod schema imported by both the
client and the server.

Why this form and not the others:

1. **It is the only Cluster B write that moves money.** `REQ-B.2`'s point is
   that client validation is UX and never a control. The form where that
   distinction actually costs something is the one that changes a balance.
2. **It has enough shape to make per-field errors real.** Text, a money value,
   a date, a single-select over group members, a multi-select over group
   members, and a hidden route-derived id — six fields with six genuinely
   different failure modes. *Create a group* has one field; proving
   shared-schema validation on `name.min(1)` proves almost nothing.
3. **Money forces the interesting validation.** "42.50" is a string in the DOM
   and must land as the integer `4250`. That transform, its two-decimal limit
   and its bounds are exactly the rules a hand-written client check gets right
   and a server forgets — which is what the curl proof exists to expose.
4. **The schema survives into later clusters unchanged.** Cluster D's OCR
   pre-fills *this* schema; Cluster E's settlement reuses its money rules.
   Nothing built here is thrown away.
5. **Deliberately *not* the join form.** The join form is tempting because it is
   public, but at `REQ-F.2` it grows a Turnstile token, and then the
   "curl an invalid payload past the client" proof is entangled with a captcha
   check. Keep the `REQ-B.2` evidence clean; keep the join form simple.

Suggested schema location: `src/lib/schemas/expense.ts`, exporting
`addExpenseSchema` and its inferred input/output types. Exact path and module
shape are the backend agent's call — the requirement names no path.

### 7.2 For contrast — the *create group* form (also ships, not the proof)

| Field | Input | Rule | Error message |
|---|---|---|---|
| `name` | text | trimmed, 1–60 chars | empty → **"Give the group a name — something you'll recognise later."** · too long → **"Group names are 60 characters at most."** |

### 7.3 `addExpenseSchema` — every field, rule and message

Currency is `GBP` throughout. Amounts are integer **minor units** after parsing.

| Field | Input | Validation rule | Exact error message |
|---|---|---|---|
| `groupId` | hidden, from the route | non-empty id; **server**: viewer must be a member of it | No field error is ever shown. A non-member gets `not-found.tsx` (§5.7) — refusing differently would leak that the group exists. |
| `description` | text, autofocus | trim; 1–80 characters | empty → **"Say what this was for — 'Tesco run', 'taxi to the airport'."**<br>too long → **"Keep it under 80 characters."** |
| `amount` | text, `inputMode="decimal"`, rendered with a fixed `£` prefix | strip spaces and thousands separators; must match `^\d{1,7}(\.\d{1,2})?$`; **transform to integer minor units** (`"42.50"` → `4250`); then `> 0` and `<= 100000000` (£1,000,000.00) | empty → **"Enter an amount."**<br>not a number → **"Amounts are numbers only — like 42.50."**<br>a minus sign → **"Amounts can't be negative. If someone paid you back, record that as a settlement instead."**<br>more than 2 decimals → **"Amounts can have at most two decimal places."**<br>zero → **"An expense has to be more than £0.00."**<br>over the cap → **"That's over the £1,000,000.00 limit. Split it into separate expenses."** |
| `currency` | not an input — the `£` prefix *is* the field, and every rendered amount carries it | `z.literal("GBP")` | Server-only, never seen in normal use → **"Splitr only handles pounds at the moment."** |
| `spentAt` | date, defaults to today | `YYYY-MM-DD`, a real calendar date, not in the future (UTC day), not before `2020-01-01` | not a date → **"Use a real date, like 2026-09-19."**<br>future → **"An expense can't be dated in the future."**<br>too old → **"Splitr keeps expenses from 2020 onwards."** |
| `paidById` | select over group members, defaults to the viewer | non-empty id; **server**: must be a current member of `groupId` | empty → **"Choose who paid."**<br>server rejection → **"That person isn't in this group. Refresh the page and pick again."** |
| `participantIds` | checkbox list over group members, all checked by default | array, at least 1, no duplicates; **server**: every id a current member of `groupId` | empty → **"Pick at least one person to split this with."**<br>server rejection → **"Someone selected isn't in this group any more. Refresh the page and try again."** |

Cross-field rules:

- **`paidById` need not be in `participantIds`.** Paying for a meal you did not
  eat is normal and must not be rejected.
- **The equal split is computed, never submitted.** The client shows the
  derived figure live — *"£10.63 each"* — but the amount per person is derived
  server-side from `amount` and `participantIds` using the penny-remainder rule
  of §3. Never trust a client-sent share.
- **Split model.** Equal shares. Per-item assignment ("who had the pad thai") is
  the open decision at `D.1` and is already in the backlog as a stretch. Either
  way the field is the same — *who is in this split* — so choosing equal shares
  now does not close the door.

### 7.4 Client behaviour

- Validate on blur, then on every change once a field has errored. Never
  validate an untouched field on mount — a form that is red before it is filled
  is hostile.
- Errors render under the field they belong to, tied by `aria-describedby`, and
  the first errored field takes focus on a failed submit.
- If the server rejects something the client passed, the message renders in
  exactly the same place as a client error. From the user's side there is one
  validation system, whatever the truth of it.

### 7.5 The `REQ-B.2` proof — what to curl

The requirement is demonstrated by bypassing the client entirely and getting the
server to refuse. Payloads worth capturing, in this order:

1. `amount: "-5.00"` — negative.
2. `amount: "12.005"` — three decimals. The one a hand-rolled server check
   misses most often.
3. `amount: "0"` — zero.
4. `description: ""` — empty required string.
5. `participantIds: []` — empty split.
6. `paidById: "<a user who is not in the group>"` — passes shape, fails the
   membership refine. This is the payload that proves the server checks
   something the client *cannot*.
7. `spentAt: "2099-01-01"` — future-dated.

Each should return a structured per-field rejection, and **no expense should
appear** in the group afterwards — which is the half of the evidence easiest to
forget to record.

**Flagged for the backend agent:** Server Actions are awkward to curl directly
(they need the generated `Next-Action` id, which changes per build). Deciding
how the invalid payload reaches the server — a stable route handler that the
action also calls, or curling the action with its header — is an implementation
decision that `REQ-B.2`'s evidence depends on. It needs settling before B.4 of
the build plan, not during it.

---

## 8. Deliberately out of scope

Not designed here, and **not** slipped into the spec. Each is proposed into
`wiki/todos/backlog.md` instead:

- Account settings / editing your own name, email or password.
- Editing or deleting an expense once recorded.
- Leaving a group; removing a member; deleting or archiving a group.
- Invite expiry, revocation, or a "regenerate link" control. (The invalid-invite
  copy in §5.1 is deliberately vague about *why* a link failed, so that adding
  expiry later needs no copy change.)
- Emailing an invite. Splitr produces a link; the user sends it.
- Notifications of any kind, in-app or push.
- Multi-currency — already in the backlog as a stretch.
- Receipt upload mechanics, OCR, and the line-item correction path — Cluster D.
- Settlement mechanics, idempotency keys, the Durable Object — Cluster E.
  §6 sketches only where the screens live and what they must say.
- Turnstile itself — Cluster F. §4.4 reserves its position on the join form.

## 9. Requirement trace

| Requirement | Where it is served |
|---|---|
| `REQ-B.1` | §1 — public routes outside `(app)`, the authenticated area in `(app)`, every route placed by App Router convention |
| `REQ-B.2` | §7 — one form, one shared schema, per-field messages, curl payloads |
| `REQ-B.3` | §1, §4.6 — `/groups/[groupId]` is the main page and is server-rendered |
| `REQ-B.4` | §5 — loading, error and empty named individually for thirteen surfaces |
| `REQ-B.5` | §1 — one `getSession()` gate in the `(app)` layout; §4.1 — entry points only |
| `REQ-F.2` | §4.4 — the public join form exists from Cluster B, with Turnstile's position reserved |
| `REQ-E.1` | §6 — where the refused settlement lives and what it must say |
| `REQ-P.3` | §6.3(b) — the loser is told, by name, with the resulting balance |
