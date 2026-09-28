# ADR-0033: One token-based visual design system for every screen

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Raffaele ("I like the plan, please go on applying the changes"). The five open decisions below were closed by the AI on the plan's defaults, and are flagged for his review.
- **Requirement:** n/a. No course requirement asks for a redesign; Raffaele asked for it. It must not break `REQ-B.2`, `REQ-B.3`, `REQ-B.4` or the E2E.

## Context

The UI was the Next.js scaffold's zinc greys with no brand. The audit found:

- 258 hard-coded `zinc-*` classes;
- the primary button re-typed in 10 files;
- `body { font-family: Arial }` overriding the Geist font the layout loaded;
- errors in `red-600`, at 4.12:1 on the dark background;
- a 16px remove button;
- no logo, toasts or mobile navigation.

The proposal (a private artifact, https://claude.ai/artifact/BoPtwD74qCEn1ZX477TWgk)
was researched with the ui-ux-pro-max skill. Raffaele approved it.

**Constraints the redesign had to respect:**

- **The screen spec.** Money words carry the meaning, and colour only
  decorates them (§3). "Already settled" is not an error (§6). A failed
  balance says the records are safe (§5.5).
- **`REQ-B.3`.** No client data call on the dashboard.
- **The E2E's selectors:**
  - exactly one `button[type=submit]` per page;
  - `input#receipt`;
  - the labels "Read receipt" and "Record this settlement";
  - the first `<code>` on the Members page holds the invite link;
  - `header a[href="/search"]` and `form[role=search]`;
  - the redirect to `?joined=1`, and exact `/groups/<id>` redirects after
    adding an expense or creating a group.

## Options considered

### Palette

- **Option A: the tool's "Fintech/Crypto" palette** (gold and purple on navy).
  - Cons: it is dark-only and reads like a trading app. It also breaks the
    tool's own "avoid AI purple" rule.
- **Option B: "Trust & Authority" with IBM Plex.**
  - Cons: it reads corporate, and the audience is flatmates.
- **Option C: our own palette.** Ledger green for money that is settled or owed
  to you, clay for "you owe" (not red), and a highlighter yellow reserved for
  the one figure you came for.
  - Pros: specific to Splitr. Every pair is measured at AA or better.
  - Cons: it isn't a database match, and we say so.

### Icons

- **Option A: `lucide-react`.**
  - Cons: a new dependency, for about 20 icons.
- **Option B: inline SVGs** in `components/icons.tsx`.
  - Pros: no dependency. They inherit `currentColor`, so they follow the theme.

### Dark mode

- **Option A: follow the system setting.**
  - Pros: no state.
- **Option B: a toggle.**
  - Cons: needs a cookie so the server renders the right theme without a flash.

### Toasts

- **Option A: a query flag per event**, like `?joined=1`.
  - Cons: it changes the redirect URLs the E2E waits for.
- **Option B: a flash cookie.** Set by the Server Action before `redirect()`,
  read by the `(app)` layout during the render, and passed to `<Toaster>` as a
  prop.

## Decision

We chose **Option C for the palette**, with Outfit, Plus Jakarta Sans and
JetBrains Mono as the fonts. Alongside it:

- **inline SVG icons**;
- **dark mode that follows the system setting**;
- a **mobile bottom tab bar** plus a floating "Add expense" button;
- **toasts via a flash cookie**, with `?joined=1` kept and rendered as a
  toast.

Because: each keeps the app's contracts intact while giving it one visual
language.

- The flash cookie keeps the redirect URLs exactly as the E2E expects, and it
  keeps `REQ-B.3` true: the toast arrives in the HTML.
- Next 16 can't delete a cookie during a Server Component render (checked in
  `node_modules/next/dist/docs`). So the cookie is not `httpOnly`, holds UI
  copy only, lives 30 seconds, and the Toaster clears it once shown.
- Settle-up outcomes stay inline, never toasts: a toast that disappears would
  hide the "Already settled" proof.

**Rules that now bind every screen:**

- **Tokens only.** Colours come only from the tokens in `app/globals.css`.
  No `zinc-*`, no raw hex, no `dark:` prefix.
- **One primary action per screen.** The group header hides its buttons on
  the add-expense and settle-up screens.
- **44px controls.** Every control is at least 44px tall, except `size="sm"`
  in dense rows.
- **`danger` means failed.** It is only for things that actually failed.
  Owing money is `owe`.

## Consequences

- **Now easy:**
  - a colour change is one edit in `globals.css`;
  - every new screen composes `components/ui.tsx`;
  - dark mode is free.
- **Now harder:**
  - a screen that wants a one-off look has to add a token first. That is the
    point.
- **Revisit if:**
  - Splitr gets a settings page. A theme toggle would then need the cookie
    approach.
  - The icon count passes about 40. Reconsider a package then.
  - The E2E's selectors change. The constraints above are why some markup
    looks the way it does.
- **A client component added to the `(app)` shell:** `Toaster`, plus the nav
  (only for `usePathname`). Neither fetches anything.

## Verification

- `tsc --noEmit` and ESLint are clean.
- The unit tests pass: 89/89 pure, 10/10 ledger (re-run after merging `main`).
- `npm run build` succeeds.
- The full two-browser E2E passes against `localhost:3100`, and cleanup left
  0 rows.
- Screenshots were taken at 1280px and 390px, in light and dark.
- See [the evidence](../evidence/UI-redesign-verification.md).

## Addendum (2026-09-28): receipt-first, and a mobile pass

Raffaele's review: the receipt read "looks like a simple document to upload",
when it's the main feature. He also asked for four other fixes.

- **The receipt leads the add-expense form.**
  - "Snap the receipt" is a drop zone at the top. The file input covers it, so
    a tap anywhere opens the camera or picker, and a file can be dropped on it.
  - Once a photo is chosen, the zone shows a local preview (a `blob:` URL),
    three progress steps, a highlighter line sweeping the photo while it's
    read, and "Use a different photo".
  - The read lines and the confirm box follow. Description and amount get a
    "From the receipt" badge.
  - "Or type it in" divides the drop zone from the fields.
  - The description lost `autoFocus`, which opened the phone keyboard over the
    camera.
  - The camera icon also replaces the plus on "Add an expense" and on the
    floating button.
  - On phones, the group header is hidden on action screens, where it pushed
    the receipt below the fold.
  - Reading now starts on its own: see the
    [ADR-0021 addendum](./0021-receipt-reading-approach.md).
- **Show / hide password.** `components/password-input.tsx` is used on login,
  register and join. Its toggle is a `type="button"` with `aria-pressed`.
  Those fields now have an explicit `<label htmlFor>`, because a button inside
  a `<label>` would add "Show password" to the field's accessible name.
- **The account menu closes on an outside tap, on Esc and on navigation.**
  `components/account-menu.tsx`, still a native `<details>`.
- **The "dropdown" on the description was not a mistake.** It is the
  `<datalist>` of recent descriptions (REQ-D.2, ADR-0019), so it stays. Only
  Chrome's arrow is hidden, since it made a free-text field look like a
  select. Suggestions still appear as you type.
- **Mobile horizontal scroll.** Measured on 11 pages at 360 and 390px. The one
  cause was `/groups`: a long group name widened its card to 540px, because a
  grid item is `min-width: auto`. The fix is `min-w-0` on the card. Also,
  `overflow-x: clip` on `html` and `body` as a safety net (`clip`, not
  `hidden`, so the sticky header still works).
