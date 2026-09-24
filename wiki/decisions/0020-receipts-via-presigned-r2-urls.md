# ADR-0020: Receipt photos go straight to R2 via presigned URLs, signed with aws4fetch and verified on attach

- **Status:** Accepted. The Verification section, added after testing, records that §3's Content-Type pin **didn't hold** until `allHeaders: true` was added
- **Date:** 2026-09-24
- **Deciders:** AI (mechanism), within `REQ-D.3` and [ADR-0016](./0016-ai-integration-strategy.md) §2. Raffaele created the bucket token and set the secrets.
- **Requirement:** `REQ-D.3`, `REQ-D.6` Q3, `REQ-M.7`

## Context

`REQ-D.3` is specific: *"the Worker hands out a signed URL, the client uploads
directly, the Worker stores only the object key"*, and *"you can explain why the
upload bypasses the Worker."* Its note warns that EdgeLedger serves receipts
*through* a Worker route, and that the course requires the opposite.

**Why it bypasses the Worker:**

- **Size and memory.** A phone photo is 2–8 MB, and a Worker has 128 MB of
  memory, shared by everything it's doing.
- **Cost.** A byte that streams *through* the Worker is billed as Worker time.
  A presigned URL makes R2 the endpoint, so the Worker only signs a
  capability, which takes microseconds, and the bytes never touch it.
- **Surface.** The Worker never parses a multipart upload, which is a classic
  place for bugs.

Constraints on *how*:

- **Worker size:** 2,330 KiB gzipped of 3 MiB (76%). The AWS SDK's presigner
  would cost a large part of the remaining budget.
- **Integrity:** a presigned PUT can pin the `Content-Type`, but R2's docs
  describe no way to pin the *size*.
- **The browser needs CORS on the bucket** to PUT to
  `<account>.r2.cloudflarestorage.com` from Splitr's origin.

## Decisions

1. **Sign with `aws4fetch`, not `@aws-sdk/s3-request-presigner`.** This is
   Cloudflare's own documented R2 example. It's 292 lines, has no
   dependencies, and **is already in the bundle** as a dependency of
   `@opennextjs/cloudflare` (the same version is deduplicated), so the marginal
   size is about zero. The AWS SDK was rejected on size.
2. **Keys are server-chosen and group-scoped:**
   `receipts/<groupId>/<uuid>.<ext>`. The client never names a key, so it
   can't overwrite someone else's object or write outside its group.
3. **The upload URL is narrow:** PUT only, `Content-Type` pinned to the file's
   declared type from an allow-list (`image/jpeg`, `image/png`, `image/webp`),
   and it **expires after 5 minutes**. A leaked URL writes one object, of one
   type, into one group's prefix, briefly.
4. **Only members can ask for one.** The Server Action that signs it runs the
   same membership check as every other write, and a non-member gets
   `not-found`.
5. **The size is enforced on attach, since it can't be enforced on upload.**
   When the expense is saved with a `receiptKey`, the server checks through
   the R2 **binding**, not over HTTP, that the key is under *this* group's
   prefix, that the object exists, that its type is on the allow-list and that
   it's **at most 10 MB**. An upload that fails the check is deleted and the
   expense is refused. Only the key is persisted (`expense.receipt_key`).
6. **Viewing is also direct:** the expense page shows the photo through a
   **5-minute presigned GET**, so it's never streamed through the Worker
   either.
7. **CORS on the bucket** allows `PUT` and `GET` with a `Content-Type`
   header, from the deployed origin and the local dev ports (3000, 3100,
   8787) only.
8. **Configuration:** the R2 keys are secrets (`wrangler secret put`), and the
   account id and bucket name are `vars`, because they're identifiers, not
   credentials. The bucket is also bound as `RECEIPTS` for the server-side
   checks, and for D.6, which reads the image to itemise it.
9. **A failed upload never blocks the expense.** The receipt is optional; if
   the upload fails, the form says so and the expense can be saved without
   it (`REQ-M.7`'s spirit applied to storage).

## Consequences

- `REQ-D.6` Q3's answer is concrete: a signed capability, direct to storage.
  It's about memory, cost and attack surface, in that order.
- **Orphans:** a photo that's uploaded but never attached (the form was
  abandoned) stays in R2. It's harmless and cheap, but unbounded. That's in
  the backlog: either an R2 lifecycle rule on a `pending/` prefix, or the
  nightly cron sweeping unattached keys.
- D.6 (the vision model) reads the image through the `RECEIPTS` binding. The
  model is fed by the Worker, and that's allowed: the requirement is about the
  *upload*.

## Verification

Done on 2026-09-24 in a real browser and against real R2, locally and on
production. Details:
[`../evidence/REQ-D.3-presigned-receipt-uploads.md`](../evidence/REQ-D.3-presigned-receipt-uploads.md).

- **§3 was wrong as first implemented.** A PUT signed "for" `image/png` and
  sent as `text/html` was **accepted (200)**. `aws4fetch` treats
  `content-type` as unsignable by default, and signs only `host`
  (`X-Amz-SignedHeaders=host`). Cloudflare's own `aws4fetch` example has the
  same gap; R2's "the type is pinned" note is about the AWS SDKs. The fix is
  `allHeaders: true`, which gives `content-type;host`, and after it the same
  attack gets **403 SignatureDoesNotMatch**. The attach-time check (§5) is
  what would have caught the bad object anyway: it was refused and deleted.
- **§1, §2, §4, §5, §6, §7 and §9 held as designed.** The browser's only
  request to Splitr during an upload was 52 bytes (the URL request). The PUT
  went to R2 directly. Five attach-time attacks were refused, and both bad
  objects were deleted.
