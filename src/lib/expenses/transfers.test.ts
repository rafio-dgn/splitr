// suggestTransfers: who pays whom, deterministically (ADR-0026 §2).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MemberBalance } from "./balances.ts";
import { suggestTransfers } from "./transfers.ts";

const b = (userId: string, netMinorUnits: number): MemberBalance => ({ userId, name: userId, netMinorUnits });

describe("suggestTransfers", () => {
	it("a square group needs no transfers", () => {
		assert.deepEqual(suggestTransfers([b("a", 0), b("b", 0)]), []);
	});

	it("one debtor, one creditor: one transfer of the whole debt", () => {
		assert.deepEqual(suggestTransfers([b("alice", -4000), b("bob", 4000)]), [{ fromUserId: "alice", toUserId: "bob", amountMinorUnits: 4000 }]);
	});

	it("the largest debtor pays the largest creditor first (what the settle page suggests)", () => {
		const t = suggestTransfers([b("a", -1000), b("b", -3000), b("c", 2500), b("d", 1500)]);
		assert.deepEqual(t[0], { fromUserId: "b", toUserId: "c", amountMinorUnits: 2500 });
	});

	it("uses up every debt exactly: each debtor pays, and each creditor receives, their whole balance", () => {
		const balances = [b("a", -1001), b("b", -2999), b("c", -7), b("d", 2500), b("e", 1507)];
		const t = suggestTransfers(balances);
		for (const m of balances) {
			const out = t.filter((x) => x.fromUserId === m.userId).reduce((s, x) => s + x.amountMinorUnits, 0);
			const inn = t.filter((x) => x.toUserId === m.userId).reduce((s, x) => s + x.amountMinorUnits, 0);
			assert.equal(inn - out, m.netMinorUnits, `member ${m.userId}`);
		}
		assert.ok(t.every((x) => Number.isInteger(x.amountMinorUnits) && x.amountMinorUnits > 0));
	});

	it("is deterministic: equal amounts break by id, and input order doesn't matter", () => {
		const one = suggestTransfers([b("z", -500), b("y", -500), b("x", 1000)]);
		const two = suggestTransfers([b("x", 1000), b("y", -500), b("z", -500)]);
		assert.deepEqual(one, two);
		assert.equal(one[0]?.fromUserId, "y");
	});
});
