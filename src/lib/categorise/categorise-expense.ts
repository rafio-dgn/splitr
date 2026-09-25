/**
 * Starts categorisation of a saved expense's line items, after the response
 * (REQ-E.4, REQ-M.7, ADR-0025). The rules live in `after-save.ts`; this file
 * only supplies the real service binding, D1 and the audit line.
 *
 * `ctx.waitUntil`: the expense's save never waits on the AI Worker and can
 * never fail because of it.
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { lineItem } from "@/db/schema";
import { audit } from "@/lib/audit";
import { UNCATEGORISED } from "@/lib/categories";

import { categoriseAfterSave, type SavedExpense } from "./after-save";

export async function categoriseExpense(saved: SavedExpense): Promise<void> {
	if (saved.items.length === 0) return;
	const { env, ctx } = await getCloudflareContext({ async: true });
	// Read as possibly absent, which is the truth: a secret exists only once
	// `wrangler secret put` has run. It's also missing from the generated types
	// on a machine without `.dev.vars`, like the CI runner (found in PR #7's
	// first CI run). The `in` check narrows correctly either way, without a cast.
	const secret: unknown = "AI_SHARED_SECRET" in env ? env.AI_SHARED_SECRET : undefined;
	if (typeof secret !== "string" || secret === "") {
		// Not configured (ADR-0025 §3): skip rather than send a call that must be refused.
		audit({ actor: saved.actorId, action: "line_item.categorise", target: saved.expenseId, outcome: "skipped:no-secret", persisted: false });
		return;
	}
	ctx.waitUntil(
		categoriseAfterSave(
			{
				categorise: (request) => env.AI_WORKER.categorise(secret, request),
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
