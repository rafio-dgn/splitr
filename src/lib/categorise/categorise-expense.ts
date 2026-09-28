/**
 * Starts categorisation of a saved expense's line items, after the response
 * (REQ-E.4, REQ-M.7, ADR-0025). The rules live in `after-save.ts`; this file
 * only supplies the real service binding, D1 and the audit line.
 *
 * `ctx.waitUntil`: the expense's save never waits on the AI Worker and can
 * never fail because of it.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { lineItem } from "@/db/schema";
import { aiWorker } from "@/lib/ai/worker";
import { audit } from "@/lib/audit";
import { UNCATEGORISED } from "@/lib/categories";

import { categoriseAfterSave, type SavedExpense } from "./after-save";

export async function categoriseExpense(saved: SavedExpense): Promise<void> {
	if (saved.items.length === 0) return;
	const ai = await aiWorker();
	if (ai === null) {
		// Not configured (ADR-0025 §3): skip rather than send a call that must be refused.
		audit({ actor: saved.actorId, action: "line_item.categorise", target: saved.expenseId, outcome: "skipped:no-secret", persisted: false });
		return;
	}
	ai.ctx.waitUntil(
		categoriseAfterSave(
			{
				categorise: (request) => ai.worker.categorise(ai.secret, request),
				async write(updates) {
					const db = await getDb();
					// Only rows still uncategorised: never overwrite a label set in the meantime.
					const [first, ...rest] = updates.map((u) =>
						db
							.update(lineItem)
							.set({ category: u.category })
							.where(and(eq(lineItem.id, u.id), eq(lineItem.category, UNCATEGORISED)))
							.returning({ id: lineItem.id }),
					);
					if (first === undefined) return 0;
					// One batch, one transaction (D1).
					const results = await db.batch([first, ...rest]);
					return results.reduce((sum, rows) => sum + rows.length, 0);
				},
				audit,
			},
			saved,
		),
	);
}
