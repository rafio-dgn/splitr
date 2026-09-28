/**
 * Writing an expense's search vectors (REQ-D.4, ADR-0022), after the save.
 *
 * Since ADR-0025 step 5 the embedding and the upsert happen in `splitr-ai`,
 * which builds the vectors with the same `vectorSpecs`. This file only hands
 * the saved expense over, in `ctx.waitUntil`, after the response: **the
 * expense's save never waits on it and can never fail because of it**
 * (REQ-M.7). A failure is logged, and the expense stays unsearchable until the
 * nightly re-embed (E.8): a worse search, never a lost expense.
 */
import "server-only";

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
			} catch (error) {
				console.log(`[search] index-failed ${expense.id} ${String(error).slice(0, 160)}`);
			}
		})(),
	);
}
