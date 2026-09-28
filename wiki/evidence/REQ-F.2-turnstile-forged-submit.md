# `REQ-F.2`: Turnstile on the join form, and a forged submit refused

**Date:** 2026-09-28 · **Decision:** [ADR-0030](../decisions/0030-turnstile-on-join.md)
**Verified:** locally, with Cloudflare's test keys. **The forged-token refusal:** production only (Raffaele, after the real keys are set).

---

## The criteria

| Criterion | Met by |
|---|---|
| A Turnstile widget on a public form | `/join/[invite]` (the signed-out form and the signed-in "Join" button), in Managed mode, between the last field and the button (§4.4) |
| The token verified server-side, inside the Server Action | `joinGroupAction` → `verifyTurnstile` (`siteverify`), before `joinGroup` runs; it fails closed |
| A forged submit rejected | `scripts/verify/turnstile-forge.mjs`: the real request is intercepted and its token swapped; then replayed with curl |
| The forged-submit command recorded | Below: the exact `curl` with its `Next-Action` id |

## Local run (test keys)

```
$ node scripts/verify/turnstile-forge.mjs http://localhost:3100
  ✔ the widget issued a token (the Join button is enabled)
  ✔ the Server Action request was intercepted (the real token was 21 chars; sent "forged-by-script-ts-mulbmp63-6ff045")
  · locally, the test secret accepts any token, so the forged join went through, as expected with test keys

  $ curl -X POST http://localhost:3100/join/4be6f6b4a0 -H 'Next-Action: 60fe0df999f838b007319ab284ae8c6eb9b43bc752' -H 'Cookie: <the joiner's session>' --data '["4be6f6b4a0",""]'
    → HTTP 200, body: 0:{"a":"$@1",…}
1:{"status":"not-verified"}

  ✔ curl with an EMPTY token → the server answers not-verified
  ✔ …and writes no membership
turnstile-forge passed
```

- **The forged-submit command** is a direct POST to the Server Action, past the
  page and past the widget. The server refused it (`not-verified`), and no
  `group_member` row was written.
- **The limit, stated:** with the test secret, `siteverify` accepts any token,
  so the swapped forged token passed locally. Refusing a forged *token* needs
  the real secret, which means production.
- **The full E2E passes** with the widget in place. Bob joins through it.

## Unit tests (`src/lib/turnstile/verify.test.ts`)

- a confirmed token is accepted, and the secret, token and IP are sent;
- a forged token is refused, carrying `invalid-input-response`;
- a missing, empty or oversized token is refused without calling Cloudflare;
- **it fails closed:** no secret, a network error, a 5xx, an unreadable
  answer and a timeout all refuse.

## On production (Raffaele, after the widget and the secret are set)

```
node scripts/verify/turnstile-forge.mjs https://splitr.raffaele-digennaro.workers.dev
```

There, the **forged** token must be refused too: in the browser ("We couldn't
confirm you're human") and through curl.
