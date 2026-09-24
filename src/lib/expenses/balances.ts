/**
 * Balances, derived and never stored (ADR-0018, Consequences).
 *
 * `wiki/context/screens-cluster-b.md` §5.5 explains why this matters: the
 * balance is **derived**, so a failure to derive it is a display failure, and
 * the error boundary must never suggest the expense records are gone. It's
 * never cached in KV: a stale balance is a wrong one (ADR-0019).
 *
 * Pure arithmetic over integer minor units. No `server-only`, no path
 * aliases, and only structural input types, so `node --test` can import it
 * directly (ADR-0012).
 */

/** One member's net position. */
export interface MemberBalance {
	readonly userId: string;
	readonly name: string;
	/** Positive: the group owes this member. Negative: this member owes. Always an integer. */
	readonly netMinorUnits: number;
}

/** The parts of an expense the balance depends on. `RecordedExpense` fits it. */
export interface ExpenseForBalance {
	readonly paidById: string;
	readonly amountMinorUnits: number;
	readonly shares: readonly { readonly userId: string; readonly shareMinorUnits: number }[];
}

/** The parts of a settlement the balance depends on. `RecordedSettlement` fits it. */
export interface SettlementForBalance {
	readonly fromUserId: string;
	readonly toUserId: string;
	readonly amountMinorUnits: number;
}

/**
 * The ADR-0018 formula, for every member:
 *
 *     net = Σ expenses they paid − Σ their shares
 *         + Σ settlements they paid − Σ settlements they received
 *
 * The caller passes only non-voided expenses (`listGroupExpenses` excludes
 * voided ones). Because every expense's shares sum to its amount
 * (`equalShares`) and every settlement moves one amount from one member to
 * another, **the nets always sum to exactly zero**. That's the invariant that
 * makes a balance believable, and the one the tests pin down.
 *
 * A settlement moves the payer *towards* zero: Alice at −£40 pays Bob, who is
 * at +£40, and both land on £0.
 */
export function deriveBalances(
	members: readonly { id: string; name: string }[],
	expenses: readonly ExpenseForBalance[],
	settlements: readonly SettlementForBalance[] = [],
): readonly MemberBalance[] {
	const net = new Map<string, number>(members.map((m) => [m.id, 0]));
	const add = (userId: string, delta: number): void => {
		net.set(userId, (net.get(userId) ?? 0) + delta);
	};

	for (const expense of expenses) {
		add(expense.paidById, expense.amountMinorUnits);
		for (const share of expense.shares) {
			add(share.userId, -share.shareMinorUnits);
		}
	}
	for (const payment of settlements) {
		add(payment.fromUserId, payment.amountMinorUnits);
		add(payment.toUserId, -payment.amountMinorUnits);
	}

	return members.map((member) => ({
		userId: member.id,
		name: member.name,
		netMinorUnits: net.get(member.id) ?? 0,
	}));
}

export function isSettled(balances: readonly MemberBalance[]): boolean {
	return balances.every((balance) => balance.netMinorUnits === 0);
}
