/**
 * `splitr-cron`: the nightly sweep (REQ-E.6, ADR-0026). The logic is in
 * `src/lib/cron/sweep.ts` (pure, tested with fakes); this file wires D1 and
 * `splitr-ai` into it and runs it from the cron trigger.
 *
 * Manual trigger (ADR-0026 §4), with no public endpoint: `npm run cron:run`
 * starts this Worker with `wrangler dev --test-scheduled` and calls its local
 * `/__scheduled` route (add `--remote` for the real bindings).
 */
import { drizzle } from "drizzle-orm/d1";

import * as schema from "../../../src/db/schema";
import { audit } from "../../../src/lib/audit";
import { sweep, type SweepDeps } from "../../../src/lib/cron/sweep";
import { loadBalanceInputs } from "../../../src/lib/expenses/balance-inputs";
import { deriveBalances } from "../../../src/lib/expenses/balances";
import type { AiService } from "../../ai/src/index";

/** Declared by hand, as in the other Workers; `env-check.ts` proves the generated `Env` satisfies it. */
export interface CronEnv {
	readonly DB: D1Database;
	readonly AI_WORKER: Service<AiService>;
	readonly AI_SHARED_SECRET?: string;
}

function deps(env: CronEnv): SweepDeps {
	const secret = env.AI_SHARED_SECRET;
	return {
		async listGroups() {
			const rows = await env.DB.prepare(`SELECT id, currency FROM "group" ORDER BY id`).all<{ id: string; currency: string }>();
			return rows.results;
		},

		async balances(groupId) {
			const inputs = await loadBalanceInputs(drizzle(env.DB, { schema }), groupId);
			return deriveBalances(inputs.members, inputs.expenses, inputs.settlements);
		},

		async replaceReminders(groupId, currency, rows, today) {
			// UPSERT-on-conflict on the deterministic key (REQ-E.6). On conflict the
			// amount and checked_on update, and owed_since is deliberately kept.
			const upserts = rows.map((r) =>
				env.DB.prepare(
					`INSERT INTO reminder (group_id, debtor_id, creditor_id, amount_cents, currency, owed_since, checked_on)
					 VALUES (?, ?, ?, ?, ?, ?, ?)
					 ON CONFLICT (group_id, debtor_id, creditor_id)
					 DO UPDATE SET amount_cents = excluded.amount_cents, currency = excluded.currency, checked_on = excluded.checked_on`,
				).bind(groupId, r.debtorId, r.creditorId, r.amountMinorUnits, currency, today, today),
			);
			// Pairs that no longer owe: gone. With no rows, the whole group's reminders go.
			const keep = rows.map((r) => `${r.debtorId}|${r.creditorId}`);
			const prune = env.DB.prepare(
				keep.length === 0
					? `DELETE FROM reminder WHERE group_id = ?`
					: `DELETE FROM reminder WHERE group_id = ? AND (debtor_id || '|' || creditor_id) NOT IN (${keep.map(() => "?").join(", ")})`,
			).bind(groupId, ...keep);
			// One batch, one transaction: never half a group's reminders.
			await env.DB.batch([...upserts, prune]);
		},

		async uncategorisedItems(limit) {
			const rows = await env.DB.prepare(
				`SELECT e.group_id AS groupId, li.expense_id AS expenseId, li.id AS itemId, li.description
				 FROM line_item li JOIN expense e ON e.id = li.expense_id
				 WHERE li.category = 'uncategorised' AND e.voided_at IS NULL
				 ORDER BY e.created_at, li.position LIMIT ?`,
			)
				.bind(limit)
				.all<{ groupId: string; expenseId: string; itemId: string; description: string }>();
			return rows.results;
		},

		async unindexedExpenses(limit) {
			const expenses = await env.DB.prepare(
				`SELECT e.id, e.group_id AS groupId, e.description FROM expense e
				 LEFT JOIN expense_indexed x ON x.expense_id = e.id
				 WHERE x.expense_id IS NULL AND e.voided_at IS NULL
				 ORDER BY e.created_at LIMIT ?`,
			)
				.bind(limit)
				.all<{ id: string; groupId: string; description: string }>();
			if (expenses.results.length === 0) return [];
			const ids = expenses.results.map((e) => e.id);
			const items = await env.DB.prepare(
				`SELECT id, expense_id AS expenseId, description FROM line_item WHERE expense_id IN (${ids.map(() => "?").join(", ")}) ORDER BY position`,
			)
				.bind(...ids)
				.all<{ id: string; expenseId: string; description: string }>();
			return expenses.results.map((e) => ({
				...e,
				items: items.results.filter((i) => i.expenseId === e.id).map((i) => ({ id: i.id, description: i.description })),
			}));
		},

		async markIndexed(expenseId) {
			await env.DB.prepare(`INSERT INTO expense_indexed (expense_id) VALUES (?) ON CONFLICT (expense_id) DO NOTHING`).bind(expenseId).run();
		},

		ai:
			secret === undefined || secret === ""
				? null
				: {
						categorise: (request) => env.AI_WORKER.categorise(secret, request),
						index: (request) => env.AI_WORKER.index(secret, request),
					},

		async writeCategories(updates) {
			const results = await env.DB.batch(
				updates.map((u) => env.DB.prepare(`UPDATE line_item SET category = ? WHERE id = ? AND category = 'uncategorised'`).bind(u.category, u.id)),
			);
			return results.reduce((sum, r) => sum + (r.meta.changes ?? 0), 0);
		},

		audit,
	};
}

export default {
	async scheduled(controller: ScheduledController, env: CronEnv, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(
			sweep(deps(env), controller.scheduledTime).then((summary) => {
				console.log(`[cron] sweep ${JSON.stringify(summary)}`);
			}),
		);
	},
	/** No public HTTP surface: `workers_dev` is false, and anything that arrives here is refused. */
	async fetch(): Promise<Response> {
		return new Response("Not found", { status: 404 });
	},
};
