# `REQ-D.3`: receipt photos straight to R2 via presigned URLs

**Date:** 2026-09-24 · **Bucket:** `splitr-receipts` · **Deployed version:** `fa599e00`
**Decision:** [ADR-0020](../decisions/0020-receipts-via-presigned-r2-urls.md)

---

## The criteria

| Criterion | Met by |
|---|---|
| The Worker issues a presigned URL | `requestReceiptUploadAction`: members only, a server-chosen key `receipts/<groupId>/<uuid>.<ext>`, PUT only, **Content-Type pinned**, 5 minutes |
| The client uploads **directly to R2** | The browser's own request log, below |
| Only the object key is persisted | `expense.receipt_key` = `receipts/grp_c539…/0a05af8a….png` |
| Why it bypasses the Worker | Memory (a phone photo against 128 MB shared), cost (streamed bytes are billed Worker time) and surface (no multipart parsing). ADR-0020 |

## The browser's view of an upload (real Chromium, production)

Every request the page made while a 5,080-byte PNG was attached:

```
POST    splitr.raffaele-digennaro.workers.dev   /groups/grp_88a1…/expenses/new   body=52B   ← asks for the URL
OPTIONS 3082c765….r2.cloudflarestorage.com     /splitr-receipts/receipts/grp_88a1…         ← CORS preflight
PUT     3082c765….r2.cloudflarestorage.com     /splitr-receipts/receipts/grp_88a1…   image/png
```

The only request to Splitr carried **52 bytes** (the group id and the file
type). Puppeteer reports binary PUT bodies as 0 B, so the upload's size was
confirmed from R2 itself: the stored object is **5,080 bytes and
byte-identical** to the file.

The expense page then shows the photo from **R2's own host** through a presigned
GET: `{"host":"3082c765….r2.cloudflarestorage.com","loaded":true,"w":64,"h":40,"expires":"300"}`.
It's a plain `<img>`, deliberately not `next/image`, whose optimiser would
fetch the photo *through* the Worker.

## A real bug, caught by attacking it

| Attack | Before the fix | After |
|---|---|---|
| A PUT signed for `image/png`, sent as `text/html` with a `<script>` body | **HTTP 200. Accepted** | **HTTP 403 `SignatureDoesNotMatch`** |

**Cause:** `aws4fetch` treats `content-type` as unsignable by default, so the
URL's `X-Amz-SignedHeaders` was just `host`. **Fix:** `allHeaders: true`, which
gives `content-type;host`. Cloudflare's own `aws4fetch` example has the same
gap; R2's "the Content-Type is pinned" note describes the AWS SDKs. The design
survived even before the fix: the attach check (below) refused that object and
deleted it.

## The attach check: five attacks, all refused, nothing stored

Through `POST /api/groups/:id/expenses` with a `receiptKey`:

| Attempt | Response |
|---|---|
| Another group's prefix | 400: "That photo didn't finish uploading. Attach it again." |
| Path traversal (`receipts/<g>/../grp_x/…`) | 400 (the same) |
| Well-formed, never uploaded | 400 (the same) |
| An 11 MB object | 400: "That photo is over 10 MB. Try a smaller one." |
| An object stored as `text/html` | 400: "Receipts must be a JPEG, PNG or WebP photo." |

**Both bad objects were deleted from R2 by the check, and 0 expenses were
created.** The key's shape is matched against this group's exact prefix before
R2 is asked. Existence, size and type come from the R2 **binding**
(`head()`), not from anything the client said.

## Configuration, verified

- CORS on the bucket: `PUT` and `GET` with `Content-Type`, from the deployed
  origin and `localhost` 3000/3100/8787 only. It's kept as `r2-cors.json` in
  the repo and read back after applying.
- Secrets: `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` via `wrangler secret
  put` (Raffaele). Vars: `R2_ACCOUNT_ID` and `R2_BUCKET`.
- The token is **Object Read & Write, scoped to this bucket only**.
- Local dev uses the **real** bucket (`remote: true`). A simulated binding
  would check an empty local bucket, while the presigned URL points at real
  R2.

Production test data was deleted afterwards: the R2 objects (by their keys
from D1), the rows and the KV key.
