/**
 * What each search vector says (ADR-0022, Raffaele's choices):
 *
 * - **one vector per line item**, reading "<item>, at <merchant>", so a query
 *   about the *thing* ("the kitchen shelf") and a query about the *place*
 *   ("that Thai place") can both match;
 * - **one vector for an expense with no items**, reading just its
 *   description, so hand-typed expenses are findable too;
 * - **never the raw printed text**: shorthand is what the English embedding
 *   model reads worst (C.4: 2/10).
 *
 * Only ids go into the metadata. The text shown to the user always comes from
 * D1. Pure, so `node --test` covers it (ADR-0012).
 */

export interface IndexableExpense {
	readonly id: string;
	readonly groupId: string;
	readonly description: string;
	readonly items: readonly { readonly id: string; readonly description: string }[];
}

export interface VectorSpec {
	/** The line item's or expense's own id: 35–36 bytes, under Vectorize's 64. */
	readonly id: string;
	readonly text: string;
	readonly metadata: { readonly groupId: string; readonly expenseId: string; readonly kind: "item" | "expense" };
}

export function vectorSpecs(expense: IndexableExpense): VectorSpec[] {
	const base = { groupId: expense.groupId, expenseId: expense.id };
	if (expense.items.length === 0) {
		return [{ id: expense.id, text: expense.description, metadata: { ...base, kind: "expense" } }];
	}
	return expense.items.map((item) => ({
		id: item.id,
		text: `${item.description}, at ${expense.description}`,
		metadata: { ...base, kind: "item" },
	}));
}

/**
 * Vectorize filters must be under 2,048 bytes, and a group id costs about 39
 * bytes in `$in`, so one search covers at most this many groups (ADR-0022).
 */
export const MAX_GROUPS_PER_SEARCH = 50;
