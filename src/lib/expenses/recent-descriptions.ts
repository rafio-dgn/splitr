/**
 * `REQ-D.2`'s one piece of hot state in KV: each group's recent expense
 * descriptions, offered as autofill on the add-expense form (ADR-0019).
 *
 * Chosen because **staleness is harmless by construction**. KV is eventually
 * consistent: a delete can take up to about a minute to be seen elsewhere. The
 * worst a stale list can do is miss a suggestion, never show a wrong number.
 * Money is never cached here, and nothing here is ever an input to a decision.
 *
 * Every KV call is best-effort. A KV failure falls through to D1, and the
 * writes to KV run in `ctx.waitUntil`, after the response, so KV can make
 * the form faster but never slower or broken (the same stance as `REQ-M.7`).
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq, isNull, max } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { expense } from "@/db/schema";

const LIMIT = 10;

/** A week. An abandoned group's key disappears on its own, and a miss just rebuilds it. */
const TTL_SECONDS = 7 * 24 * 60 * 60;

/** `v1` lets the value's shape change later without an old value being read as new. */
const keyFor = (groupId: string): string => `recent-descriptions:v1:${groupId}`;

/** What's stored. Anything that doesn't match is treated as a miss, not trusted. */
const storedValue = z.array(z.string().max(80)).max(LIMIT);

/** The source of truth: distinct descriptions of non-voided expenses, most recently used first. */
async function fromD1(groupId: string): Promise<string[]> {
	const db = await getDb();
	const lastUsed = max(expense.createdAt);
	const rows = await db
		.select({ description: expense.description, lastUsed })
		.from(expense)
		.where(and(eq(expense.groupId, groupId), isNull(expense.voidedAt)))
		.groupBy(expense.description)
		.orderBy(desc(lastUsed))
		.limit(LIMIT);
	return rows.map((row) => row.description);
}

/**
 * The group's recent descriptions: from KV when warm, rebuilt from D1 when not.
 *
 * `source` is returned (and logged) so the hit/miss behaviour is observable in
 * `wrangler tail`, which is how "genuinely rebuildable if lost" is shown rather
 * than claimed.
 */
export async function getRecentDescriptions(
	groupId: string,
): Promise<{ descriptions: readonly string[]; source: "kv" | "d1" }> {
	const { env, ctx } = await getCloudflareContext({ async: true });
	const key = keyFor(groupId);

	try {
		const cached = storedValue.safeParse(await env.KV.get(key, "json"));
		if (cached.success) {
			console.log(`[cache] recent-descriptions hit ${groupId}`);
			return { descriptions: cached.data, source: "kv" };
		}
	} catch (error) {
		// Unreachable KV is a slower page, not a broken one.
		console.log(`[cache] recent-descriptions kv-error ${groupId} ${String(error).slice(0, 80)}`);
	}

	const descriptions = await fromD1(groupId);
	console.log(`[cache] recent-descriptions miss ${groupId} rebuilt=${descriptions.length}`);
	// After the response. Without `waitUntil`, the runtime could end this work
	// the moment the page is sent, and the cache would never be warm (REQ-C.5 Q3).
	ctx.waitUntil(
		env.KV.put(key, JSON.stringify(descriptions), { expirationTtl: TTL_SECONDS }).catch((error: unknown) => {
			console.log(`[cache] recent-descriptions put-failed ${groupId} ${String(error).slice(0, 80)}`);
		}),
	);
	return { descriptions, source: "d1" };
}

/**
 * Called after a new expense is saved. It **deletes** the key rather than
 * prepending to it: a delete can only make the list cold, never wrong, and the
 * next read rebuilds it from D1. It runs after the response, so the expense's
 * save never waits on KV.
 */
export async function forgetRecentDescriptions(groupId: string): Promise<void> {
	const { env, ctx } = await getCloudflareContext({ async: true });
	ctx.waitUntil(
		env.KV.delete(keyFor(groupId)).catch((error: unknown) => {
			console.log(`[cache] recent-descriptions delete-failed ${groupId} ${String(error).slice(0, 80)}`);
		}),
	);
}
