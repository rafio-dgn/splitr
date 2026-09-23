import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

/**
 * Gives plain `next dev` the Cloudflare bindings from `wrangler.jsonc`.
 *
 * Without this call, `getCloudflareContext()` has nothing to return under
 * `next dev` and `src/db/index.ts` cannot reach D1 — local development would
 * need a second database driver, which is the divergence ADR-0015 exists to
 * avoid. With it, Wrangler starts a local workerd alongside the dev server and
 * the same `DB` binding resolves to a local SQLite-backed D1 in
 * `.wrangler/state`.
 *
 * Called at module scope in this file specifically, which is where the adapter
 * documents it, and deliberately not awaited — it is fire-and-forget by design.
 */
initOpenNextCloudflareForDev();
