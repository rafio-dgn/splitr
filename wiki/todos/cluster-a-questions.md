# Cluster A — the questions you must be able to answer

`REQ-A.5`. These are **yours to answer unaided** — the panel asks them at the
15-minute demo (`REQ-X.8`), and `REQ-M.4` requires the answer in your own words.
Notes below are revision material, not a script.

---

## 1. Can you follow a request from the browser to the page it renders?

For `GET /` on Splitr right now:

1. Request hits the Next.js server.
2. The router matches `src/app/page.tsx` — file-system routing, no route table.
3. `src/app/layout.tsx` wraps it: `<html>`, `<body>`, the Geist font variables,
   and the `metadata` export becomes `<title>` and `<meta name="description">`.
4. Both are **Server Components** by default — no `"use client"` anywhere in our
   tree. They render to HTML **on the server**. No React ships for them.
5. `/` is fully static, so `next build` prerendered it at build time. The build
   output confirms: `○ (Static) prerendered as static content`.
6. The browser receives HTML, paints it, then hydrates only the interactive
   parts. Ours are `next/link` anchors.

Worth being able to say: **nothing on this page requires JavaScript to read it.**

## 2. Why does `fetchJson<T>` look the way it does?

Read [`src/lib/fetch.ts`](../../src/lib/fetch.ts) — the reasoning is in the file.
The four things to be able to defend:

**Why generic?** So the caller names the expected shape and gets a typed result,
instead of `any` or `unknown` plus a cast at every call site. One helper, every
response type.

**Why is `T` a lie?** This is the point of the whole cluster. TypeScript types are
**erased at compile time**. Nothing at runtime checks the server returned a `T`.
`fetchJson<User>(url)` on a server returning `{nonsense: true}` gives you a value
typed `User` that isn't one, and it blows up at the first property access —
*away* from the call site, which is what makes it nasty.

That is why `any` is a real runtime risk, not a style complaint: it doesn't just
switch off checks, it lets wrong data travel far from where it entered.

**Why read the body as text first?** On an error response the body is often HTML
or empty. `response.json()` would throw a parse error that **masks the status
code** — the thing you actually needed. Reading text once lets us attach the real
body to `HttpError`.

**Why typed error classes?** So callers can branch — `HttpError` means the server
answered and refused; `JsonParseError` means it answered with rubbish. A bare
`Error` forces string-matching on messages.

**The follow-up to expect:** *"So how do you actually make it safe?"* → You
validate at runtime. Cluster B's shared zod schema (`REQ-B.2`) is exactly that,
and the curl-past-the-client test proves it runs server-side.

## 3. Which hook would be wrong in which situation?

Nothing in Cluster A uses hooks — every component is a Server Component, and
**hooks don't exist there**. That is itself the best answer to open with.

The traps to know:

| Situation | Wrong | Why | Right |
|---|---|---|---|
| Fetching data for initial render | `useEffect` + `useState` | Waterfall: render, then fetch, then re-render. Ships JS, flashes empty, hurts SEO | Fetch in a Server Component |
| Value derivable from props/state | `useState` + `useEffect` to sync it | Two sources of truth that drift | Compute it during render |
| Reading a value in a callback | `useState` captured in a stale closure | The callback closes over the value from *that* render | `useRef`, or the updater form `setX(prev => …)` |
| Expensive recompute every render | Reaching for `useMemo` first | Usually premature; the dep array is its own bug source | Measure first |
| Subscribing to something external | `useEffect` + manual teardown | Easy to leak or tear down wrongly | `useSyncExternalStore` |

**Stale closures** is the one the question is fishing for: a callback sees the
values from the render that created it, not the current ones — the classic
`setCount(count + 1)` in an interval that never advances past 1.

---

## Status

- [ ] Q1 answerable unaided
- [ ] Q2 answerable unaided
- [ ] Q3 answerable unaided

Tick these when you can do it without the page open.
