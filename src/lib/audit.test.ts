// REQ-F.3: the audit line is parseable JSON with exactly the five named fields.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatAudit } from "./audit.ts";

const parse = (line: string): Record<string, unknown> => {
	assert.ok(line.startsWith("[AUDIT] "), "prefix, so `grep AUDIT` finds it");
	return JSON.parse(line.slice("[AUDIT] ".length));
};

describe("formatAudit (REQ-F.3)", () => {
	it("is one line of JSON carrying actor, action, target, timestamp and outcome, by those exact names", () => {
		const line = formatAudit({ actor: "u_1", action: "expense.add", target: "exp_1", outcome: "accepted", persisted: true }, new Date("2026-09-28T10:00:00.000Z"));
		assert.ok(!line.includes("\n"));
		const parsed = parse(line);
		assert.deepEqual(Object.keys(parsed).slice(0, 5), ["actor", "action", "target", "timestamp", "outcome"]);
		assert.equal(parsed.timestamp, "2026-09-28T10:00:00.000Z");
		assert.equal(parsed.ts, undefined);
	});
	it("keeps detail, and stays parseable whatever the text contains (quotes, newlines, emoji)", () => {
		const parsed = parse(formatAudit({ actor: "u", action: "a", target: "t", outcome: 'error:"quoted"\nline two 🍕', persisted: false, detail: { amountMinorUnits: 4000 } }));
		assert.equal(parsed.outcome, 'error:"quoted"\nline two 🍕');
		assert.deepEqual(parsed.detail, { amountMinorUnits: 4000 });
	});
	it("omits detail when there is none", () => {
		assert.equal("detail" in parse(formatAudit({ actor: "u", action: "a", target: "t", outcome: "o", persisted: false })), false);
	});
});
