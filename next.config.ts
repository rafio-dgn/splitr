import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

/**
 * A config *function*, so it can tell `next dev` from everything else
 * (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/index.md`).
 *
 * `initOpenNextCloudflareForDev()` gives plain `next dev` the Cloudflare
 * bindings from `wrangler.jsonc`. Without it, `getCloudflareContext()` has
 * nothing to return under `next dev` and `src/db/index.ts` can't reach D1, so
 * local development would need a second database driver, which is the
 * divergence ADR-0015 exists to avoid. With it, Wrangler starts a local workerd
 * alongside the dev server, and `DB` resolves to a local D1 in `.wrangler/state`.
 *
 * **Only in the dev server.** It used to run at module scope, so `next build`
 * ran it too. R2, Vectorize and AI are remote bindings, so that opened a remote
 * session that needs Cloudflare credentials, and CI, which has none, couldn't
 * build (found simulating `ci.yml`, 2026-09-25, ADR-0024). The build never uses
 * the bindings: the deployed Worker gets its own at runtime.
 *
 * Deliberately not awaited: it's fire-and-forget by design.
 */
export default function config(phase: string): NextConfig {
	if (phase === PHASE_DEVELOPMENT_SERVER) {
		void initOpenNextCloudflareForDev();
	}
	return nextConfig;
}
