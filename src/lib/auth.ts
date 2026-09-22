/**
 * Better Auth — the whole of Splitr's authentication.
 *
 * `REQ-B.5` is explicit: auth comes from a library, treated as a **black box**.
 * Everything below is configuration. There is no password hashing, no session
 * token, no cookie signing and no CSRF handling written by us anywhere in this
 * repository, and there must not be — that is the cluster's stated anti-goal.
 *
 * The only two things the application uses are:
 *   - `getSession()` (see `src/lib/session.ts`), and
 *   - route gating built on top of it.
 *
 * Library choice and the persistence decision: ADR-0009.
 */
import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		// Stays "sqlite" when this becomes D1 — D1 *is* SQLite. ADR-0009.
		provider: "sqlite",
		schema,
		// D1 has no interactive transactions. Leaving this off (the default)
		// means Cluster D inherits nothing to undo.
		transaction: false,
	}),
	emailAndPassword: {
		enabled: true,
		// Library-enforced. We do not implement any part of this.
		minPasswordLength: 12,
	},
	// `nextCookies()` must be the last plugin: it flushes Set-Cookie headers
	// produced inside Server Actions, which Next.js otherwise drops.
	plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
