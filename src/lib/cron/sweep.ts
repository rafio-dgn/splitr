/**
 * The nightly sweep (REQ-E.6, ADR-0026): reminders, the category backfill and
 * the search re-index. Pure: D1 and `splitr-ai` are injected, so `node --test`
 * drives it with fakes. `workers/cron` wires the real bindings.
 *
 * **Idempotent by construction**, which is the requirement:
 * - reminders are UPSERTed on `(group, debtor, creditor)`, with date-only
 *   columns, and pairs that no longer owe are deleted;
 * - the backfill only asks about `uncategorised` items, and only writes onto
 *   rows still `uncategorised` (`categoriseAfterSave`);
 * - the re-index only picks expenses with no `expense_indexed` row, and vector
 *   upserts are keyed by id.
 *
 * So a second run the same day changes nothing the first run didn't. Every job
 * catches its own failures: one broken group or a down AI Worker never stops
 * the others (REQ-M.7).
 */
import type { MemberBalance } from "../expenses/balances.ts";
import { suggestTransfers } from "../expenses/transfers.ts";
import { categoriseAfterSave, type AfterSaveDeps } from "../categorise/after-save.ts";
import type { IndexRequest, IndexResponse } from "../ai/contract.ts";

/** Per run: a bounded cost in neurons (ADR-0026 §3). */
export const MAX_BACKFILL_ITEMS = 50;
export const MAX_REINDEX_EXPENSES = 50;

export const CRON_ACTOR = "system:cron";

export interface ReminderRow {
	readonly debtorId: string;
	readonly creditorId: string;
	readonly amountMinorUnits: number;
}

export interface SweepDeps {
	/** Every group, with its currency. */
	listGroups(): Promise<readonly { id: string; currency: string }[]>;
	balances(groupId: string): Promise<readonly MemberBalance[]>;
	/** UPSERT these pairs (keeping `owed_since`), and delete this group's other pairs, in one batch. */
	replaceReminders(groupId: string, currency: string, rows: readonly ReminderRow[], today: string): Promise<void>;
	/** Uncategorised items on live expenses, oldest first, at most `limit`. */
	uncategorisedItems(limit: number): Promise<readonly { groupId: string; expenseId: string; itemId: string; description: string }[]>;
	/** Live expenses with no `expense_indexed` row, with their items, at most `limit`. */
	unindexedExpenses(limit: number): Promise<readonly IndexRequest[]>;
	/** UPSERT the expense's `expense_indexed` row. */
	markIndexed(expenseId: string): Promise<void>;
	/** `splitr-ai` over the service binding. `null` when no secret is configured. */
	ai: {
		categorise: AfterSaveDeps["categorise"];
		index(request: IndexRequest): Promise<IndexResponse>;
	} | null;
	writeCategories: AfterSaveDeps["write"];
	audit: AfterSaveDeps["audit"];
}

export interface SweepSummary {
	readonly today: string;
	readonly groups: number;
	readonly reminderPairs: number;
	readonly groupsFailed: number;
	readonly backfill: { readonly items: number; readonly expenses: number };
	readonly reindex: { readonly tried: number; readonly indexed: number };
}

/** `YYYY-MM-DD` in UTC. Every date the sweep writes is a date, never a timestamp. */
export const utcDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export async function sweep(deps: SweepDeps, nowMs: number): Promise<SweepSummary> {
	const today = utcDate(nowMs);

	// 1. Reminders: one pass over every group.
	let reminderPairs = 0;
	let groupsFailed = 0;
	const groups = await deps.listGroups();
	for (const group of groups) {
		try {
			const rows = suggestTransfers(await deps.balances(group.id)).map((t) => ({
				debtorId: t.fromUserId,
				creditorId: t.toUserId,
				amountMinorUnits: t.amountMinorUnits,
			}));
			await deps.replaceReminders(group.id, group.currency, rows, today);
			reminderPairs += rows.length;
			// REQ-F.3: the group's reminders were replaced; the pairs say what they are now.
			deps.audit({
				actor: CRON_ACTOR,
				action: "reminder.refresh",
				target: group.id,
				outcome: "accepted",
				persisted: true,
				detail: { day: today, pairs: rows.length, owing: rows.map((r) => `${r.debtorId}>${r.creditorId}:${r.amountMinorUnits}`).join(",") },
			});
		} catch (error) {
			groupsFailed++;
			deps.audit({ actor: CRON_ACTOR, action: "reminder.refresh", target: group.id, outcome: `error:${String(error).slice(0, 100)}`, persisted: false });
		}
	}

	// 2. The category backfill (ADR-0016 §5): `uncategorised` only, never `other`.
	const items = deps.ai === null ? [] : await deps.uncategorisedItems(MAX_BACKFILL_ITEMS);
	const byExpense = new Map<string, { groupId: string; items: { id: string; description: string }[] }>();
	for (const item of items) {
		const entry = byExpense.get(item.expenseId) ?? { groupId: item.groupId, items: [] };
		entry.items.push({ id: item.itemId, description: item.description });
		byExpense.set(item.expenseId, entry);
	}
	if (deps.ai !== null) {
		const ai = deps.ai;
		for (const [expenseId, entry] of byExpense) {
			// The same rules as after a save: only real answers, only onto rows still uncategorised, never throws.
			await categoriseAfterSave({ categorise: ai.categorise, write: deps.writeCategories, audit: deps.audit }, { actorId: CRON_ACTOR, groupId: entry.groupId, expenseId, items: entry.items });
		}
	}

	// 3. The search re-index (ADR-0025 §4): expenses whose indexing never succeeded.
	let tried = 0;
	let indexed = 0;
	if (deps.ai !== null) {
		for (const expense of await deps.unindexedExpenses(MAX_REINDEX_EXPENSES)) {
			tried++;
			try {
				const res = await deps.ai.index(expense);
				if (res.status === "ok") {
					await deps.markIndexed(expense.id);
					indexed++;
					deps.audit({ actor: CRON_ACTOR, action: "expense.reindex", target: expense.id, outcome: "accepted", persisted: true, detail: { group: expense.groupId, vectors: res.vectors } });
				} else {
					deps.audit({ actor: CRON_ACTOR, action: "expense.reindex", target: expense.id, outcome: `rejected:${res.status}`, persisted: false });
				}
			} catch (error) {
				deps.audit({ actor: CRON_ACTOR, action: "expense.reindex", target: expense.id, outcome: `error:${String(error).slice(0, 100)}`, persisted: false });
			}
		}
	}

	const summary: SweepSummary = { today, groups: groups.length, reminderPairs, groupsFailed, backfill: { items: items.length, expenses: byExpense.size }, reindex: { tried, indexed } };
	deps.audit({
		actor: CRON_ACTOR,
		action: "cron.sweep",
		target: today,
		outcome: groupsFailed === 0 ? "accepted" : "partial",
		persisted: true,
		detail: { groups: summary.groups, reminderPairs, groupsFailed, backfillItems: items.length, reindexTried: tried, reindexed: indexed, ai: deps.ai === null ? "not-configured" : "configured" },
	});
	return summary;
}
