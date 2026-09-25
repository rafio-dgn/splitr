/**
 * ADR-0012: the money arithmetic is tested, because a wrong balance looks
 * exactly like a right one. `node --test`, no dependencies.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveBalances, type ExpenseForBalance, type SettlementForBalance } from "./expenses/balances.ts";
import { describePosition, formatGbp } from "./money.ts";
import { equalShares, parseAddExpense } from "./schemas/expense.ts";
import { checkSettlement } from "./settlements/rules.ts";

/** A small deterministic PRNG, so a failing random case is reproducible. */
function prng(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
		return state / 2 ** 31;
	};
}

describe("equalShares", () => {
	it("always sums to exactly the total, for every total and participant count", () => {
		for (let total = 1; total <= 1_000; total += 1) {
			for (let count = 1; count <= 9; count += 1) {
				const ids = Array.from({ length: count }, (_, i) => `u${i}`);
				const shares = equalShares(total, ids);
				const sum = shares.reduce((acc, s) => acc + s.shareMinorUnits, 0);
				assert.equal(sum, total, `total ${total} across ${count}`);
				const values = shares.map((s) => s.shareMinorUnits);
				assert.ok(Math.max(...values) - Math.min(...values) <= 1, "shares differ by at most a penny");
			}
		}
	});

	it("puts the leftover penny on the first participants: £10.00 across 3 is 334/333/333", () => {
		assert.deepEqual(
			equalShares(1_000, ["a", "b", "c"]).map((s) => s.shareMinorUnits),
			[334, 333, 333],
		);
	});
});

describe("deriveBalances", () => {
	const members = [
		{ id: "a", name: "Alice" },
		{ id: "b", name: "Bob" },
		{ id: "c", name: "Chidi" },
	];

	it("nets always sum to zero, for random expenses and settlements (the believability invariant)", () => {
		const random = prng(42);
		const pick = (): string => members[Math.floor(random() * members.length)]?.id ?? "a";
		for (let run = 0; run < 300; run += 1) {
			const expenses: ExpenseForBalance[] = [];
			const settlements: SettlementForBalance[] = [];
			for (let i = 0; i < 12; i += 1) {
				const amount = 1 + Math.floor(random() * 50_000);
				const participants = members.filter(() => random() > 0.3).map((m) => m.id);
				const ids = participants.length > 0 ? participants : ["a"];
				expenses.push({ paidById: pick(), amountMinorUnits: amount, shares: equalShares(amount, ids) });
				const from = pick();
				const to = pick();
				if (from !== to) {
					settlements.push({ fromUserId: from, toUserId: to, amountMinorUnits: 1 + Math.floor(random() * 5_000) });
				}
			}
			const nets = deriveBalances(members, expenses, settlements);
			assert.equal(nets.reduce((acc, b) => acc + b.netMinorUnits, 0), 0, `run ${run}`);
		}
	});

	it("a settlement moves both sides to zero: Alice at -£40 pays Bob at +£40", () => {
		const expense = { paidById: "b", amountMinorUnits: 8_000, shares: equalShares(8_000, ["a", "b"]) };
		const before = deriveBalances(members.slice(0, 2), [expense]);
		assert.deepEqual(before.map((b) => b.netMinorUnits), [-4_000, 4_000]);
		const after = deriveBalances(members.slice(0, 2), [expense], [{ fromUserId: "a", toUserId: "b", amountMinorUnits: 4_000 }]);
		assert.deepEqual(after.map((b) => b.netMinorUnits), [0, 0]);
	});
});

describe("checkSettlement (ADR-0018 §2: the rule the Durable Object will enforce)", () => {
	const nets = new Map([
		["alice", -4_000],
		["bob", 4_000],
		["chidi", 0],
	]);
	const netOf = (id: string): number => nets.get(id) ?? 0;

	it("accepts the payment that's owed, and a partial one", () => {
		assert.deepEqual(checkSettlement(netOf, { fromUserId: "alice", toUserId: "bob", amountMinorUnits: 4_000 }), { ok: true });
		assert.deepEqual(checkSettlement(netOf, { fromUserId: "alice", toUserId: "bob", amountMinorUnits: 1_500 }), { ok: true });
	});

	it("refuses the sequential duplicate: once Alice has paid, she no longer owes", () => {
		const after = new Map([["alice", 0], ["bob", 0]]);
		const verdict = checkSettlement((id) => after.get(id) ?? 0, { fromUserId: "alice", toUserId: "bob", amountMinorUnits: 4_000 });
		assert.deepEqual(verdict, { ok: false, reason: "payer-not-owing" });
	});

	it("refuses more than either side can absorb, and says the most it would take", () => {
		assert.deepEqual(checkSettlement(netOf, { fromUserId: "alice", toUserId: "bob", amountMinorUnits: 6_000 }), {
			ok: false,
			reason: "exceeds",
			maxMinorUnits: 4_000,
		});
	});

	it("refuses paying someone who isn't owed, and paying yourself", () => {
		assert.deepEqual(checkSettlement(netOf, { fromUserId: "alice", toUserId: "chidi", amountMinorUnits: 100 }), {
			ok: false,
			reason: "recipient-not-owed",
		});
		assert.deepEqual(checkSettlement(netOf, { fromUserId: "alice", toUserId: "alice", amountMinorUnits: 100 }), {
			ok: false,
			reason: "same-person",
		});
	});
});

describe("parseAddExpense amount boundaries (the cheap half of the REQ-B.2 curls)", () => {
	const valid = {
		groupId: "g",
		description: "Tesco",
		currency: "GBP",
		spentAt: "2026-09-01",
		paidById: "a",
		participantIds: ["a", "b"],
	};
	const amountOf = (amount: string): number | string => {
		const result = parseAddExpense({ ...valid, amount });
		return result.ok ? result.value.amount : (result.fieldErrors.amount?.[0] ?? "invalid");
	};

	it("turns typed money into integer minor units", () => {
		assert.equal(amountOf("42.50"), 4_250);
		assert.equal(amountOf("42.5"), 4_250);
		assert.equal(amountOf("1,234.50"), 123_450);
		assert.equal(amountOf("0.01"), 1);
	});

	it("refuses zero, negatives, three decimals, words and the over-limit amount", () => {
		assert.equal(amountOf("0"), "An expense has to be more than £0.00.");
		assert.match(String(amountOf("-5")), /can't be negative/);
		assert.equal(amountOf("1.234"), "Amounts can have at most two decimal places.");
		assert.match(String(amountOf("abc")), /numbers only/);
		assert.match(String(amountOf("1000000.01")), /over the £1,000,000.00 limit/);
	});
});

describe("formatGbp / describePosition", () => {
	it("formats integer minor units as pounds, and never shows a minus sign in words", () => {
		assert.equal(formatGbp(4_250), "£42.50");
		assert.equal(describePosition(-4_250).sentence, "You owe £42.50");
		assert.equal(describePosition(4_250).sentence, "You're owed £42.50");
		assert.doesNotMatch(describePosition(-1).sentence, /-/);
	});
});

describe("the read-receipt confirmation (ADR-0016 §2, enforced on the server)", () => {
	const base = {
		groupId: "g",
		description: "99 Speed Mart",
		amount: "37.45",
		currency: "GBP",
		spentAt: "2026-09-01",
		paidById: "a",
		participantIds: ["a"],
	};
	const items = [{ rawText: "INDOCAFE COFFEEMIX 3IN", description: "Coffee mix, 3-in-1", amountMinorUnits: 2995 }];

	it("refuses line items from a read receipt unless the amount was confirmed", () => {
		const result = parseAddExpense({ ...base, lineItems: items });
		assert.equal(result.ok, false);
		assert.match(String(result.ok ? "" : result.fieldErrors.amountConfirmed?.[0]), /tick the box/);
	});

	it("accepts them once confirmed, and needs no confirmation when there are no items", () => {
		assert.equal(parseAddExpense({ ...base, lineItems: items, amountConfirmed: "yes" }).ok, true);
		assert.equal(parseAddExpense(base).ok, true);
	});
});

