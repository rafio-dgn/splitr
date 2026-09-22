/**
 * Balances, derived — never stored.
 *
 * `wiki/context/screens-cluster-b.md` §5.5 is explicit about why this matters:
 * the balance is **derived**, so a failure to derive it is a display failure and
 * the error boundary must never suggest the expense records are gone.
 *
 * Pure arithmetic over integer minor units. No `server-only` import, because
 * there is nothing server-side about it and a pure function is testable.
 */
import type { RecordedExpense } from "./expense-feed";

/** One member's net position. Positive = the group owes them. */
export interface MemberBalance {
	readonly userId: string;
	readonly name: string;
	/** Positive: owed to this member. Negative: this member owes. Always integer. */
	readonly netMinorUnits: number;
}

/**
 * Nets every expense across the members.
 *
 * Each expense credits the payer the full amount and debits each participant
 * their share. Shares are produced by `equalShares` in the shared schema, which
 * distributes the remainder penny by penny, so the column sums to exactly zero
 * and no penny evaporates (§3).
 */
export function deriveBalances(
	members: readonly { id: string; name: string }[],
	expenses: readonly RecordedExpense[],
): readonly MemberBalance[] {
	const net = new Map<string, number>(members.map((m) => [m.id, 0]));

	const add = (userId: string, delta: number): void => {
		const current = net.get(userId);
		// A member who has since left still appears in an old expense. Ignoring
		// them here would silently unbalance the group, so they are counted.
		net.set(userId, (current ?? 0) + delta);
	};

	for (const expense of expenses) {
		add(expense.paidById, expense.amountMinorUnits);
		for (const share of expense.shares) {
			add(share.userId, -share.shareMinorUnits);
		}
	}

	return members.map((member) => ({
		userId: member.id,
		name: member.name,
		netMinorUnits: net.get(member.id) ?? 0,
	}));
}

/** True when nobody owes anybody — the "Everyone's square" empty state of §5.5. */
export function isSettled(balances: readonly MemberBalance[]): boolean {
	return balances.every((balance) => balance.netMinorUnits === 0);
}
