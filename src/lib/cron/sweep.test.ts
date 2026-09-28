// The nightly sweep (REQ-E.6): idempotent, and one failure never stops the rest.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MemberBalance } from "../expenses/balances.ts";
import { sweep, utcDate, type SweepDeps } from "./sweep.ts";

type Stored = { amount: number; currency: string; owedSince: string; checkedOn: string };

/** An in-memory store with the same semantics as the real SQL: UPSERT keeps owed_since; other pairs are deleted. */
function world(balances: Record<string, MemberBalance[]>, opts: { failGroup?: string; ai?: boolean } = {}) {
	const reminders = new Map<string, Stored>(); // key: group|debtor|creditor
	const categories = new Map<string, string>([["li_1", "uncategorised"]]);
	const indexed = new Set<string>();
	const calls = { categorise: 0, index: 0 };
	const deps: SweepDeps = {
		async listGroups() {
			return Object.keys(balances).map((id) => ({ id, currency: "GBP" }));
		},
		async balances(groupId) {
			if (groupId === opts.failGroup) throw new Error("D1_ERROR");
			return balances[groupId] ?? [];
		},
		async replaceReminders(groupId, currency, rows, today) {
			const keep = new Set(rows.map((r) => `${groupId}|${r.debtorId}|${r.creditorId}`));
			for (const key of [...reminders.keys()]) if (key.startsWith(`${groupId}|`) && !keep.has(key)) reminders.delete(key);
			for (const r of rows) {
				const key = `${groupId}|${r.debtorId}|${r.creditorId}`;
				const existing = reminders.get(key);
				reminders.set(key, { amount: r.amountMinorUnits, currency, owedSince: existing?.owedSince ?? today, checkedOn: today });
			}
		},
		async uncategorisedItems() {
			return [...categories].filter(([, c]) => c === "uncategorised").map(([itemId]) => ({ groupId: "g1", expenseId: "exp_1", itemId, description: "Milk" }));
		},
		async unindexedExpenses() {
			return indexed.has("exp_1") ? [] : [{ id: "exp_1", groupId: "g1", description: "Tesco", items: [{ id: "li_1", description: "Milk" }] }];
		},
		async markIndexed(id) {
			indexed.add(id);
		},
		ai:
			opts.ai === false
				? null
				: {
						async categorise(request) {
							calls.categorise++;
							return { status: "ok", model: "8b", ms: 5, results: request.items.map((i) => ({ id: i.id, category: "groceries", raw: "groceries", groupExamples: 0, seedExamples: 5, neurons: 5 })) };
						},
						async index() {
							calls.index++;
							return { status: "ok", vectors: 1, mutationId: "m" };
						},
					},
		async writeCategories(updates) {
			let n = 0;
			for (const u of updates) {
				if (categories.get(u.id) === "uncategorised") {
					categories.set(u.id, u.category);
					n++;
				}
			}
			return n;
		},
		audit() {},
	};
	const snapshot = () => JSON.stringify({ reminders: [...reminders].sort(), categories: [...categories].sort(), indexed: [...indexed].sort() });
	return { deps, snapshot, reminders, calls };
}

const bal = (userId: string, net: number): MemberBalance => ({ userId, name: userId, netMinorUnits: net });
const DAY1 = Date.parse("2026-09-28T02:30:00Z");
const DAY1_LATER = Date.parse("2026-09-28T09:00:00Z");
const DAY5 = Date.parse("2026-10-02T02:30:00Z");

describe("sweep (REQ-E.6)", () => {
	it("run twice on the same day: the stored result is identical", async () => {
		const w = world({ g1: [bal("alice", -4000), bal("bob", 4000)], g2: [bal("c", 0), bal("d", 0)] });
		await sweep(w.deps, DAY1);
		const first = w.snapshot();
		await sweep(w.deps, DAY1_LATER);
		assert.equal(w.snapshot(), first);
	});

	it("the second run does no AI work the first run already did", async () => {
		const w = world({ g1: [bal("alice", -4000), bal("bob", 4000)] });
		await sweep(w.deps, DAY1);
		await sweep(w.deps, DAY1_LATER);
		assert.deepEqual(w.calls, { categorise: 1, index: 1 });
	});

	it("keeps owed_since across days, updates the amount, and deletes a settled pair", async () => {
		const balances = { g1: [bal("alice", -4000), bal("bob", 4000)] };
		const w = world(balances);
		await sweep(w.deps, DAY1);
		balances.g1 = [bal("alice", -1500), bal("bob", 1500)];
		await sweep(w.deps, DAY5);
		assert.deepEqual(w.reminders.get("g1|alice|bob"), { amount: 1500, currency: "GBP", owedSince: "2026-09-28", checkedOn: "2026-10-02" });
		balances.g1 = [bal("alice", 0), bal("bob", 0)];
		await sweep(w.deps, DAY5);
		assert.equal(w.reminders.size, 0);
	});

	it("one failing group doesn't stop the others, and is counted", async () => {
		const w = world({ bad: [bal("x", -1), bal("y", 1)], g1: [bal("alice", -4000), bal("bob", 4000)] }, { failGroup: "bad" });
		const summary = await sweep(w.deps, DAY1);
		assert.equal(summary.groupsFailed, 1);
		assert.ok(w.reminders.has("g1|alice|bob"));
	});

	it("with no AI configured, reminders still run and no AI work is attempted", async () => {
		const w = world({ g1: [bal("alice", -4000), bal("bob", 4000)] }, { ai: false });
		const summary = await sweep(w.deps, DAY1);
		assert.equal(summary.reminderPairs, 1);
		assert.deepEqual(summary.backfill, { items: 0, expenses: 0 });
		assert.deepEqual(summary.reindex, { tried: 0, indexed: 0 });
	});

	it("dates are UTC days, never timestamps", () => {
		assert.equal(utcDate(Date.parse("2026-09-28T23:59:59Z")), "2026-09-28");
	});
});
