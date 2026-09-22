/**
 * The database composition root.
 *
 * This is the **only** file that knows which SQLite driver we are on. Per
 * [ADR-0009](../../wiki/decisions/0009-better-auth-on-local-sqlite-via-drizzle.md),
 * Cluster B runs on a local SQLite file via `better-sqlite3`; Cluster C/D swaps
 * these three lines for `drizzle-orm/d1` and a `D1Database` binding. Nothing
 * else in the codebase changes, because `schema.ts` and every query are written
 * against the same `drizzle-orm/sqlite-core` dialect.
 *
 * `better-sqlite3` is a native Node module and cannot run on Workers. Keeping it
 * confined here is what makes the Cluster D swap a one-file edit rather than a
 * hunt.
 */
import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

/**
 * Reads a required environment variable.
 *
 * `process.env` is a trust boundary: every value is `string | undefined`, so it
 * is narrowed here once rather than asserted at each call site.
 */
function requireEnv(name: string): string {
	const value: string | undefined = process.env[name];
	if (value === undefined || value === "") {
		throw new Error(
			`Missing required environment variable ${name}. Copy .env.example to .env.`,
		);
	}
	return value;
}

const file = process.env.SPLITR_DB_FILE ?? "./.data/splitr.db";

const sqlite = new Database(file);

// Foreign keys are OFF by default in SQLite and must be enabled per connection.
// D1 enables them by default, so turning them on here means local behaviour
// matches Cluster D rather than being quietly more permissive.
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export { requireEnv };
