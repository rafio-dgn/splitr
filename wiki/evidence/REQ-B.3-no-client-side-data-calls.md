# REQ-B.3 — the main page makes no client-side data calls

**Date:** 2026-09-22 · **Requirement:**
[`REQ-B.3`](../requirements/clusters/B-routing-and-forms.md) · **Page under
test:** `/groups/grp_demo` — `src/app/(app)/groups/[groupId]/page.tsx`

The criterion is *"verified in devtools: the Network tab shows no client-side
data fetch on load"*. Three independent checks are recorded here, weakest to
strongest. The third is the one worth showing at the demo, because it needs no
tooling at all.

---

## 1. The Network tab, recorded programmatically

Chrome, driven over the DevTools Protocol, recording **every** request the page
makes — the same list the Network tab shows, captured so it can be pasted rather
than screenshotted. The browser signs up, lands on `/groups`, then navigates to
`/groups/grp_demo`; recording covers the navigation plus three further seconds,
to catch anything fired late.

```js
// puppeteer-core 23.11.1, real Chrome, headless
page.on("request", (r) => recording.push({ type: r.resourceType(), url: r.url() }));
await page.goto("http://localhost:3100/groups/grp_demo", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 3000));
```

Output:

```
document   GET /groups/grp_demo
font       GET /_next/static/media/797e433ab948586e-s.p.0r6juujl39pe6.woff2
font       GET /_next/static/media/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2
stylesheet GET /_next/static/chunks/[root-of-the-server]__04kpziu._.css
script     GET /_next/static/chunks/[turbopack]_browser_dev_hmr-client_hmr-client_ts_1di75ot._.js
script     GET /_next/static/chunks/node_modules_next_dist_compiled_next-devtools_index_090k2jm.js
script     GET /_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js
script     GET /_next/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_164kp-6._.js
script     GET /_next/static/chunks/node_modules_next_dist_compiled_1amofcm._.js
script     GET /_next/static/chunks/node_modules_next_dist_client_0_90u2t._.js
script     GET /_next/static/chunks/node_modules_next_dist_1e8vcs8._.js
script     GET /_next/static/chunks/node_modules_@swc_helpers_cjs_1r9vbqw._.js
script     GET /_next/static/chunks/_1anvha4._.js
script     GET /_next/static/chunks/turbopack-_08bm286._.js
script     GET /_next/static/chunks/_1bymjr_._.js
script     GET /_next/static/chunks/node_modules_next_dist_20wefz_._.js
script     GET /_next/static/chunks/node_modules_1kor44w._.js
script     GET /_next/static/chunks/src_0gp_q6q._.js
script     GET /_next/static/chunks/src_1k366da._.js
script     GET /_next/static/chunks/src_053nchv._.js
script     GET /_next/static/chunks/src_components_0xxgnqf._.js
script     GET /[turbopack]_browser_dev_hmr-client_hmr-client_ts_1mojsay._.js
font       GET /__nextjs_font/geist-latin.woff2

TOTAL 23 requests; fetch/xhr: 0
```

**Zero `fetch` and zero `xhr`.** Every request is the document itself or a static
asset, and several of the scripts (`hmr-client`, `next-devtools`) exist only in
`next dev` and are absent from a production build.

## 2. The same page with JavaScript disabled

```js
await noJs.setJavaScriptEnabled(false);
await noJs.goto("http://localhost:3100/groups/grp_demo");
```

```
Splitr Your groups <email> Sign out Flat 3B Add an expense Settle up
Invite someone Everyone's square Nothing is owed in Flat 3B right now.
WHAT'S BEEN SPENT
```

The balance renders with the JavaScript engine switched off. Nothing that a
`useEffect` fetched could survive that.

## 3. `curl` — the version to show at the demo

No browser, no JavaScript engine, nothing to disable. One cookie, one request,
the whole page:

```console
$ curl -s -b cookies.txt http://localhost:3100/groups/grp_demo | strip-tags
Splitr — snap the bill Splitr Your groups curl-1790099203@splitr.test Sign out
Flat 3B Add an expense Settle up Invite someone
Everyone's square Nothing is owed in Flat 3B right now.
What's been spent No expenses yet Add the first one and the balance starts working.
Add an expense
```

Every word the page displays — the balance headline, the section headings and the
expense feed's empty state — is in the bytes the server sent. There is no second
request in which data could arrive.

---

## Why it is true, not merely observed

- `src/app/(app)/groups/[groupId]/page.tsx` has no `"use client"`, so it executes
  only on the server. React hooks are not available to it at all — the mistake is
  *unavailable*, not merely avoided.
- Every read (`requireSession`, `resolveGroup`, `listGroupExpenses`) is `await`ed
  during the render. In the App Router an async Server Component awaits directly.
- The only JavaScript the route ships of its own is `SectionErrorBoundary`, a
  class error boundary with no data. Its `children` — the expense feed — remain
  Server Components: wrapping something in a client shell does not pull its data
  into the browser.

## What would break it

A `useEffect(() => fetch(...))` anywhere in this subtree, or turning the page
itself into a Client Component. Re-run check 3: if a word that used to be in the
`curl` output is missing, the data moved to the client.
