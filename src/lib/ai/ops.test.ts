// The AI Worker's embed / index / read-receipt operations, with fake bindings.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { withBudget } from "./budget.ts";
import { embedTexts, indexExpense, readReceiptImage, type OpsDeps } from "./ops.ts";

const SECRET = "k1";
const IMAGE = "data:image/png;base64,iVBORw0KGgo=";

function fakes(opts: { visionAnswer?: unknown; embedDelayMs?: number; embedThrows?: boolean } = {}) {
	const calls = { embed: [] as string[][], upsert: [] as { id: string; metadata: Record<string, string> }[][], vision: 0 };
	const deps: OpsDeps = {
		async embed(texts) {
			calls.embed.push([...texts]);
			if (opts.embedDelayMs) await new Promise((r) => setTimeout(r, opts.embedDelayMs));
			if (opts.embedThrows) throw new Error("AiError: 3040");
			return texts.map(() => [0.1, 0.2, 0.3]);
		},
		async upsert(vectors) {
			calls.upsert.push(vectors.map((v) => ({ id: v.id, metadata: v.metadata })));
			return "mut_1";
		},
		async vision() {
			calls.vision++;
			return opts.visionAnswer;
		},
	};
	return { deps, calls };
}

describe("withBudget", () => {
	it("returns the value inside the budget, and timeout past it", async () => {
		assert.deepEqual(await withBudget(Promise.resolve(7), 50), { ok: true, value: 7 });
		assert.deepEqual(await withBudget(new Promise((r) => setTimeout(() => r(7), 100)), 10), { ok: false, reason: "timeout" });
	});
});

describe("every operation checks the secret before anything else", () => {
	for (const [name, run] of [
		["embed", (d: OpsDeps) => embedTexts(d, "wrong", { texts: ["x"] }, SECRET)],
		["index", (d: OpsDeps) => indexExpense(d, "wrong", { id: "exp_1", groupId: "grp_a", description: "x", items: [] }, SECRET)],
		["readReceipt", (d: OpsDeps) => readReceiptImage(d, "wrong", { image: IMAGE }, SECRET)],
	] as const) {
		it(`${name}: a wrong secret is refused, and no binding is called`, async () => {
			const { deps, calls } = fakes();
			assert.deepEqual(await run(deps), { status: "refused" });
			assert.equal(calls.embed.length + calls.upsert.length + calls.vision, 0);
		});
	}
});

describe("indexExpense", () => {
	it("builds the same vectors as ADR-0022 (one per item, '<item>, at <merchant>') and upserts them with their metadata", async () => {
		const { deps, calls } = fakes();
		const res = await indexExpense(deps, SECRET, { id: "exp_1", groupId: "grp_a", description: "Tesco", items: [{ id: "li_1", description: "Milk" }] }, SECRET);
		assert.deepEqual(res, { status: "ok", vectors: 1, mutationId: "mut_1" });
		assert.deepEqual(calls.embed, [["Milk, at Tesco"]]);
		assert.deepEqual(calls.upsert, [[{ id: "li_1", metadata: { groupId: "grp_a", expenseId: "exp_1", kind: "item" } }]]);
	});
	it("an itemless expense gets one expense vector", async () => {
		const { deps, calls } = fakes();
		await indexExpense(deps, SECRET, { id: "exp_2", groupId: "grp_a", description: "Taxi home", items: [] }, SECRET);
		assert.deepEqual(calls.upsert[0], [{ id: "exp_2", metadata: { groupId: "grp_a", expenseId: "exp_2", kind: "expense" } }]);
	});
	it("over budget → timeout, and a throwing binding → failed, never an exception", async () => {
		assert.deepEqual(await indexExpense(fakes({ embedDelayMs: 100 }).deps, SECRET, { id: "e", groupId: "g", description: "x", items: [] }, SECRET, 10), { status: "timeout" });
		assert.equal((await indexExpense(fakes({ embedThrows: true }).deps, SECRET, { id: "e", groupId: "g", description: "x", items: [] }, SECRET)).status, "failed");
	});
});

describe("readReceiptImage", () => {
	it("refuses anything that isn't a base64 image data URI, before calling the model", async () => {
		const { deps, calls } = fakes();
		const res = await readReceiptImage(deps, SECRET, { image: "https://evil.example/receipt.png" }, SECRET);
		assert.equal(res.status, "invalid");
		assert.equal(calls.vision, 0);
	});
	it("a usable answer becomes a draft; an unusable one becomes draft: null (the form stays manual)", async () => {
		const good = await readReceiptImage(
			fakes({ visionAnswer: { merchant: "Corner Cafe", date: null, total: "9.50", items: [{ raw: "Flat white", description: "Flat white", amount: "3.20" }] } }).deps,
			SECRET,
			{ image: IMAGE },
			SECRET,
		);
		assert.equal(good.status === "ok" && good.draft?.totalMinorUnits, 950);
		const bad = await readReceiptImage(fakes({ visionAnswer: "sorry, I can't read that" }).deps, SECRET, { image: IMAGE }, SECRET);
		assert.deepEqual(bad, { status: "ok", draft: null });
	});
});

describe("embedTexts", () => {
	it("returns one vector per text", async () => {
		const res = await embedTexts(fakes().deps, SECRET, { texts: ["that thai place"] }, SECRET);
		assert.equal(res.status === "ok" && res.vectors.length, 1);
	});
});
