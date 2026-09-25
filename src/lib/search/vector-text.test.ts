import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_GROUPS_PER_SEARCH, vectorSpecs } from "./vector-text.ts";

describe("vectorSpecs (ADR-0022)", () => {
	it("gives each line item a vector reading '<item>, at <merchant>', with ids only in metadata", () => {
		const specs = vectorSpecs({
			id: "exp_1",
			groupId: "grp_1",
			description: "Lemon Tree Restaurant",
			items: [
				{ id: "li_1", description: "Pad thai" },
				{ id: "li_2", description: "Ice lemon tea" },
			],
		});
		assert.deepEqual(specs, [
			{ id: "li_1", text: "Pad thai, at Lemon Tree Restaurant", metadata: { groupId: "grp_1", expenseId: "exp_1", kind: "item" } },
			{ id: "li_2", text: "Ice lemon tea, at Lemon Tree Restaurant", metadata: { groupId: "grp_1", expenseId: "exp_1", kind: "item" } },
		]);
	});

	it("gives an itemless (hand-typed) expense one vector of its own description", () => {
		assert.deepEqual(vectorSpecs({ id: "exp_2", groupId: "grp_1", description: "Taxi to the airport", items: [] }), [
			{ id: "exp_2", text: "Taxi to the airport", metadata: { groupId: "grp_1", expenseId: "exp_2", kind: "expense" } },
		]);
	});

	it("keeps a full $in filter of real group ids under Vectorize's 2,048-byte limit", () => {
		const ids = Array.from({ length: MAX_GROUPS_PER_SEARCH }, () => `grp_${"f".repeat(32)}`);
		const bytes = new TextEncoder().encode(JSON.stringify({ groupId: { $in: ids } })).length;
		assert.ok(bytes < 2048, `${bytes} bytes`);
	});
});
