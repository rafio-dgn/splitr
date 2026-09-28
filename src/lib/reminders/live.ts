/**
 * Which stored reminders are still true right now (ADR-0026 §2).
 *
 * The cron's `reminder` rows are a nightly snapshot. A debt settled at noon
 * still has its row until the next run, and a banner must never nag about a
 * debt that's already paid. So a reminder is shown only if the same pair still
 * owes **in the live balances**, and with the **live** amount. Only "owed
 * since" comes from the cron. Pure, so `node --test` covers it.
 */
import type { Transfer } from "../expenses/transfers.ts";

/** A stored reminder old enough to show. */
export interface StoredReminder {
	readonly groupId: string;
	readonly groupName: string;
	readonly creditorId: string;
	readonly creditorName: string;
	readonly owedSince: string;
}

export interface LiveReminder extends StoredReminder {
	readonly amountMinorUnits: number;
}

/** A debt is worth a reminder once it's this old (ADR-0026 §2). */
export const REMINDER_AFTER_DAYS = 3;

/** The latest `owed_since` that's old enough, for a given UTC day. */
export function reminderCutoff(todayMs: number): string {
	return new Date(todayMs - REMINDER_AFTER_DAYS * 86_400_000).toISOString().slice(0, 10);
}

/** Keeps the reminders whose pair still owes now, with the live amount. `live` maps a groupId to its live transfers. */
export function liveReminders(viewerId: string, stored: readonly StoredReminder[], live: ReadonlyMap<string, readonly Transfer[]>): LiveReminder[] {
	return stored.flatMap((r) => {
		const now = live.get(r.groupId)?.find((t) => t.fromUserId === viewerId && t.toUserId === r.creditorId);
		return now === undefined ? [] : [{ ...r, amountMinorUnits: now.amountMinorUnits }];
	});
}
