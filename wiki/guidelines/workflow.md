# Working practices

## Documentation duties — the part that is not optional

Every task carries three obligations. They are not paperwork; they are the reason
this wiki exists instead of an ever-growing `CLAUDE.md`.

| Obligation | File | When |
|---|---|---|
| Record what changed | [`../CHANGELOG.md`](../CHANGELOG.md) | Same turn as the change |
| Record what an AI did and why | [`../AI-AUDIT.md`](../AI-AUDIT.md) | Every AI task, including ones producing no code |
| Record a decision | [`../decisions/`](../decisions/) | Whenever an alternative was closed off |

**Never batch these.** "I'll write the changelog at the end" is how the changelog
ends up wrong. Formats are in the root `CLAUDE.md` §5.

If a change invalidates a wiki page, fix the page in the same turn. A wiki that
lies is worse than no wiki, because people trust it.

## Definition of done

Repeated from `CLAUDE.md` §3 because it is the thing most often skipped:

1. Code complete, `tsc --noEmit` clean.
2. Changelog entry written.
3. AI-audit entry written.
4. Decisions captured as ADRs.
5. Invalidated wiki pages updated.
6. `../todos/backlog.md` reflects reality.

State in your final message which of these you did, and say so plainly if you
skipped one.

## Git

- Branch per phase or feature: `phase-4.1-durable-objects`, `fix/session-expiry`.
- Commit messages: `<area>: <imperative summary>`, e.g.
  `do-worker: add idempotency cache with alarm cleanup`.
- Reference the requirement id in the body once `../requirements/` is populated.
- Never commit: `.dev.vars`, `.env`, real secrets, `node_modules`, `.open-next/`,
  `dist/`, `worker-configuration.d.ts` (regenerate it).
- `routeTree.gen.ts` **is** committed — it is generated but needed for builds.
- Do not commit or push unless asked.

## Deploy order

Dependencies bind by name, so callees must exist first:

```
1. edgeledger-ai
2. edgeledger-transaction-do     (binds AI_SERVICE)
3. edgeledger-consumer           (binds the queue)
4. edgeledger-workflow
5. tanstack-edgeledger-flare     (binds LEDGER, WORKFLOW)
6. nextjs-edgeledger-flare       (binds LEDGER)
```

Before the first deploy, create the resources (D1, KV, R2, both queues), paste
the ids into every `wrangler.jsonc` that binds them, apply migrations, and set
secrets. `setup.sh --bootstrap` in the reference project does all of this.

## Local toolchain (set up 2026-09-22)

| Tool | Version | Notes |
|---|---|---|
| Node | v24.21.0 | Active LTS. Installed via nvm. Node 20 is EOL — don't downgrade to it |
| npm | 11.19.0 | |
| nvm | 0.40.8 | `~/.nvm` |
| Wrangler | 4.136.2 | global npm install |
| git | 2.50.1 | |
| gh | installed | **AI must not use it** — see §6 of `CLAUDE.md` |

### ⚠️ The PATH quirk — read this before debugging "command not found"

zsh sources `.zshrc` **only for interactive shells**. Tooling (editors, agents,
scripts) runs non-interactively and reads `.zshenv` instead. On top of that, this
machine's harness **resets `PATH` after the profile loads** — exported variables
survive, `PATH` edits do not.

Net effect: nvm's `PATH` manipulation is invisible to non-interactive tooling, so
`node` appears missing even though it is installed.

**The fix in place:** `node`, `npm`, `npx`, `corepack` and `wrangler` are
symlinked into `~/.local/bin`, which is already first on the harness `PATH`
(it is where `gh` lives). `~/.zshenv` additionally exports `NVM_DIR` and loads
nvm when `node` is absent.

**If you switch Node versions** with `nvm use`/`nvm install`, the symlinks still
point at the old version. Re-link:

```bash
for b in node npm npx corepack wrangler; do
  ln -sf ~/.nvm/versions/node/$(node --version)/bin/$b ~/.local/bin/$b
done
```

### Cloudflare authentication

`wrangler whoami` currently reports **not authenticated**. `wrangler login` opens
a browser and is interactive, so **Raffaele must run it** — an agent cannot.
Needed from Cluster C onward; Clusters A and B are local-only.

## Running in Docker

Per [ADR-0007](../decisions/0007-docker-for-local-development.md). **Dev only** —
it is not a deployment artifact, and Cloudflare Workers never run as containers.

```bash
docker compose up -d        # start; app on http://localhost:3000
docker compose logs -f web  # follow output
docker compose up --build   # rebuild after a dependency change
docker compose down         # stop and remove
```

| Tool | Version |
|---|---|
| OrbStack | 2.2.3 |
| Docker | 29.4.0 |
| Docker Compose | v5.1.2 |

OrbStack ships its own `docker` CLI; it is symlinked into `~/.local/bin`
alongside node (same PATH reason — see the quirk above). **Homebrew is not
installed and is not needed.**

Things worth knowing:

- **`node_modules` and `.next` are anonymous volumes**, deliberately shadowing
  the bind mount. The host's macOS/arm64 SWC binary would otherwise be mounted
  over the image's Linux one and fail to load.
- **File watching polls** (`WATCHPACK_POLLING`). macOS bind mounts do not deliver
  inotify events reliably. Verified: editing a file on the host recompiles inside
  the container.
- **The host toolchain still works and is still the fast path.** `npm run build`,
  `tsc --noEmit` and `eslint` run natively. Docker is an extra way to run the
  app, not a replacement.
- **A dependency change needs `--build`.** `npm ci` runs at image build time, so
  editing `package.json` alone will not install anything in the container.

## Local development

- `wrangler dev` per worker; frontends use `npm run dev`.
- `"remote": true` on D1/KV/R2 in the frontends means local dev hits the **real**
  resources. Know that before you seed test data.
- Local secrets go in `.dev.vars` — gitignored, never committed.
- Service bindings need the target worker running locally or deployed.
- `wrangler tail <worker>` to watch structured logs live.

## Changing a binding

1. Edit `wrangler.jsonc`.
2. Re-run `npm run cf-typegen`.
3. Update `src/types/env.d.ts` if it is a secret or an `unsafe.binding` —
   `wrangler types` does not see those.
4. If the code must run without it, type it optional and guard the call site.
5. Redeploy the worker that declares it *and* everything that binds to it.

## Working with the reference project

- Read freely, never edit.
- Cite path and line range when you copy a pattern.
- When you deviate from it, write an ADR saying why. Deviating is fine;
  deviating silently is not.
