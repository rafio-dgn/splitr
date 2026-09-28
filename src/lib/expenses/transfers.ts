/**
 * Who pays whom to settle a group, from the members' net balances (ADR-0026 §2).
 *
 * A **deterministic greedy pairing**: the largest debtor pays the largest
 * creditor as much as either can, and repeat. Ties break by user id, so the
 * same balances always give the same pairs, which is what lets the nightly
 * cron UPSERT reminders idempotently. Its first transfer is exactly what the
 * settle page already suggests (the biggest debtor pays the biggest creditor).
 *
 * **Display only.** It never moves money: the ledger does, one confirmed
 * settlement at a time (ADR-0023). Integer minor units throughout. Pure, so
 * `node --test` covers it (ADR-0012).
 */
import type { MemberBalance } from "./balances.ts";

export interface Transfer {
	readonly fromUserId: string;
	readonly toUserId: string;
	readonly amountMinorUnits: number;
}

const byAmountThenId = (a: { left: number; id: string }, b: { left: number; id: string }): number =>
	b.left - a.left || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function suggestTransfers(balances: readonly MemberBalance[]): Transfer[] {
	const debtors = balances.filter((b) => b.netMinorUnits < 0).map((b) => ({ id: b.userId, left: -b.netMinorUnits }));
	const creditors = balances.filter((b) => b.netMinorUnits > 0).map((b) => ({ id: b.userId, left: b.netMinorUnits }));
	const transfers: Transfer[] = [];
	for (;;) {
		debtors.sort(byAmountThenId);
		creditors.sort(byAmountThenId);
		const debtor = debtors[0];
		const creditor = creditors[0];
		if (debtor === undefined || creditor === undefined || debtor.left === 0 || creditor.left === 0) break;
		const amount = Math.min(debtor.left, creditor.left);
		transfers.push({ fromUserId: debtor.id, toUserId: creditor.id, amountMinorUnits: amount });
		debtor.left -= amount;
		creditor.left -= amount;
	}
	return transfers;
}
