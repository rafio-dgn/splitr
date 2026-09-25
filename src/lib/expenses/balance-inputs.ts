/**
 * Everything a group's balance depends on, loaded from D1 in one batch:
 * current members, non-voided expenses with their shares, and settlements.
 *
 * Shared by the app and the `splitr-ledger` Durable Object (ADR-0023), so the
 * DO judges a settlement against **exactly** the data the dashboard shows.
 * That's why it takes the database as a parameter and has no `server-only`, no
 * React `cache()`, and no path aliases: the DO Worker imports it as it is.
 */
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "../../db/schema";

import type { ExpenseForBalance, SettlementForBalance } from "./balances";

const { expense, expenseShare, groupMember, settlement, user } = schema;

export interface BalanceInputs {
	readonly members: readonly { id: string; name: string }[];
	readonly expenses: readonly ExpenseForBalance[];
	readonly settlements: readonly (SettlementForBalance & {
		readonly recordedById: string;
		readonly recordedByName: string;
		readonly toName: string;
		readonly createdAt: number;
	})[];
}

export async function loadBalanceInputs(
	db: DrizzleD1Database<typeof schema>,
	groupId: string,
): Promise<BalanceInputs> {
	const liveExpenses = and(eq(expense.groupId, groupId), isNull(expense.voidedAt));

	const [members, expenseRows, shareRows, settlementRows] = await db.batch([
		db
			.select({ id: user.id, name: user.name })
			.from(groupMember)
			.innerJoin(user, eq(user.id, groupMember.userId))
			.where(and(eq(groupMember.groupId, groupId), isNull(groupMember.leftAt))),
		db.select({ id: expense.id, paidById: expense.paidBy, amountMinorUnits: expense.amountCents }).from(expense).where(liveExpenses),
		db
			.select({ expenseId: expenseShare.expenseId, userId: expenseShare.userId, shareMinorUnits: expenseShare.shareCents })
			.from(expenseShare)
			.where(inArray(expenseShare.expenseId, db.select({ id: expense.id }).from(expense).where(liveExpenses))),
		// Ids only, with names resolved below. Joining `user` twice (recorder and
		// recipient) gives two result columns both called `name`, and inside
		// `db.batch` D1 returns rows as objects keyed by column name, so the
		// second silently overwrote the first. The loser of a race was told the
		// *recipient* had recorded it (measured, 2026-09-25).
		db
			.select({
				fromUserId: settlement.fromUser,
				toUserId: settlement.toUser,
				amountMinorUnits: settlement.amountCents,
				recordedById: settlement.recordedBy,
				createdAt: settlement.createdAt,
			})
			.from(settlement)
			.where(eq(settlement.groupId, groupId))
			// Newest first. `created_at` is whole seconds, so two settlements in the
			// same second tie, and the loser was once told the *previous* round's
			// winner (measured). SQLite's `rowid` is insertion order, which breaks
			// the tie truthfully: §6.3 requires naming who actually won.
			.orderBy(desc(settlement.createdAt), desc(sql`${settlement}.rowid`)),
	]);

	// Names from the members list. A former member (ADR-0018 §6) isn't in it,
	// so "a former member" is the honest fallback.
	const names = new Map(members.map((m) => [m.id, m.name]));
	const nameOf = (id: string): string => names.get(id) ?? "A former member";

	const shares = new Map<string, { userId: string; shareMinorUnits: number }[]>();
	for (const row of shareRows) {
		const list = shares.get(row.expenseId) ?? [];
		list.push({ userId: row.userId, shareMinorUnits: row.shareMinorUnits });
		shares.set(row.expenseId, list);
	}
	return {
		members,
		expenses: expenseRows.map((row) => ({ paidById: row.paidById, amountMinorUnits: row.amountMinorUnits, shares: shares.get(row.id) ?? [] })),
		settlements: settlementRows.map((row) => ({
			...row,
			recordedByName: nameOf(row.recordedById),
			toName: nameOf(row.toUserId),
		})),
	};
}
