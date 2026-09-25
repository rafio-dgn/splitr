# CI rollout step 1: the verification scripts, back in the repo

**Date:** 2026-09-25 · **Decision:** [ADR-0024](../decisions/0024-ci-cd-github-actions.md) (and its rollout-step-1 addendum)
**Requirement:** none (CI/CD is Raffaele's added scope). This file records what the scripts were checked against.

---

## What exists now

| File | What it does | Runtime |
|---|---|---|
| `scripts/verify/smoke.mjs` | Per-deploy check, no browser: landing, gate, forged `Origin`, 2-user settle race, idempotent replay | ~15 s |
| `scripts/verify/race.mjs` | The demo's live "after": N rounds of the double settlement, printed like the E.1 evidence. `--keep` leaves the group and prints the logins | ~5 s a round |
| `scripts/verify/e2e.mjs` | Two browser contexts (Alice, Bob): sign-up, group, invite, join, expense, **Read receipt** + confirm gate, settle, refused duplicate, search | ~95 s |
| `scripts/verify/cleanup.mjs` | Removes test data from D1, KV, R2 and Vectorize. Imported by the three above (runs in `finally`); run directly, it sweeps every `@example.test` account. `--dry-run` lists only | ~10 s |
| `scripts/verify/lib.mjs`, `browser.mjs` | Shared plumbing. `browser.mjs` is separate so smoke never loads Puppeteer | |
| `scripts/verify/fixtures/receipt.png` + `make-receipt.mjs` | The synthetic Corner Cafe receipt (£9.50, 3 items), and the script that renders it | |
| `.nvmrc` | `24` | |

All take the site as their first argument. A `localhost` target switches D1 and
KV to `--local`, and R2 and Vectorize stay remote, as they are in `next dev`.

## Verified against production (run by Raffaele, 2026-09-25)

The permission classifier blocked `wrangler d1 execute --remote` from the
agent session, so Raffaele ran it from his machine. His pasted output (it ends
at cleanup; the paste didn't include the final `smoke passed` line):

```
$ node scripts/verify/smoke.mjs https://splitr.raffaele-digennaro.workers.dev
smoke smoke-mugtg2g2-c4f495 → https://splitr.raffaele-digennaro.workers.dev
  ✔ landing page → 200
  ✔ signed-out /groups → 307 to /login
  ✔ sign-up with a forged Origin → 403
  ✔ …and no user row was written
  ✔ sign-up alice.smoke-mugtg2g2-c4f495@example.test → 200
  ✔ sign-up bob.smoke-mugtg2g2-c4f495@example.test → 200
  · group grp_012d25197daf4f72b4e938343126ba60 (direct D1 insert)
  ✔ expense "Smoke dinner" £80.00 → 201
  ✔ concurrent settle → exactly one 201 and one 409
  ✔ the loser is told "Alice Smoke recorded it"
  ✔ D1 holds one £40 settlement
  ✔ expense "Smoke taxi" £20.00 → 201
  ✔ first request → 201, replayed=false
  ✔ same key again → 201, replayed=true
  ✔ the replay's body is byte-identical
  ✔ D1 gained exactly one row
cleanup: 2 user(s), 1 group(s), 2 expense(s), 2 vector id(s), 0 receipt(s)
cleanup: done, D1 re-checked (0 rows left)
```

So the contested write, the origin check and idempotency hold on the live
site, through the same script CI's `deploy.yml` will run, and it left
production as it found it. `race.mjs` and `e2e.mjs` haven't been run against
production yet.

## Verified against: the local stack

`next dev -p 3100` plus the ledger on `wrangler dev`.

```
$ node scripts/verify/smoke.mjs http://localhost:3100
smoke smoke-mugrm3ro-77b7d2 → http://localhost:3100 (local D1/KV)
  ✔ landing page → 200
  ✔ signed-out /groups → 307 to /login
  ✔ sign-up with a forged Origin → 403
  ✔ …and no user row was written
  ✔ sign-up alice.smoke-mugrm3ro-77b7d2@example.test → 200
  ✔ sign-up bob.smoke-mugrm3ro-77b7d2@example.test → 200
  · group grp_4769d1bf2d7940fa86e957855e031fba (direct D1 insert)
  ✔ expense "Smoke dinner" £80.00 → 201
  ✔ concurrent settle → exactly one 201 and one 409
  ✔ the loser is told "Alice Smoke recorded it"
  ✔ D1 holds one £40 settlement
  ✔ expense "Smoke taxi" £20.00 → 201
  ✔ first request → 201, replayed=false
  ✔ same key again → 201, replayed=true
  ✔ the replay's body is byte-identical
  ✔ D1 gained exactly one row
cleanup: 2 user(s), 1 group(s), 2 expense(s), 2 vector id(s), 0 receipt(s)
cleanup: done, D1 re-checked (0 rows left)

smoke passed
```

```
$ node scripts/verify/race.mjs http://localhost:3100 --rounds 3
round 1: Alice→ 201  Bob→ 409  | D1 n:1 t:4000  | loser told "Alice recorded it" ✔
round 2: Alice→ 201  Bob→ 409  | D1 n:2 t:8000  | loser told "Alice recorded it" ✔
round 3: Alice→ 201  Bob→ 409  | D1 n:3 t:12000  | loser told "Alice recorded it" ✔

D1 after 3 × £40 debts: 3 settlement(s), £120.00 (expected 3, £120.00)
```

```
$ node scripts/verify/e2e.mjs http://localhost:3100
  ✔ Alice signs up and lands on /groups
  ✔ Alice creates a group (/groups/grp_e307c8d26d414a699534838edef86151)
  ✔ the members page shows an invite link
  ✔ Bob joins through the invite link
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
  ✔ search "croissant" finds "CORNER CAFE"
cleanup: 2 user(s), 1 group(s), 2 expense(s), 5 vector id(s), 1 receipt(s)
cleanup: done, D1 re-checked (0 rows left)

e2e passed
```

## The controls, tested and not assumed

- **A failing run still cleans up.** The first smoke run hit a ledger missing
  from the dev registry (503 + 503). It failed loudly, and cleanup ran and
  removed everything.
- **Cleanup really removes vectors.** `wrangler vectorize get-vectors` on the
  expense ids from three runs: *"The index does not contain vectors
  corresponding to the provided identifiers"*. That includes one indexed in
  `waitUntil` moments before cleanup ran.
- **A photo uploaded but never saved is removed too.** A scratch copy of the
  E2E threw straight after the upload. Cleanup reported `1 receipt(s)`, and
  `wrangler r2 object get` on the key answered *"The specified key does not
  exist."*
- **Cleanup refuses a real account:** `cleanup({ emails: ["raffaele@gmail.com"] })`
  → *"cleanup only touches @example.test accounts"*. It also refuses a test
  group that has a non-test member, and a receipt key outside the groups it's
  removing.
- **Nothing left behind:** after every run, `cleanup.mjs --dry-run` showed
  exactly the older leftovers it showed before the runs (below).

## Found on the way

1. **A real UX bug, now fixed (see below).** On *Add an expense*, the description is
   `autoFocus`ed. The first click anywhere below it blurs it, which shows its
   "Say what this was for" error and pushes the page down 24 px **between
   mousedown and mouseup**, so the click is lost. Measured: the file input
   moved from y=737 to y=761, and the file chooser didn't open. The second click
   works. A person on a desktop who opens the page and goes straight to
   "Choose file" meets it. *New group* had the same bug, on its "Create group"
   button.
2. **The test raced the app four ways**, and each fix is commented where it's
   made:
   - pages stream in behind a skeleton, so the test waits for text and never
     checks just once;
   - a file set before hydration fires no `onChange`, so every navigation waits
     for the network to go quiet;
   - Vectorize is eventually consistent, so search polls for up to 5 minutes (2 proved too short once);
   - the one-shot `wrangler` calls retry, because an OAuth refresh answered 401
     once and worked seconds later.
3. **Older local test data lives in production R2 and Vectorize.** Local dev
   writes there (ADR-0020, ADR-0022). The sweep's dry run on the local D1 lists
   **3 users, 4 groups, 49 expenses, 71 vector ids and 4 receipts** from
   earlier sessions. **Swept on Raffaele's OK** (2026-09-25):
   `cleanup.mjs http://localhost:3100` removed all of it, and a second dry run
   says `nothing to remove`.

## The layout-shift fix (2026-09-25)

Raffaele: *"I don't want any UI issue."* Two changes, in both forms that
validate on blur (*Add an expense* and *New group*):

1. **A blur on a field that's still empty and was never typed in no longer
   counts as touched.** That follows `screens-cluster-b.md` §7.4, "never
   validate an untouched field": `autoFocus` blurs a field the person never
   touched. A submit still marks every field, so the error shows when it
   matters.
2. **Each field's error line is always there, empty until needed**
   (`min-h-5`), so an error that *does* appear (for example, after typing
   `12.005` and clicking away) moves nothing below it. The forms' gap went from
   `gap-5` to `gap-3` to keep the spacing even.

Verified:
- **E2E:** the step that used to warn is now a failing check. *"the first
  click on the receipt input opens the file picker"* passes, as does
  *"…shows no error on the description nobody touched"*. The same click failed
  before the fix (the chooser didn't open; y 737 → 761).
- **A scratch probe:**
  - *New group*'s first "Create group" click with an empty name → 1 POST,
    and the error shown;
  - typing `12.005` then clicking the date → the error appears, "Who paid?"
    stays at y=616 before and after, and the click landed (focus on the
    date);
  - screenshots of both forms empty and with errors: fields at identical
    heights.
- **Regression checks:** `npm test` 23 + 6, then smoke, race and the E2E, all
  green.

## Step 4: the first CI deploy to production (2026-09-25)

Run **36134628524**, attempt 2. Attempt 1 stopped at the new preflight:
*"CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID is empty"*. Raffaele added
the secrets and re-ran it. Every step is green, in the designed order (from
the job's step timestamps, UTC):

| Step | Start → end |
|---|---|
| `ci / checks` (types, lint, 29 tests, build, size) | 12:50:02 → 12:51:18 |
| Check the deploy credentials | 12:51:43 → 12:51:45 |
| Record the live versions | 12:51:45 → 12:51:47 |
| **Deploy the ledger** | 12:51:47 → 12:51:50 |
| **Apply D1 migrations** | 12:51:50 → 12:51:53 |
| **Build and deploy the app** | 12:51:53 → 12:52:29 |
| Wait 20 s | 12:52:29 → 12:52:49 |
| **Smoke tests** (on production, with cleanup) | 12:52:49 → 12:53:12 |

Live afterwards (`wrangler deployments status`): app **`2dbf0e59`**
(was `3d4f7f18`), ledger **`8cba5af0`** (was `134160f5`), and the site
answers 200. PRs #1 and #2 (the form fix and the credential-free build) are in
production through this deploy. From merge to smoke-tested production:
about 3 minutes.
