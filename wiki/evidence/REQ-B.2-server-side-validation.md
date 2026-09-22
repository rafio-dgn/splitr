# `REQ-B.2` — the server rejects an invalid payload sent past the client

**Date:** 2026-09-22 · **Build:** `next build` (Next.js 16.3.5), `next start`
**Decides:** the "Demonstrated" acceptance criterion of `REQ-B.2`

---

## What is being proved

That the shared zod schema at `src/lib/schemas/expense.ts` runs on the **server**,
independently of the browser. Client-side validation is UX; it is never a
control. The way to show that is to skip the browser entirely.

**Why curl hits a Route Handler and not the Server Action:** a Server Action is
addressed by a build-generated, encrypted action id that Next.js rotates at least
every 14 days, so no recorded curl command against it would keep working. Both
the Server Action and this Route Handler call the *same* function —
`addExpense()` in `src/lib/expenses/add-expense.ts` — which holds every rule.
There is only one copy of the validation, so curling either entry point exercises
the form's logic. Full reasoning: [ADR-0010](../decisions/0010-validation-entry-points.md).

## Setup

The server ran on **port 3100**, not the usual 3000, because the OrbStack dev
container from [ADR-0007](../decisions/0007-docker-for-local-development.md) was
already bound to 3000. Substitute whichever port `next start` reports.

```bash
npm run build && npm run start          # or: npm run start -- -p 3100
export ORIGIN=http://localhost:3100
```

Create a user and keep its session cookie. This is Better Auth's own endpoint —
no application code is involved (`REQ-B.5`):

```bash
curl -s -X POST $ORIGIN/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"name":"Raffaele","email":"raffaele@example.com","password":"correct-horse-battery"}' \
  -c /tmp/splitr-cookies.txt

export COOKIE="better-auth.session_token=$(awk '/session_token/{print $7}' /tmp/splitr-cookies.txt)"
export USERID=$(node -e "const D=require('better-sqlite3');console.log(new D('./.data/splitr.db').prepare('select id from user').get().id)")
```

---

## The headline command

This is the one to run at the demo. Every field is wrong at once:

```bash
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST $ORIGIN/api/groups/grp_demo/expenses \
  -H 'content-type: application/json' \
  -H "cookie: $COOKIE" \
  -d '{"description":"","amount":"-5.00","currency":"GBP","spentAt":"2099-01-01","paidById":"usr_not_a_member","participantIds":[]}'
```

Output, verbatim:

```
{"error":"invalid","fieldErrors":{"description":["Say what this was for — 'Tesco run', 'taxi to the airport'."],"amount":["Amounts can't be negative. If someone paid you back, record that as a settlement instead."],"spentAt":["An expense can't be dated in the future."],"participantIds":["Pick at least one person to split this with."]},"formErrors":[]}
HTTP 400
```

Note what is **absent** from that response: `paidById`. The membership check runs
only after the shape is valid, so it is proved separately in case 6 below. That
ordering is deliberate — there is no point asking the database whether a
malformed id is a member.

---

## Every payload from `wiki/context/screens-cluster-b.md` §7.5

All run against `POST $ORIGIN/api/groups/grp_demo/expenses`, with
`content-type: application/json` and the session cookie. Only the body varies.

### 0. No session at all

```
{"error":"unauthenticated"}
HTTP 401
```

### 1. `amount: "-5.00"` — negative

```
{"error":"invalid","fieldErrors":{"amount":["Amounts can't be negative. If someone paid you back, record that as a settlement instead."]},"formErrors":[]}
HTTP 400
```

### 2. `amount: "12.005"` — three decimal places

```
{"error":"invalid","fieldErrors":{"amount":["Amounts can have at most two decimal places."]},"formErrors":[]}
HTTP 400
```

### 3. `amount: "0"` — zero

```
{"error":"invalid","fieldErrors":{"amount":["An expense has to be more than £0.00."]},"formErrors":[]}
HTTP 400
```

### 4. `description: ""` — empty required string

```
{"error":"invalid","fieldErrors":{"description":["Say what this was for — 'Tesco run', 'taxi to the airport'."]},"formErrors":[]}
HTTP 400
```

### 5. `participantIds: []` — empty split

```
{"error":"invalid","fieldErrors":{"participantIds":["Pick at least one person to split this with."]},"formErrors":[]}
HTTP 400
```

### 6. `paidById: "usr_not_a_member"` — shape-valid, not in the group

**This is the important one.** Everything else above could in principle have been
caught in the browser. This could not: the client does not hold the membership
list, and could lie about it if it did.

```
{"error":"invalid","fieldErrors":{"paidById":["That person isn't in this group. Refresh the page and pick again."]},"formErrors":[]}
HTTP 400
```

### 7. `spentAt: "2099-01-01"` — future-dated

```
{"error":"invalid","fieldErrors":{"spentAt":["An expense can't be dated in the future."]},"formErrors":[]}
HTTP 400
```

### 8. `currency: "USD"` — not an input in the UI at all

```
{"error":"invalid","fieldErrors":{"currency":["Splitr only handles pounds at the moment."]},"formErrors":[]}
HTTP 400
```

### 9. A body that is not JSON

`-d 'not json at all'`:

```
{"error":"invalid","formErrors":["Body must be valid JSON."]}
HTTP 400
```

A 400, not a 500. The request was wrong; the server was not.

### 10. A group the caller is not a member of

```
{"error":"not-found"}
HTTP 404
```

404, never 403 — a 403 would confirm the group exists.

---

## The other half of the evidence: a valid payload

Easy to forget, and it is what shows the rejections above were not a broken
endpoint refusing everything.

```bash
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST $ORIGIN/api/groups/grp_demo/expenses \
  -H 'content-type: application/json' -H "cookie: $COOKIE" \
  -d "{\"description\":\"Tesco run\",\"amount\":\"42.50\",\"currency\":\"GBP\",\"spentAt\":\"2026-09-19\",\"paidById\":\"$USERID\",\"participantIds\":[\"$USERID\",\"usr_fixture_bob\",\"usr_fixture_chidi\"]}"
```

```
{"status":"accepted","persisted":false,"expense":{"groupId":"grp_demo","description":"Tesco run","amount":4250,"currency":"GBP","spentAt":"2026-09-19","paidById":"Rjx8az9A7TC3MBak7xRTw6TEfmB4jNGK","participantIds":["Rjx8az9A7TC3MBak7xRTw6TEfmB4jNGK","usr_fixture_bob","usr_fixture_chidi"]},"shares":[{"userId":"Rjx8az9A7TC3MBak7xRTw6TEfmB4jNGK","shareMinorUnits":1417},{"userId":"usr_fixture_bob","shareMinorUnits":1417},{"userId":"usr_fixture_chidi","shareMinorUnits":1416}]}
HTTP 202
```

Two things to point at here:

- `"amount": 4250` — the string `"42.50"` came back as **integer minor units**.
  That transform lives in the shared schema, so the client and the server agree
  on it by construction.
- `1417 + 1417 + 1416 = 4250`. The penny remainder is distributed, not dropped.
  The shares were computed server-side; the client never sent them.

`"persisted": false` and `HTTP 202` (not 201) are honest: Cluster B has no
`expense` table. Nothing is stored until `REQ-D.1`, so "no expense appears in the
group afterwards" holds trivially — and the response says so rather than
implying a write happened.

## `[AUDIT]` lines (`REQ-M.5`)

Every one of the calls above emitted a parseable line. Tail of the server log:

```
[AUDIT] {"ts":1790097619,"actor":"Rjx8az9A7TC3MBak7xRTw6TEfmB4jNGK","action":"expense.add","target":"grp_demo","outcome":"rejected:not-a-member","persisted":false,"detail":{"fields":"paidById"}}
[AUDIT] {"ts":1790097632,"actor":"Rjx8az9A7TC3MBak7xRTw6TEfmB4jNGK","action":"expense.add","target":"grp_demo","outcome":"accepted:not-persisted-until-REQ-D.1","persisted":false,"detail":{"amountMinorUnits":4250,"currency":"GBP","participants":3}}
[AUDIT] {"ts":1790097632,"actor":"Rjx8az9A7TC3MBak7xRTw6TEfmB4jNGK","action":"expense.add","target":"grp_someone_elses","outcome":"rejected:not-found","persisted":false}
```

Checked as JSON, not eyeballed:

```bash
grep '\[AUDIT\]' server.log | sed 's/^\[AUDIT\] //' | node -e "..."
# parsed 11 lines OK
```

## The client half — closed 2026-09-22 by the frontend agent

The remaining criterion was *"the client validates against it and shows per-field
errors"*, and it was outstanding because nobody had loaded the page. It has now
been exercised in real Chrome (headless, driven over the DevTools Protocol) on
`next dev -p 3100`, against
`src/app/(app)/groups/[groupId]/expenses/new/add-expense-form.tsx`.

**Every message below was produced by the browser**, from `parseAddExpense`
imported out of `@/lib/schemas/expense` — the same module `addExpense()` uses on
the server. No string in the form is a copy of a schema message.

```
untouched form, before any input -> []          # §7.4: never red before it is filled

description ""        -> Say what this was for — 'Tesco run', 'taxi to the airport'.
amount "-5.00"        -> Amounts can't be negative. If someone paid you back, record that as a settlement instead.
amount "12.005"       -> Amounts can have at most two decimal places.
amount "0"            -> An expense has to be more than £0.00.
amount "abc"          -> Amounts are numbers only — like 42.50.
amount "42.50"        -> (no error)
spentAt "2099-01-01"  -> An expense can't be dated in the future.
spentAt "2019-06-01"  -> Splitr keeps expenses from 2020 onwards.
spentAt today         -> (no error)
participants []       -> Pick at least one person to split this with.
participants (3)      -> live figure: "£14.17 each."
```

Four of these are the payloads the curl above proves the server also refuses —
`-5.00`, `12.005`, `0` and the empty split — which is the point: **one schema,
two sides, identical wording.**

### The error is wired to the field, not merely printed near it

```js
await page.$eval("#amount", (el) => ({
  invalid: el.getAttribute("aria-invalid"),
  describedby: el.getAttribute("aria-describedby"),
  errorText: document.getElementById(el.getAttribute("aria-describedby")).textContent,
}))
```

```
{ invalid: 'true',
  describedby: 'amount-error',
  errorText: 'Amounts can have at most two decimal places.' }
```

### A failed submit is stopped and focus moves to the first bad field

With `description: ""` and `amount: "-5.00"`, clicking **Add expense**:

```
requests during invalid submit: []        # nothing left the browser
focused element:                description
visible errors: [
  "Say what this was for — 'Tesco run', 'taxi to the airport'.",
  "Amounts can't be negative. If someone paid you back, record that as a settlement instead."
]
```

### A valid submit does reach the server, and the server answers

```
requests: [ 'POST /groups/grp_demo/expenses/new' ]     # the Server Action
status:   Validated — Tesco run, £42.50, split 3 ways. Nothing was stored: …
```

`"42.50"` → `£42.50` rendered from the integer `4250` the schema transformed it
into. The form never divides by 100 itself.

### And a rejection only the server can make renders in the same place

`paidById` was set to a user id that is not in the group — a value the client
cannot fault, because the client does not hold the membership list:

```
#paidById-error: That person isn't in this group. Refresh the page and pick again.
```

Same field, same styling, same position as a client-side error. From the user's
side there is one validation system (§7.4); from the code's side there are two,
and only the server one is a control.
