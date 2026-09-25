/**
 * Categorising a saved expense's line items (REQ-E.4, ADR-0016 §5, ADR-0025 §4).
 *
 * It runs in `waitUntil`, **after** the expense is durable and the response is
 * on its way, so it can never slow or fail the save (REQ-M.7). Pure, with the
 * AI call, the D1 write and the audit line injected, so `node --test` covers
 * every outcome, including the Worker being unreachable.
 *
 * The rules:
 * - **Only real answers are written**, and only onto rows still
 *   `uncategorised`, so a label set in the meantime (by a person, or the
 *   nightly backfill) is never overwritten.
 * - **Nothing here throws.** Every failure becomes an `[AUDIT]` line, and the
 *   items stay `uncategorised` for the cron (E.8).
 */
import { UNCATEGORISED, type ModelCategory } from "../categories.ts";
import type { CategoriseRequest, CategoriseResponse } from "./contract.ts";

export interface AfterSaveDeps {
	/** The AI Worker, over its service binding. May throw if the binding is down. */
	categorise(request: CategoriseRequest): Promise<CategoriseResponse>;
	/** Writes the labels onto rows still `uncategorised`. Returns how many rows changed. */
	write(updates: readonly { id: string; category: ModelCategory }[]): Promise<number>;
	audit(entry: { actor: string; action: string; target: string; outcome: string; persisted: boolean; detail?: Record<string, string | number> }): void;
}

export interface SavedExpense {
	readonly actorId: string;
	readonly groupId: string;
	readonly expenseId: string;
	readonly items: readonly { id: string; description: string }[];
}

const ACTION = "line_item.categorise";

export async function categoriseAfterSave(deps: AfterSaveDeps, saved: SavedExpense): Promise<void> {
	if (saved.items.length === 0) return; // An itemless expense has nothing to categorise (ADR-0016 §1).

	const base = { actor: saved.actorId, action: ACTION, target: saved.expenseId };
	let response: CategoriseResponse;
	try {
		response = await deps.categorise({
			groupId: saved.groupId,
			items: saved.items.map((item) => ({ id: item.id, text: item.description })),
		});
	} catch (error) {
		deps.audit({ ...base, outcome: `error:unreachable:${String(error).slice(0, 100)}`, persisted: false });
		return;
	}

	if (response.status !== "ok") {
		deps.audit({ ...base, outcome: `rejected:${response.status}`, persisted: false, detail: { items: saved.items.length } });
		return;
	}

	const updates = response.results.flatMap((r) => (r.category === UNCATEGORISED ? [] : [{ id: r.id, category: r.category }]));
	let written = 0;
	try {
		written = updates.length === 0 ? 0 : await deps.write(updates);
	} catch (error) {
		deps.audit({ ...base, outcome: `error:write:${String(error).slice(0, 100)}`, persisted: false });
		return;
	}
	deps.audit({
		...base,
		outcome: "accepted",
		persisted: written > 0,
		detail: {
			group: saved.groupId,
			model: response.model,
			ms: response.ms,
			items: saved.items.length,
			categorised: written,
			uncategorised: saved.items.length - updates.length,
		},
	});
}
