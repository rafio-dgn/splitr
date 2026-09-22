# ADR-0007: Docker for local development, via OrbStack

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Raffaele Di Gennaro
- **Requirement:** **None** — this is a Raffaele requirement, not a course one.

## Context

Raffaele asked that everything run in Docker locally, with compose files, and
that a container runtime be installed.

Nothing in the course asks for this. It appears nowhere in the 21 slides, and no
`REQ-*` covers it. It is a legitimate addition — but it is *our* scope, and it is
recorded here so nobody later mistakes it for a course requirement.

### The caveat, stated plainly

**Docker does not give production parity on this project.** Cloudflare Workers run
on V8 isolates at Cloudflare's edge. There is no container in production;
`wrangler deploy` uploads code, not an image. From Cluster C onward, `wrangler dev`
runs **workerd** — the actual production runtime — which is *closer* to production
than Node-in-a-container will ever be.

What Docker genuinely buys here:

- A pinned Node version and toolchain, independent of the host.
- Reproducible onboarding — `docker compose up` and nothing else.
- Isolation of `node_modules` and build artifacts from the host.

What it does not buy: deploy parity, or a meaningful rehearsal of the Workers
runtime. Raffaele was told this before the work started and asked to proceed.

## Options considered

### Runtime

| Option | Licence | Verdict |
|---|---|---|
| **OrbStack** | Free for *personal, non-commercial* use; commercial needs Pro at $8/user/month | **Chosen.** Raffaele characterised this as a personal training project on his own machine, which is his call to make |
| **Docker Desktop** | Free only if the company has **both** <250 employees **and** <$10M revenue | Rejected — would need a NewPage licensing answer first |
| **Colima + docker CLI** | MIT, free commercially, no licence question | Strong runner-up; rejected because it needs Homebrew, which needs a sudo password, and OrbStack is faster on Apple Silicon |
| **Podman** | Apache 2.0 | Not evaluated in depth; compose compatibility is less seamless |

Licensing terms were checked against the vendors' live pages, not recalled.

### Homebrew

Originally planned as the route to Colima. **Not needed and not installed** —
OrbStack ships its own `docker` and `docker compose` CLI. Installing Homebrew
would also have required a sudo password, which an agent cannot supply.

## Decision

**OrbStack 2.2.3**, installed to `/Applications`, with a `Dockerfile.dev` +
`docker-compose.yml` running the Next.js dev server.

Because: the licensing question resolves cleanly under Raffaele's personal-use
framing, it is the lightest option on Apple Silicon, and it removes the Homebrew
dependency (and therefore the sudo problem) entirely.

## Consequences

- `docker compose up` runs the app at `http://localhost:3000`.
- The image is **dev-only**. It is not a deployment artifact and must never be
  presented as one at the demo (`REQ-X.8`).
- `node_modules` and `.next` are anonymous volumes, shadowing the bind mount, so
  the container keeps Linux-built binaries. Without this the host's macOS/arm64
  SWC binary would be mounted over the image's and fail to load.
- File watching uses polling (`WATCHPACK_POLLING`). Bind mounts on macOS do not
  deliver inotify events reliably. Costs some CPU.
- **The host toolchain stays.** Node 24 is installed natively too, and `tsc`,
  `eslint` and `next build` run directly. Docker is an additional way to run the
  app, not a replacement — forcing every command through a container would slow
  the loop for no benefit.
- OrbStack's first run needs GUI interaction and an admin password, so the
  install cannot be fully automated. Raffaele completes it.

### Deferred: how Workers fit (Cluster C)

Open, deliberately. `wrangler dev` runs workerd, which *can* run in a container,
but two things complicate it:

1. `wrangler login` is an interactive browser flow. In a container the answer is
   a `CLOUDFLARE_API_TOKEN` environment variable instead.
2. Bindings marked `"remote": true` reach real Cloudflare resources over the
   network, which works from a container but means "local" dev is not local.

Decide at Cluster C with its own ADR. The likely shape: a `wrangler` service in
compose, authenticated by API token. Do not assume it now.

## Verification

- OrbStack 2.2.3 downloaded from `orbstack.dev/download/stable/latest/arm64`,
  installed to `/Applications` (writable without sudo), launched.
- Docker Desktop and OrbStack licence terms read from the vendors' current
  documentation on 2026-09-22.
- Colima confirmed MIT-licensed, and confirmed to require Homebrew/MacPorts/Nix
  for installation.
- `sudo -n true` confirmed a password is required, ruling out any installer
  needing root.
- **Compose stack not yet run** — blocked on OrbStack's first-run setup.
