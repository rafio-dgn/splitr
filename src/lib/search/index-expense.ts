/**
 * Writing an expense's search vectors (REQ-D.4, ADR-0022), after the save.
 *
 * Since ADR-0025 step 5 the embedding and the upsert happen in `splitr-ai`,
 * which builds the vectors with the same `vectorSpecs`. This file only hands
 * the saved expense over, in `ctx.waitUntil`, after the response: **the
 * expense's save never waits on it and can never fail because of it**
 * (REQ-M.7). A failure is logged, and the expense stays unsearchable until the
 * nightly re-embed (E.8): a worse search, never a lost expense. Success is
 * recorded in `expense_indexed` (ADR-0026 §3), which is how the cron knows.
 */
import "server-only";

import { getDb } from "@/db";
import { expenseIndexed } from "@/db/schema";
import { aiWorker } from "@/lib/ai/worker";

import type { IndexableExpense } from "./vector-text";

export async function indexExpense(expense: IndexableExpense): Promise<void> {
	const ai = await aiWorker();
	if (ai === null) {
		console.log(`[search] index-skipped ${expense.id} no AI secret`);
		return;
	}
	ai.ctx.waitUntil(
		(async () => {
			try {
				const res = await ai.worker.index(ai.secret, {
					id: expense.id,
					groupId: expense.groupId,
					description: expense.description,
					items: expense.items.map((i) => ({ id: i.id, description: i.description })),
				});
				console.log(`[search] index ${expense.id} status=${res.status}${res.status === "ok" ? ` vectors=${res.vectors} mutation=${res.mutationId}` : ""}`);
				if (res.status === "ok") {
					// ADR-0026 §3: recorded only on success, so the nightly cron re-indexes anything else.
					// UPSERT-style: a rerun (or the cron) finds the row and does nothing.
					const db = await getDb();
					await db.insert(expenseIndexed).values({ expenseId: expense.id }).onConflictDoNothing();
				}
			} catch (error) {
				console.log(`[search] index-failed ${expense.id} ${String(error).slice(0, 160)}`);
			}
		})(),
	);
}
