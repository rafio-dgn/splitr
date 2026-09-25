/**
 * `/search` (REQ-D.4, ADR-0022): past expenses across **all the viewer's
 * current groups**, by meaning or, for comparison, by keyword.
 *
 * Vectorize is a *candidate list*, never the authority. Every hit is re-checked
 * against D1: it must still exist, not be voided, and belong to a group the
 * viewer is in *now*. What's shown always comes from D1, since the index holds
 * only ids.
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq, inArray, isNull, or, sql, type AnyColumn, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { expense, group, lineItem } from "@/db/schema";
import { getGroupsForViewer } from "@/lib/groups/membership";

import { embed } from "./index-expense";
import { MAX_GROUPS_PER_SEARCH } from "./vector-text";

export interface SearchHit {
	readonly expenseId: string;
	readonly groupId: string;
	readonly groupName: string;
	readonly description: string;
	readonly amountMinorUnits: number;
	readonly spentAt: string;
	/** The line item that matched, if the match was an item. */
	readonly matchedItem: string | null;
	/** Cosine similarity (meaning mode only). */
	readonly score: number | null;
}

export interface SearchResult {
	readonly hits: readonly SearchHit[];
	/** More than MAX_GROUPS_PER_SEARCH groups: only the first were searched. */
	readonly truncated: boolean;
}

async function viewerGroups(viewerId: string): Promise<{ ids: string[]; truncated: boolean }> {
	const groups = await getGroupsForViewer(viewerId);
	return {
		ids: groups.slice(0, MAX_GROUPS_PER_SEARCH).map((g) => g.id),
		truncated: groups.length > MAX_GROUPS_PER_SEARCH,
	};
}

/** Loads expenses by id from D1, **only** from the given groups and never voided. */
async function loadExpenses(expenseIds: readonly string[], groupIds: readonly string[]) {
	if (expenseIds.length === 0 || groupIds.length === 0) return new Map<string, Omit<SearchHit, "matchedItem" | "score">>();
	const db = await getDb();
	const rows = await db
		.select({
			expenseId: expense.id,
			groupId: expense.groupId,
			groupName: group.name,
			description: expense.description,
			amountMinorUnits: expense.amountCents,
			spentAt: expense.spentOn,
		})
		.from(expense)
		.innerJoin(group, eq(group.id, expense.groupId))
		.where(and(inArray(expense.id, [...expenseIds]), inArray(expense.groupId, [...groupIds]), isNull(expense.voidedAt)));
	return new Map(rows.map((row) => [row.expenseId, row]));
}

export async function searchByMeaning(viewerId: string, query: string): Promise<SearchResult> {
	const { ids, truncated } = await viewerGroups(viewerId);
	if (ids.length === 0) return { hits: [], truncated };

	const { env } = await getCloudflareContext({ async: true });
	const [vector] = await embed([query]);
	const { matches } = await env.VECTORIZE.query(vector ?? [], {
		topK: 20,
		filter: { groupId: { $in: ids } },
		returnMetadata: "all",
	});

	// Best match per expense, in score order.
	const best = new Map<string, { score: number; itemId: string | null }>();
	for (const match of matches) {
		const expenseId = typeof match.metadata?.expenseId === "string" ? match.metadata.expenseId : null;
		if (expenseId === null || best.has(expenseId)) continue;
		best.set(expenseId, { score: match.score, itemId: match.metadata?.kind === "item" ? match.id : null });
	}

	const expenses = await loadExpenses([...best.keys()], ids);
	const itemIds = [...best.values()].flatMap((b) => (b.itemId === null ? [] : [b.itemId]));
	const db = await getDb();
	const items =
		itemIds.length === 0
			? new Map<string, string>()
			: new Map(
					(await db.select({ id: lineItem.id, description: lineItem.description }).from(lineItem).where(inArray(lineItem.id, itemIds))).map(
						(row) => [row.id, row.description],
					),
				);

	const hits: SearchHit[] = [];
	for (const [expenseId, match] of best) {
		const row = expenses.get(expenseId);
		// Stale in the index (voided, gone, or a group the viewer left): dropped.
		if (row === undefined) continue;
		hits.push({ ...row, matchedItem: match.itemId === null ? null : (items.get(match.itemId) ?? null), score: match.score });
	}
	return { hits, truncated };
}

/**
 * `column LIKE '%query%' ESCAPE '\'`, with the query's own `%`, `_` and `\`
 * escaped, so a query of "50%" means the text "50%". SQLite honours the
 * backslash **only** with an explicit ESCAPE clause, which Drizzle's `like()`
 * doesn't add, hence the raw fragment.
 */
function contains(column: AnyColumn, query: string): SQL {
	const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
	return sql`${column} LIKE ${pattern} ESCAPE '\\'`;
}

/** Plain substring search over the same data, for REQ-D.4's "not keyword match" comparison. */
export async function searchByKeyword(viewerId: string, query: string): Promise<SearchResult> {
	const { ids, truncated } = await viewerGroups(viewerId);
	if (ids.length === 0) return { hits: [], truncated };
	const db = await getDb();
	const rows = await db
		.selectDistinct({ expenseId: expense.id, matchedItem: lineItem.description })
		.from(expense)
		.leftJoin(lineItem, eq(lineItem.expenseId, expense.id))
		.where(
			and(
				inArray(expense.groupId, ids),
				isNull(expense.voidedAt),
				or(contains(expense.description, query), contains(lineItem.description, query), contains(lineItem.rawText, query)),
			),
		)
		.orderBy(desc(expense.spentOn))
		.limit(40);
	const firstItem = new Map<string, string | null>();
	for (const row of rows) if (!firstItem.has(row.expenseId)) firstItem.set(row.expenseId, row.matchedItem);
	const expenses = await loadExpenses([...firstItem.keys()], ids);
	return {
		hits: [...firstItem.entries()].flatMap(([id, item]) => {
			const row = expenses.get(id);
			return row === undefined ? [] : [{ ...row, matchedItem: item, score: null }];
		}),
		truncated,
	};
}
