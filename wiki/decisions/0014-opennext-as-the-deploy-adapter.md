# ADR-0014: `@opennextjs/cloudflare` as the deploy adapter, not Pages and not vinext

- **Status:** Accepted
- **Date:** 2026-09-23
- **Deciders:** Raffaele (scope), AI (research and recommendation)
- **Requirement:** `REQ-C.1`, `REQ-E.1`, `REQ-E.5`, `REQ-E.6`, `REQ-M.2`

## Context

`REQ-C.1` says only "deploy the Cluster B app to Cloudflare" and deliberately
leaves the adapter open: *"The course does not name the adapter. EdgeLedger uses
`@opennextjs/cloudflare`; the stack list (§12) mentions Pages. Pick one and
record it as an ADR — this is a genuine decision, not a lookup."*

The build plan therefore framed the choice as **OpenNext vs Pages**. Checking the
current Cloudflare documentation on 2026-09-23 showed that framing is out of
date: Cloudflare's Next.js framework guide now says outright that it
*"recommends vinext as the default way to run Next.js applications on Cloudflare
Workers"*, and lists OpenNext as the path for *"existing OpenNext applications
with compatibility gaps preventing migration to vinext"* and Pages only for
*static* exports. So there are three candidates, not two, and the one Cloudflare
puts first is the one neither the course nor our build plan had heard of.

Two facts about **Splitr specifically** constrain the answer more than any
general "which is best" comparison:

1. **Cluster E needs Workers-only primitives.** `REQ-E.1` is a Durable Object,
   `REQ-E.5` requires service bindings (`REQ-M.8` forbids public HTTP between
   Workers), and `REQ-E.6` needs a `scheduled()` handler. Durable Objects,
   service bindings and cron triggers are Workers features; Pages does not offer
   them. The contested write — the heart of the project (`REQ-P.3`) — cannot be
   built on the platform Pages provides.
2. **Cluster B's evidence was captured against the Next.js toolchain.** The
   `REQ-B.2` and `REQ-B.3` evidence files, the `LayoutProps<"/">` generated-type
   gotcha, and the `next dev` versus production-build prefetch discrepancy
   (finding F-2) are all statements about how *Next.js* builds and serves this
   app. An adapter that replaces that toolchain invalidates the evidence rather
   than carrying it forward, and `REQ-C.1` is explicit that the deployed thing
   must be *"the same app from Cluster B, not a rebuild"*.

## Options considered

### Option A — `@cloudflare/next-on-pages` (Cloudflare Pages)

- Pros: named in the course stack list (§12); long-established; the only option
  the course text explicitly mentions by platform name.
- Cons: **cannot host Cluster E.** No Durable Objects, no service bindings, no
  cron triggers — so the project's central requirement would be unbuildable, or
  would need a second deployment target bolted alongside. Separately, Pages is
  now in maintenance mode: Cloudflare is folding Pages features into Workers,
  Workers reached feature parity for static assets, SSR and custom domains in
  March 2026, and `next-on-pages` itself — a wrapper around Vercel's build output
  — is maintained but no longer developed. Cloudflare's own Next.js guide now
  scopes Pages to *static exports*, which Splitr is not.

### Option B — `vinext`

- Pros: Cloudflare's stated default recommendation for Next.js on Workers;
  targets Workers, so Cluster E stays reachable; `vinext init` is
  non-destructive and claims to leave the existing Next.js directories intact;
  supports App Router, RSC, Server Actions, streaming SSR, middleware and
  Cloudflare bindings.
- Cons: **beta, and a reimplementation rather than an adapter.** The published
  version is literally `1.0.0-beta.11`, and the docs say *"vinext is in beta"*
  and recommend a compatibility check before production use. It is a Vite plugin
  that *reimplements the Next.js API surface* — it does not run the Next.js
  compiler at all, so Webpack and Turbopack configuration are out of scope by
  design. Known gaps as of today: no build-time static pre-rendering (ISR only,
  caching after the first request), incomplete Cache Components and Partial
  Prerendering, and no build-time image or font optimisation (`next/font` loads
  Google Fonts from the CDN instead of self-hosting them).

### Option C — `@opennextjs/cloudflare`

- Pros: targets **Workers**, so Durable Objects, service bindings and cron are
  all available for Cluster E. It is an *adapter*: it consumes the output of the
  real `next build`, so the Next.js compiler — and therefore every behaviour
  Cluster B verified — stays in place. Version `1.20.6` declares
  `next: ">=15.5.24 <16 || >=16.3.3"` and `wrangler: "^4.125.0"`; our Next
  16.3.5 and Wrangler 4.136.2 both satisfy it. Supports App Router, SSR, SSG,
  ISR, PPR, middleware and image optimisation. Since Next.js 16.2 there is a
  stable first-party Adapter API built in collaboration with OpenNext,
  Cloudflare and others, and the Next.js team points at this adapter for
  Cloudflare deployment.
- Cons: not Cloudflare's *first* recommendation any more, so we are deliberately
  declining the default and must be able to say why. Requires the Node.js
  runtime, not the Edge runtime — a constraint, though not one Splitr feels.
  Node middleware (Next 15.2+) is unsupported; Splitr does not use it. Worker
  size limit of 3 MiB compressed on the free plan is a real ceiling to watch.
  It is also what EdgeLedger uses, which needs handling honestly (see below).

## Decision

We chose **Option C — `@opennextjs/cloudflare`**.

Because: **it is the only option that keeps Cluster B's verified behaviour and
Cluster E's contested write on the table at the same time.** Pages forecloses
Cluster E outright — the Durable Object that the whole project exists to
demonstrate has nowhere to run. vinext keeps Cluster E but reaches it by
replacing the Next.js compiler with a beta reimplementation, which would put
every Cluster B evidence file back in question mid-course and stake a graded
deliverable on `1.0.0-beta.11`. OpenNext is the only candidate that changes the
deployment target without changing what is being deployed.

**On EdgeLedger.** `@opennextjs/cloudflare` is also EdgeLedger's adapter, and
[ADR-0003](./0003-edgeledger-is-comparison-not-template.md) seals that project
until `REQ-X.6`. This is convergence, not copying: the choice was reached from
Cloudflare's and OpenNext's own documentation plus Splitr's Cluster E
requirements, and nothing in `../typescript-cloudflare-project/` or
`wiki/reference-edgeledger/` was opened. `REQ-C.1`'s note already told us which
adapter EdgeLedger uses, so that fact was available without breaking the seal.
Arriving at the same answer independently is what makes the `REQ-X.6` comparison
worth writing.

## Consequences

- **What this makes easy:** Cluster E as planned — Durable Objects, service
  bindings with `workers_dev: false`, and `scheduled()` all become available on
  the same deployment as the app. Cluster D's bindings (D1, KV, R2, Vectorize,
  AI) attach through the same `wrangler.jsonc`. `next build` stays the build, so
  Cluster B's evidence keeps its meaning.
- **What this makes hard:** the Edge runtime is off the table — every route runs
  on the Node.js runtime under `nodejs_compat`. Node middleware is unavailable if
  we ever want it. The free plan's 3 MiB compressed Worker limit is a real
  budget, and Splitr will grow a vision model path, an embedding path and a DO
  before it is finished.
- **What we will have to revisit if:** vinext reaches a stable 1.0 *and* the
  build-time prerendering and image-optimisation gaps close — at which point the
  comparison is worth re-running, though not mid-course. Also revisit if the
  Worker exceeds 3 MiB compressed, which is a plan-tier decision rather than an
  adapter one.
- **Not decided here:** whether the throwaway Worker of `REQ-C.2` shares this
  configuration. It does not — it is a separate directory created with
  `npm create cloudflare@latest`, per the requirement, and is torn down at C.5.

## Verification

- `npm view @opennextjs/cloudflare version peerDependencies` on 2026-09-23 →
  `1.20.6`, `next: ">=15.5.24 <16 || >=16.3.3"`, `wrangler: "^4.125.0"`.
- `node -p "require('next/package.json').version"` → `16.3.5`, inside the
  declared range.
- `npx wrangler --version` → `4.136.2`, inside `^4.125.0`.
- `npm view vinext version` → `1.0.0-beta.11`, corroborating the docs' "vinext
  is in beta".
- Cloudflare Workers Next.js framework guide, OpenNext Cloudflare docs and the
  Cloudflare Pages→Workers migration guide read on 2026-09-23 for the
  recommendation language, feature support and maintenance status quoted above.
- **Confirmed by doing, 2026-09-23:** `opennextjs-cloudflare build` builds this
  application unchanged (the same 15 routes), and it is deployed at
  https://splitr.raffaele-digennaro.workers.dev. See
  [`../evidence/REQ-C.1-deployed.md`](../evidence/REQ-C.1-deployed.md).
- **Size budget, measured on the first deploy:** 10,698 KiB raw, **2,123 KiB
  gzipped**, against the free plan's 3 MiB compressed limit. That's about 69%
  used before Clusters D and E add anything.
