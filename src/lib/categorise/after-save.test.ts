// Categorising after the save (REQ-M.7): every outcome is logged, nothing throws.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ModelCategory } from "../categories.ts";
import { categoriseAfterSave, type AfterSaveDeps } from "./after-save.ts";
import type { CategoriseResponse, ItemResult } from "./contract.ts";

const saved = {
	actorId: "u_1",
	groupId: "grp_a",
	expenseId: "exp_1",
	items: [
		{ id: "li_1", description: "Peroni 4 pack" },
		{ id: "li_2", description: "Crisps" },
	],
};

const result = (id: string, category: ItemResult["category"]): ItemResult => ({ id, category, raw: category, groupExamples: 3, seedExamples: 0, neurons: 5 });

function fakes(respond: () => Promise<CategoriseResponse>, writeThrows = false) {
	const log = { writes: [] as { id: string; category: ModelCategory }[][], audits: [] as { outcome: string; persisted: boolean; detail?: Record<string, string | number> }[] };
	const deps: AfterSaveDeps = {
		categorise: respond,
		async write(updates) {
			if (writeThrows) throw new Error("D1_ERROR: busy");
			log.writes.push([...updates]);
			return updates.length;
		},
		audit(entry) {
			log.audits.push(entry);
		},
	};
	return { deps, log };
}

describe("categoriseAfterSave", () => {
	it("writes only the real answers, and says how many stayed uncategorised", async () => {
		const { deps, log } = fakes(async () => ({ status: "ok", model: "8b", ms: 900, results: [result("li_1", "drinks"), result("li_2", "uncategorised")] }));
		await categoriseAfterSave(deps, saved);
		assert.deepEqual(log.writes, [[{ id: "li_1", category: "drinks" }]]);
		assert.equal(log.audits[0]?.outcome, "accepted");
		assert.equal(log.audits[0]?.detail?.categorised, 1);
		assert.equal(log.audits[0]?.detail?.uncategorised, 1);
	});

	for (const status of ["refused", "timeout", "failed", "invalid"] as const) {
		it(`a ${status} answer writes nothing and is audited`, async () => {
			const response: CategoriseResponse =
				status === "refused" ? { status } : status === "invalid" ? { status, issues: ["x"] } : status === "timeout" ? { status, ms: 8000, results: [] } : { status, error: "x", results: [] };
			const { deps, log } = fakes(async () => response);
			await categoriseAfterSave(deps, saved);
			assert.equal(log.writes.length, 0);
			assert.equal(log.audits[0]?.outcome, `rejected:${status}`);
			assert.equal(log.audits[0]?.persisted, false);
		});
	}

	it("an unreachable AI Worker doesn't throw: it's an audit line, and the items wait for the cron", async () => {
		const { deps, log } = fakes(async () => {
			throw new Error("Worker splitr-ai not found");
		});
		await assert.doesNotReject(categoriseAfterSave(deps, saved));
		assert.match(log.audits[0]?.outcome ?? "", /^error:unreachable:/);
	});

	it("a failed D1 write doesn't throw either", async () => {
		const { deps, log } = fakes(async () => ({ status: "ok", model: "8b", ms: 900, results: [result("li_1", "drinks")] }), true);
		await assert.doesNotReject(categoriseAfterSave(deps, saved));
		assert.match(log.audits[0]?.outcome ?? "", /^error:write:/);
	});

	it("an expense with no line items calls nothing and logs nothing", async () => {
		let called = false;
		const { deps, log } = fakes(async () => {
			called = true;
			return { status: "refused" };
		});
		await categoriseAfterSave(deps, { ...saved, items: [] });
		assert.equal(called, false);
		assert.equal(log.audits.length, 0);
	});
});
