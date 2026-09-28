# UI redesign: verification (2026-09-28)

What was checked after applying [ADR-0033](../decisions/0033-visual-design-system.md).
None of this is a course requirement. It shows that the redesign broke
nothing that is one.

## Static checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx eslint src` | clean |
| `node --test "src/**/*.test.ts"` | 89 / 89 pass (re-run after merging `main`, which brought in f6's extra test) |
| `npm run test:ledger` | 10 / 10 pass |
| `npm run build` | succeeds, all 17 routes |
| `grep -rnE "zinc-\|red-[0-9]\|amber-\|dark:" src` | 0 hits outside the comment in `globals.css` |

## The E2E, against the redesigned UI

```
$ node scripts/verify/e2e.mjs http://localhost:3100
  ✔ Alice signs up and lands on /groups
  ✔ Alice creates a group (/groups/grp_e750d51d94134aa0a12e817f9442a434)
  ✔ the members page shows an invite link
  ✔ Bob joins through the invite link (the real form, past Turnstile)
  ✔ Alice adds a £80 dinner, and it's in the feed
  ✔ the first click on the receipt input opens the file picker
  ✔ …and shows no error on the description nobody touched
  ✔ the photo uploads straight to R2
  · read: "CORNER CAFE", £9.50, 3 item(s)
  ✔ Read receipt fills the form with line items
  ✔ Add expense is disabled until the amount is confirmed
  ✔ …and enabled once it is
  ✔ the read receipt is saved as "CORNER CAFE" £9.50
  ✔ Settle up suggests Bob pays Alice £44.75
  ✔ Bob records it: "Settled: £44.75"
  ✔ Alice's duplicate is refused, naming Bob
  ✔ search is reached from the top bar, and its form submits the query
  ✔ search "croissant" finds "CORNER CAFE"
cleanup: 2 user(s), 1 group(s), 2 expense(s), 5 vector id(s), 1 receipt(s)
cleanup: done, D1 re-checked (0 rows left)

e2e passed
```

It was run twice: once mid-way, and again on the final code, after the group
header became a card and its buttons were hidden on action screens. Both runs
passed, and both cleanups left 0 rows.

## Visual pass

Screenshots of a seeded "Flat 12b" (three people, three expenses) were taken
with a throwaway puppeteer script:

- groups, dashboard, add expense, settle up, members, expense detail, landing
  and login;
- at 1280px and 390px;
- in both colour schemes.

The seed was cleaned up (0 rows left). The screenshots are not committed; the
script is easy to re-create from `scripts/verify/lib.mjs`.

Issues found in that pass, and fixed:

- the highlighter under the wordmark's "r" rendered as a blob;
- the group header band had no side edges, so it became a card;
- "Add an expense" in the header competed with the add-expense form's own
  submit button.

## Not verified

- The new UI is not deployed. Production still runs the old one until the
  branch is merged.
- No screen-reader pass (VoiceOver) and no 200% zoom check. Both are in the
  backlog.

## Addendum (2026-09-28): the receipt-first round

- **Static checks:** `tsc`, ESLint and `npm run build` are clean. The tests
  pass: 89 pure and 10 ledger.
- **E2E:** passed against `localhost:3100`, with the read starting on its own.
  Cleanup left 0 rows.
- **Behaviour, checked in a 390px browser:**
  - the account menu opens, and closes on an outside tap;
  - the eye switches the password field from `password` to `text`, with
    `aria-pressed=true`;
  - the receipt flow goes from upload to automatic read to a filled form with
    three lines.
- **Horizontal overflow:** `scrollWidth - clientWidth` is 0 on all 11 pages
  at 360 and 390px, and on the filled receipt form. Before the fix, `/groups`
  was 540px wide at 360px.
- **Left behind:** a throwaway check script grabbed the receipt key before the
  upload had finished, so cleanup couldn't delete one test photo. It is the
  synthetic fixture receipt, with no personal data, under
  `receipts/grp_a2523edbac954559b18c07cd3214e1aa/` in the `splitr-receipts`
  bucket. That is the known orphan case in ADR-0020, and it's in the backlog.
  The D1 rows were cleaned (0 left).
