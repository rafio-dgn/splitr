/**
 * The **read** side of expenses — what the group dashboard, the expense feed and
 * the expense detail screen render (`wiki/context/screens-cluster-b.md` §4.6,
 * §5.6, §5.9).
 *
 * **There is nothing to read yet, and that is not a placeholder — it is the
 * truth of Cluster B.** `addExpense()` returns `persisted: false` because
 * `REQ-D.1` owns the `expense` table and `REQ-M.2` forbids jumping a cluster to
 * get it. So every function here returns the honest empty answer, and the
 * screens render their **empty** states (`REQ-B.4`) rather than fixture data
 * pretending to be a ledger.
 *
 * Cluster D replaces these bodies with Drizzle queries and changes no signature
 * and no call site — the same contract `src/lib/groups/membership.ts` sets.
 */
import "server-only";

import type { Currency } from "@/lib/money";

/** One share of one expense. Minor units, integer, always summing to the total. */
export interface RecordedShare {
	readonly userId: string;
	readonly shareMinorUnits: number;
}

/** An expense as the read side sees it — names resolved, money in minor units. */
export interface RecordedExpense {
	readonly id: string;
	readonly groupId: string;
	readonly description: string;
	readonly amountMinorUnits: number;
	readonly currency: Currency;
	/** `YYYY-MM-DD`. */
	readonly spentAt: string;
	readonly paidById: string;
	readonly paidByName: string;
	readonly shares: readonly RecordedShare[];
}

/**
 * The group's expense feed, newest first.
 *
 * Empty for the whole of Cluster B. The `await` is real in Cluster D and is kept
 * here so the call sites are already async.
 */
export async function listGroupExpenses(
	groupId: string,
): Promise<readonly RecordedExpense[]> {
	await Promise.resolve();
	void groupId;
	return [];
}

/**
 * One expense, or `null` if it is not in this group or does not exist.
 *
 * Always `null` in Cluster B, so `/groups/[groupId]/expenses/[expenseId]`
 * renders `not-found` — which is the correct answer for an id that names
 * nothing, and the same answer Cluster D will give for someone else's expense.
 */
export async function getExpenseInGroup(
	groupId: string,
	expenseId: string,
): Promise<RecordedExpense | null> {
	await Promise.resolve();
	void groupId;
	void expenseId;
	return null;
}
