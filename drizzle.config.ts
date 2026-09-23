import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit — schema authoring only.
 *
 * Note what is still missing: `out`, `driver` and `dbCredentials`. Drizzle Kit
 * does not talk to the database at all in Cluster C. The two commands that would
 * need credentials are deliberately unused:
 *
 * - `push` wrote Cluster B's local tables (ADR-0009). It is gone with the local
 *   SQLite file (ADR-0015) — against D1 it would need `driver: "d1-http"` and a
 *   `CLOUDFLARE_API_TOKEN`, which is a second credential for a job
 *   `wrangler d1 execute` already does with the OAuth login we have.
 * - `generate` is reserved. `REQ-D.1` requires the **first** migration to be
 *   generated in Cluster D, and generating one here would spend it.
 *
 * So Cluster C uses `drizzle-kit export`, which diffs the schema against an
 * empty database and prints DDL to stdout without writing a migration folder.
 * `npm run db:ddl` pipes that into `wrangler d1 execute`. See ADR-0015.
 *
 * At Cluster D this file gains `out: "./drizzle"` and `generate` starts being
 * used for real. `dialect` stays `"sqlite"` throughout — D1 *is* SQLite.
 */
export default defineConfig({
	dialect: "sqlite",
	schema: "./src/db/schema.ts",
});
