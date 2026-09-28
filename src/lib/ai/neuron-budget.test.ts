// REQ-F.4's daily neuron cap (ADR-0031).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { budgetDay, capFrom, DEFAULT_DAILY_NEURON_CAP, neuronsOf, withinCap } from "./neuron-budget.ts";

describe("neuron budget", () => {
	it("allows calls below the cap and refuses at it", () => {
		assert.equal(withinCap(7_999.9, 8_000), true);
		assert.equal(withinCap(8_000, 8_000), false);
		assert.equal(withinCap(0, 0), false);
	});
	it("reads the configured cap, defaulting on anything unusable", () => {
		assert.equal(capFrom("1"), 1);
		assert.equal(capFrom(undefined), DEFAULT_DAILY_NEURON_CAP);
		assert.equal(capFrom(""), DEFAULT_DAILY_NEURON_CAP);
		assert.equal(capFrom("lots"), DEFAULT_DAILY_NEURON_CAP);
		assert.equal(capFrom("-5"), DEFAULT_DAILY_NEURON_CAP);
	});
	it("counts the neurons a call reports, and 0 when there are none (embeddings)", () => {
		assert.equal(neuronsOf({ response: "drinks", usage: { neurons: 4.2 } }), 4.2);
		assert.equal(neuronsOf({ shape: [1, 768], data: [[0.1]] }), 0);
		assert.equal(neuronsOf(null), 0);
		assert.equal(neuronsOf({ usage: { neurons: -3 } }), 0);
	});
	it("keys the counter by UTC day", () => {
		assert.equal(budgetDay(Date.parse("2026-09-28T23:59:59Z")), "2026-09-28");
		assert.equal(budgetDay(Date.parse("2026-09-29T00:00:00Z")), "2026-09-29");
	});
});
