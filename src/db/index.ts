/**
 * The database composition root.
 *
 * This is the **only** file that knows which SQLite driver we are on, and as of
 * Cluster C there is exactly one: D1, both deployed and locally
 * ([ADR-0015](../../wiki/decisions/0015-one-database-driver-d1-everywhere.md)).
 * `better-sqlite3` is gone — it is a native Node module and cannot load on a V8
 * isolate, so it could not have survived `REQ-C.1` in any case.
 *
 * ## Why this is a function and not a `const`
 *
 * A D1 binding is not an ambient resource. It arrives on the Cloudflare
 * execution context, which exists only once a request is being handled, so a
 * module-scope `export const db = drizzle(...)` — what this file used to be —
 * has nothing to read at module-evaluation time. Every consumer therefore
 * awaits `getDb()` inside a request instead of importing a ready-made handle.
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

/**
 * Splitr's database handle, schema included.
 *
 * Note `DrizzleD1Database` is an **async-mode** Drizzle database, where the
 * `better-sqlite3` one was sync-mode: every query is now a promise. No call site
 * had to change, because the only consumer is Better Auth's Drizzle adapter,
 * which is async throughout.
 */
export type Db = DrizzleD1Database<typeof schema>;

/**
 * One Drizzle instance per binding, not per request.
 *
 * Workers hands the same `env` object to every request an isolate serves, so
 * keying on the binding gives us a handle that is built once per isolate and
 * reused, while still being impossible to build before a binding exists. A
 * `WeakMap` rather than a module `let` so that nothing is pinned alive if the
 * runtime ever hands us a different binding — during a `wrangler dev` reload,
 * for instance.
 *
 * The key type is read off our own generated bindings rather than written as
 * `D1Database`, which is not a global here: `worker-configuration.d.ts` is
 * generated with `--include-runtime=false`, because the workerd runtime types
 * redefine `Element` and collide with the DOM lib that this app's client
 * components need (ADR-0015). Deriving it also means that if `DB` ever stops
 * being a D1 binding, this line stops compiling.
 */
const handles = new WeakMap<CloudflareEnv["DB"], Db>();

/**
 * The database, for the current request.
 *
 * Async because `getCloudflareContext({ async: true })` is the form that also
 * works under plain `next dev`, where the bindings come from the Wrangler proxy
 * that `next.config.ts` starts rather than from a real Workers runtime. The
 * synchronous form is only safe once a request is genuinely in flight, and the
 * cost of getting that wrong is an error on a code path nobody exercises until
 * production.
 */
export async function getDb(): Promise<Db> {
	const { env } = await getCloudflareContext({ async: true });
	const binding = env.DB;

	const existing = handles.get(binding);
	if (existing !== undefined) {
		return existing;
	}

	const handle = drizzle(binding, { schema });
	handles.set(binding, handle);
	return handle;
}
