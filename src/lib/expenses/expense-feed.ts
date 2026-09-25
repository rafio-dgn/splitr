/**
 * The **read** side of expenses and settlements, from D1: what the group
 * dashboard, the expense feed, the expense detail and the settle screen render.
 *
 * Every function is wrapped in React's `cache()`, which is per request and per
 * argument, never shared across viewers. The dashboard and its feed section
 * both ask for the same group's expenses, and before this that was two D1
 * round trips per view (QA finding O-3). Now it's one.
 *
 * Voided expenses (ADR-0018 §3) are excluded here, so no caller can
 * accidentally count one.
 */
import "server-only";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { cache } from "react";

import { getDb } from "@/db";
import { expense, expenseShare, lineItem, settlement, user } from "@/db/schema";
import { parseCurrency, type Currency } from "@/lib/money";

/** One share of one expense. Minor units, integer, always summing to the total. */
export interface RecordedShare {
	readonly userId: string;
	readonly shareMinorUnits: number;
}

/** An expense as the read side sees it: names resolved, money in minor units. */
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
	/** R2 key of the receipt photo, or `null`. Only the key is stored (REQ-D.3). */
	readonly receiptKey: string | null;
}

/** "A paid B", as the read side sees it (ADR-0018 §2). */
export interface RecordedSettlement {
	readonly id: string;
	readonly fromUserId: string;
	readonly fromName: string;
	readonly toUserId: string;
	readonly toName: string;
	readonly amountMinorUnits: number;
	readonly currency: Currency;
	readonly recordedById: string;
	/** Unix seconds. */
	readonly createdAt: number;
}

/**
 * Loads the group's non-voided expenses (or just one), plus their shares, in one
 * round trip. The two queries run as a single D1 batch.
 */
async function loadExpenses(groupId: string, expenseId?: string): Promise<readonly RecordedExpense[]> {
	const db = await getDb();
	const payer = alias(user, "payer");
	const scope = and(
		eq(expense.groupId, groupId),
		isNull(expense.voidedAt),
		expenseId === undefined ? undefined : eq(expense.id, expenseId),
	);

	const [rows, shareRows] = await db.batch([
		db
			.select({
				id: expense.id,
				groupId: expense.groupId,
				description: expense.description,
				amountMinorUnits: expense.amountCents,
				currency: expense.currency,
				spentAt: expense.spentOn,
				paidById: expense.paidBy,
				paidByName: payer.name,
				receiptKey: expense.receiptKey,
			})
			.from(expense)
			.innerJoin(payer, eq(payer.id, expense.paidBy))
			.where(scope)
			.orderBy(desc(expense.spentOn), desc(expense.createdAt)),
		db
			.select({
				expenseId: expenseShare.expenseId,
				userId: expenseShare.userId,
				shareMinorUnits: expenseShare.shareCents,
			})
			.from(expenseShare)
			.where(
				inArray(
					expenseShare.expenseId,
					db.select({ id: expense.id }).from(expense).where(scope),
				),
			),
	]);

	const sharesByExpense = new Map<string, RecordedShare[]>();
	for (const share of shareRows) {
		const list = sharesByExpense.get(share.expenseId) ?? [];
		list.push({ userId: share.userId, shareMinorUnits: share.shareMinorUnits });
		sharesByExpense.set(share.expenseId, list);
	}

	return rows.map((row) => ({
		...row,
		currency: parseCurrency(row.currency),
		shares: sharesByExpense.get(row.id) ?? [],
	}));
}

/** The group's non-voided expenses, newest first. */
export const listGroupExpenses = cache(
	async (groupId: string): Promise<readonly RecordedExpense[]> => loadExpenses(groupId),
);

/**
 * One expense, or `null` if it isn't in this group, doesn't exist, or was
 * voided. For someone else's expense this is the same 404 as for nothing at all.
 */
export const getExpenseInGroup = cache(
	async (groupId: string, expenseId: string): Promise<RecordedExpense | null> =>
		(await loadExpenses(groupId, expenseId))[0] ?? null,
);

/** The group's settlements, newest first. */
export const listGroupSettlements = cache(
	async (groupId: string): Promise<readonly RecordedSettlement[]> => {
		const db = await getDb();
		const from = alias(user, "from_user");
		const to = alias(user, "to_user");
		const rows = await db
			.select({
				id: settlement.id,
				fromUserId: settlement.fromUser,
				fromName: from.name,
				toUserId: settlement.toUser,
				toName: to.name,
				amountMinorUnits: settlement.amountCents,
				currency: settlement.currency,
				recordedById: settlement.recordedBy,
				createdAt: settlement.createdAt,
			})
			.from(settlement)
			.innerJoin(from, eq(from.id, settlement.fromUser))
			.innerJoin(to, eq(to.id, settlement.toUser))
			.where(eq(settlement.groupId, groupId))
			.orderBy(desc(settlement.createdAt));
		return rows.map((row) => ({ ...row, currency: parseCurrency(row.currency) }));
	},
);

/** A receipt line, as the expense page shows it (ADR-0021). */
export interface RecordedLineItem {
	readonly id: string;
	/** Plain English. */
	readonly description: string;
	/** As printed, or `null` for an item typed by hand. */
	readonly rawText: string | null;
	readonly amountMinorUnits: number;
	/** A key from `src/lib/categories.ts`; `uncategorised` until E.7. */
	readonly category: string;
}

/**
 * An expense's line items, in receipt order. The caller must already have
 * resolved the expense *in this group* (`getExpenseInGroup`), which is where
 * the 404-not-403 rule is applied.
 */
export const listLineItems = cache(
	async (expenseId: string): Promise<readonly RecordedLineItem[]> => {
		const db = await getDb();
		return db
			.select({
				id: lineItem.id,
				description: lineItem.description,
				rawText: lineItem.rawText,
				amountMinorUnits: lineItem.amountCents,
				category: lineItem.category,
			})
			.from(lineItem)
			.where(eq(lineItem.expenseId, expenseId))
			.orderBy(asc(lineItem.position));
	},
);
