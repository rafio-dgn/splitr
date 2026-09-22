# ADR-0006: The Next.js app lives at the repo root; Workers live in `workers/`

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** AI, pending human review
- **Requirement:** `REQ-A.1`, `REQ-A.2`, `REQ-D.1`, `REQ-C.2`

## Context

Before scaffolding, the repo needs a shape. By the end of the course Splitr will
have several deployables:

- the Next.js web app (Cluster A onward)
- a throwaway hello-world Worker (Cluster C, torn down again)
- an AI Worker doing RAG (Cluster E)
- a Durable Object worker arbitrating settlements (Cluster E)

Two requirements name **exact paths**:

> `REQ-A.2` — *"a typed helper `fetchJson<T>(url): Promise<T>` at
> `src/lib/fetch.ts`"*
>
> `REQ-D.1` — *"design the schema in `src/db/schema.ts` with Drizzle"*

Neither says "relative to the app". The course's scaffold command,
`npx create-next-app@latest <yourapp>`, would produce `<yourapp>/src/lib/fetch.ts`
— one directory deeper than the requirement reads.

## Options considered

### Option A — App in a subdirectory (`web/`), workers alongside
```
splitr/
├── web/          → web/src/lib/fetch.ts
├── workers/
└── wiki/
```
- Pros: every deployable is a peer; root stays clean; scales obviously.
- Cons: `src/lib/fetch.ts` and `src/db/schema.ts` are **not** at the paths the
  requirements name. Defensible, but it is an argument to have at the demo rather
  than a fact to point at.

### Option B — App at the repo root, workers in `workers/`
```
splitr/
├── src/          → src/lib/fetch.ts  ✅ literal match
│   ├── lib/
│   ├── app/
│   └── db/       → src/db/schema.ts  ✅ literal match
├── workers/
│   ├── ai/
│   └── ledger/
├── wiki/
├── public/
├── package.json, next.config.ts, tsconfig.json, …
└── README.md
```
- Pros: both named paths match **literally**. The web app is the project's
  primary artifact and reads as such. Deploy config is simpler — one app, one
  root.
- Cons: root carries the Next.js config files alongside `wiki/` and `workers/`.
  The web app is implicitly privileged over the workers rather than being a peer.

### Option C — A formal monorepo (npm workspaces / Turborepo)
- Pros: proper dependency sharing; the "right" answer at scale.
- Cons: nothing in the course asks for it, and it adds tooling to explain and
  defend under `REQ-M.4`. Four deployables with almost no shared code do not
  justify a workspace tool.

## Decision

We chose **Option B** — Next.js at the repo root, Workers in `workers/<name>/`.

Because: two requirements name `src/lib/fetch.ts` and `src/db/schema.ts`
explicitly, and the cheapest way to satisfy a path requirement is to put the file
at that path. Option A would have me explaining a discrepancy at the demo for no
gain; the root clutter it avoids is cosmetic.

Workers still go in their own directories, which also satisfies `REQ-C.2`'s
*"spin up a hello-world Worker in its own directory"*.

## Consequences

- Scaffold with `create-next-app` targeting `.`, not a new subdirectory. The
  existing `README.md` (which carries `REQ-0.5`) must survive — verify after
  scaffolding, and restore from git if the generator overwrites it.
- `wiki/` sits beside `src/`. Acceptable: it is documentation, and `CLAUDE.md`
  points at it from the root anyway.
- Each Worker under `workers/` gets its own `package.json` and `wrangler.jsonc`
  and is deployed independently. No shared lockfile.
- Cross-worker types will be duplicated rather than imported, since there is no
  workspace. Accepted for now; if it becomes painful, revisit with Option C and a
  new ADR.
- The throwaway Cluster C worker goes in `workers/hello/` and is **deleted**
  when `REQ-C.2`'s teardown step runs.
- Revisit if: a fifth deployable appears, or genuinely shared code emerges
  between the app and the workers.

## Verification

Both named paths confirmed against the capture: `REQ-A.2` (§4) and `REQ-D.1` (§7).
`REQ-C.2`'s "in its own directory" (§6) confirmed as satisfied by `workers/hello/`.
