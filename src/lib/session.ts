/**
 * The entire surface `REQ-B.5` allows: `getSession()` and route gating.
 *
 * Everything here delegates to Better Auth. There is deliberately no token
 * parsing, no cookie reading, no expiry arithmetic and no crypto — if any of
 * that appears in this file, the black-box requirement has been broken.
 */
import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

/** What Better Auth returns: the session plus its user, or `null`. */
export type AppSession = NonNullable<
	Awaited<ReturnType<typeof auth.api.getSession>>
>;

/**
 * Reads the current session.
 *
 * `headers()` is **async** in Next.js 16 — awaiting it is not optional, and the
 * synchronous form you may remember does not exist here
 * (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md`).
 */
export async function getSession(): Promise<AppSession | null> {
	const session = await auth.api.getSession({ headers: await headers() });
	return session ?? null;
}

/**
 * Route gating for Server Components and Server Actions.
 *
 * Gating happens in a **layout**, not in edge middleware: middleware runs before
 * the request reaches the segment and cannot do a database-backed session check
 * without extra configuration, and a redirect there is a weaker guarantee than a
 * check co-located with the render. The layout gate is the project's confirmed
 * pattern (`.claude/skills/verify-api`).
 *
 * `redirect()` throws, so the `Promise<AppSession>` return type is honest: every
 * path that returns has a session.
 */
export async function requireSession(): Promise<AppSession> {
	const session = await getSession();
	if (session === null) {
		redirect("/login");
	}
	return session;
}
