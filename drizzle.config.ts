import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit: schema authoring and migration generation.
 *
 * From `REQ-D.1` on, every schema change is a migration: `drizzle-kit generate`
 * writes SQL into `./drizzle/`, and `wrangler d1 migrations apply` applies it,
 * locally or remotely. `wrangler.jsonc` points `migrations_dir` at the same
 * folder, so the two tools agree on the files and Wrangler's `d1_migrations`
 * table records what has run.
 *
 * Still no `driver` or `dbCredentials`: Drizzle Kit never talks to the database
 * (a `d1-http` driver would need a second credential, a `CLOUDFLARE_API_TOKEN`,
 * for a job Wrangler already does with the OAuth login). ADR-0015.
 *
 * `dialect` stays `"sqlite"`, because D1 *is* SQLite.
 */
export default defineConfig({
	dialect: "sqlite",
	schema: "./src/db/schema.ts",
	out: "./drizzle",
});
