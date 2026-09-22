import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit — **Cluster B configuration only**.
 *
 * Note what is missing: `out`, and any use of `drizzle-kit generate`. Per
 * ADR-0009, Cluster B creates its local tables with `drizzle-kit push`, which
 * writes no migration files. `REQ-D.1` requires the *first* migration to be
 * generated in Cluster D; generating one here would spend that.
 *
 * At Cluster D this file gains `driver: "d1-http"` (or the wrangler-proxy
 * equivalent) and `out: "./drizzle"`. `dialect` stays `"sqlite"`.
 */
export default defineConfig({
	dialect: "sqlite",
	schema: "./src/db/schema.ts",
	dbCredentials: {
		url: process.env.SPLITR_DB_FILE ?? "./.data/splitr.db",
	},
});
