# ADR-0030: Turnstile on the public join form, verified in the Server Action, failing closed

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Raffaele (four structured questions: the scope, the widget
  mode, what happens on an outage, and how the E2E joins). The AI proposed the
  options and recommended; he chose the recommendation on all four.
- **Requirement:** `REQ-F.2`

## Context

`REQ-F.2`: Turnstile on a **public** form, the token verified **server-side
in the Server Action**, and a forged submit shown to be rejected, with the
command recorded. Splitr's one public form is `/join/[invite]`, which Cluster B
designed with a reserved slot for the widget (§4.4).

The detail that shapes the scope: for a signed-out visitor, the form
**first signs up through Better Auth's own endpoint**, then calls the
`joinGroupAction` Server Action. And our verification scripts sign up on
production after every deploy.

## Decisions

1. **The scope: the join Server Action only.** `joinGroupAction` verifies the
   token before `joinGroup` runs, on both paths (the signed-out form and the
   signed-in "Join" button). **The known gap:** sign-up itself isn't behind
   Turnstile. It keeps Better Auth's built-in limit (3 sign-ups per 10 s per
   IP, observed). *Rejected:* Better Auth's captcha plugin on sign-up, because
   every scripted production sign-up (smoke, E2E, cron-twice, rate-limit) would
   need a bypass, which is itself a hole.
2. **Managed mode.** Most people see nothing or a one-click checkbox;
   suspicious traffic is challenged. *Rejected:* non-interactive (always a
   visible spinner) and invisible (the least signal to the person).
3. **Fail closed.** No secret, a timeout (5 s), an outage, or an answer that
   doesn't read all refuse the join, with "We couldn't run the human check
   just now. Nothing was changed — try again in a moment." *Rejected:* failing
   open, since an outage would then disable the control.
4. **The nightly E2E keeps joining through the real form.** Managed mode
   usually lets the headless browser through; if it ever gets challenged, the
   step fails loudly. *Rejected:* joining via D1 in the E2E, which would stop
   testing the form.

## How it works

- `src/lib/turnstile/verify.ts` (pure, with `fetch` injected) posts the
  secret, the token and the visitor's IP (`cf-connecting-ip`) to `siteverify`,
  and validates the answer with zod.
- It refuses a missing, empty or oversized token **without** calling
  Cloudflare.
- A refusal writes an `[AUDIT]` line: `group.join`,
  `refused:turnstile:<reason>`, with Cloudflare's error codes.
- The **site key is public** (a `vars` entry in `wrangler.jsonc`). The
  **secret** is `wrangler secret put TURNSTILE_SECRET_KEY`. Locally,
  `.dev.vars` carries Cloudflare's documented test keys.
- The button waits for a token, and the widget resets after every attempt,
  because tokens are single-use.
- **CI refuses any `SET-ME` placeholder** in a `wrangler.jsonc`, so the app
  can't be deployed with a placeholder site key.

## Consequences

- **Locally, a forged token passes,** because the test secret accepts
  anything. Only production, with the real secret, can show the forged-token
  refusal. That's stated in the script and in the evidence.
- **Raffaele's account action:** create the widget (Managed, on
  `splitr.raffaele-digennaro.workers.dev`), put its site key in
  `wrangler.jsonc`, and set the secret.
- **Revisit if** sign-up abuse appears: that's when Better Auth's captcha
  plugin (with a secret-scoped bypass for the scripts) becomes worth it.

## Verification

In the evidence: [REQ-F.2](../evidence/REQ-F.2-turnstile-forged-submit.md).
