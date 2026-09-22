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
 * Why the base URL is not a port: ADR-0013.
 */
import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Is this URL a loopback address — i.e. a developer's own machine?
 *
 * Deliberately a syntactic check on the hostname only. Better Auth has its own
 * (more thorough) classifier; this one exists solely to spot a `BETTER_AUTH_URL`
 * that should not have been set.
 */
function isLoopbackURL(value: string): boolean {
	try {
		const { hostname } = new URL(value);
		return (
			hostname === "localhost" ||
			hostname.endsWith(".localhost") ||
			hostname.startsWith("127.") ||
			hostname === "[::1]" ||
			hostname === "::1"
		);
	} catch {
		// Not a URL at all. Let Better Auth reject it loudly at startup.
		return false;
	}
}

const configuredBaseURL = process.env.BETTER_AUTH_URL?.trim();

/**
 * The deployed origin, and **only** the deployed origin.
 *
 * A *loopback* `BETTER_AUTH_URL` is ignored, because it can no longer be right:
 * it is how F-1 happened (`:3000` hard-coded, app served on `:3100`), and the
 * `baseURL` below already covers every loopback port. Ignoring it — loudly —
 * means re-introducing that line into `.env` cannot re-break authentication.
 *
 * Cluster C/D will set this via `wrangler secret put` / a Worker var, where
 * there is exactly one correct answer and a human is choosing it deliberately.
 */
const deployedBaseURL =
	configuredBaseURL !== undefined &&
	configuredBaseURL !== "" &&
	!isLoopbackURL(configuredBaseURL)
		? configuredBaseURL
		: undefined;

if (configuredBaseURL !== undefined && deployedBaseURL === undefined) {
	console.warn(
		`[splitr] Ignoring BETTER_AUTH_URL=${configuredBaseURL}: a loopback base URL pins Better Auth's trusted origin to one port and breaks every other one (QA finding F-1). Local development needs no BETTER_AUTH_URL — see src/lib/auth.ts.`,
	);
}

export const auth = betterAuth({
	/**
	 * Better Auth derives its **trusted origin** from `baseURL`, and refuses any
	 * browser request whose `Origin` header does not match it
	 * (`403 INVALID_ORIGIN`). A hard-coded `BETTER_AUTH_URL=http://localhost:3000`
	 * therefore broke every browser-originated auth call on :3100 — QA finding
	 * F-1. Verified in `node_modules/better-auth/dist/api/middlewares/origin-check.mjs`
	 * (`validateOrigin`) and `.../dist/context/helpers.mjs` (`getTrustedOrigins`).
	 *
	 * Two ports are legitimately in play and neither is going away: the OrbStack
	 * container publishes **3000** (ADR-0007) and native `next dev` uses **3100**.
	 * Pinning either one only moves the breakage, so locally nothing is pinned:
	 * the dynamic `baseURL` form (a 1.7.5 feature — `DynamicBaseURLConfig` in
	 * `node_modules/@better-auth/core/dist/types/init-options.d.mts`) resolves the
	 * base URL from the request's `Host` header, and `getTrustedOrigins` derives
	 * the trusted origins from `allowedHosts`. Any loopback port works, including
	 * ports nobody has thought of yet, and there is no value to keep in step.
	 *
	 * This is an allowlist, not "trust the Host header": the host must match a
	 * pattern below, `x-forwarded-host` is ignored (we never set
	 * `advanced.trustedProxyHeaders`), and the wildcard covers only the port —
	 * `http://sub.localhost:3100` and `https://localhost:3100` are both rejected,
	 * checked against the installed matcher.
	 */
	baseURL: deployedBaseURL ?? {
		allowedHosts: ["localhost:*", "127.0.0.1:*"],
		protocol: "http",
		// Only for a host that is neither: a LAN IP, a tunnel, a forged `Host`
		// header. Without it Better Auth throws and a gated page 500s (measured);
		// with it the page renders and the browser's untrusted origin is refused
		// by the origin check, which is the honest outcome. Serving Splitr on a
		// non-loopback host is a deployment — set `BETTER_AUTH_URL`.
		fallback: "http://localhost",
	},
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
