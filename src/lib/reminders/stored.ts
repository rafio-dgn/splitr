/**
 * The viewer's stored reminders that are old enough to show (ADR-0026 §2).
 * Pass the result through `liveReminders` before rendering: the rows are a
 * nightly snapshot, and only the live balances say whether a debt still stands.
 */
import "server-only";

import { and, eq, inArray, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { group, reminder, user } from "@/db/schema";

import { reminderCutoff, type StoredReminder } from "./live";

/** Reminders where the viewer is the debtor, `owed_since` ≥ 3 days ago, in the given groups (the viewer's current ones). */
export async function storedRemindersFor(viewerId: string, groupIds: readonly string[]): Promise<StoredReminder[]> {
	if (groupIds.length === 0) return [];
	const db = await getDb();
	return db
		.select({
			groupId: reminder.groupId,
			groupName: group.name,
			creditorId: reminder.creditorId,
			creditorName: user.name,
			owedSince: reminder.owedSince,
		})
		.from(reminder)
		.innerJoin(group, eq(group.id, reminder.groupId))
		.innerJoin(user, eq(user.id, reminder.creditorId))
		.where(and(eq(reminder.debtorId, viewerId), inArray(reminder.groupId, [...groupIds]), lte(reminder.owedSince, reminderCutoff(Date.now()))));
}
