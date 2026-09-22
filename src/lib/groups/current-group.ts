/**
 * Resolving "which group am I looking at, and am I in it?" **once per request**.
 *
 * `wiki/context/screens-cluster-b.md` §2 is emphatic: one membership check, in
 * `(app)/groups/[groupId]/layout.tsx`, and no page re-derives it. The App Router
 * gives a layout no way to hand data to the page below it, so every screen in
 * that subtree calls this — and `cache()` makes the repeated calls one read.
 *
 * `cache` is React's per-request memo (React 19, stable). It is **not** a data
 * cache across requests: two different viewers never share an entry, which
 * matters a great deal for a function whose answer is "is this person a member".
 */
import "server-only";

import { cache } from "react";

import { getGroupForViewer, type Group } from "./membership";

/**
 * The group as the viewer may see it, or `null` for **both** "not a member" and
 * "does not exist" — indistinguishable on purpose (§2.2, enumeration defence).
 * Callers turn `null` into `notFound()`, never into a 403.
 */
export const resolveGroup = cache(
	async (groupId: string, viewerId: string): Promise<Group | null> =>
		getGroupForViewer(groupId, viewerId),
);
