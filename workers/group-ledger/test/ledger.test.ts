/**
 * The contested write's invariants, tested against a REAL GroupLedger Durable
 * Object and D1 inside workerd (ADR-0012's Cluster E plan, ADR-0023).
 */
import { env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { SettleRequest } from "../../../src/lib/settlements/ledger-contract";

let seq = 0;

/** A fresh group where Alice owes Bob £40 (Bob paid £80, split two ways). */
async function groupWhereAliceOwesBob40(): Promise<{ groupId: string; alice: string; bob: string }> {
	seq += 1;
	const groupId = `grp_test${seq}_${crypto.randomUUID().slice(0, 8)}`;
	const alice = `u_alice_${seq}`;
	const bob = `u_bob_${seq}`;
	await env.DB.batch([
		env.DB.prepare("INSERT INTO user (id, name, email, updated_at) VALUES (?, 'Alice', ?, 0), (?, 'Bob', ?, 0)").bind(alice, `${alice}@t.test`, bob, `${bob}@t.test`),
		env.DB.prepare(`INSERT INTO "group" (id, name, currency, invite_code, created_by) VALUES (?, 'Test', 'GBP', ?, ?)`).bind(groupId, `code_${groupId}`, alice),
		env.DB.prepare("INSERT INTO group_member (group_id, user_id) VALUES (?, ?), (?, ?)").bind(groupId, alice, groupId, bob),
		env.DB.prepare("INSERT INTO expense (id, group_id, description, amount_cents, currency, spent_on, paid_by, created_by) VALUES (?, ?, 'Dinner', 8000, 'GBP', '2026-09-25', ?, ?)").bind(`exp_${groupId}`, groupId, bob, bob),
		env.DB.prepare("INSERT INTO expense_share (expense_id, user_id, share_cents) VALUES (?, ?, 4000), (?, ?, 4000)").bind(`exp_${groupId}`, alice, `exp_${groupId}`, bob),
	]);
	return { groupId, alice, bob };
}

const settleReq = (g: { groupId: string; alice: string; bob: string }, recordedBy: string, amount = 4000, key: string | null = null): SettleRequest => ({
	groupId: g.groupId,
	fromUserId: g.alice,
	toUserId: g.bob,
	amountMinorUnits: amount,
	currency: "GBP",
	recordedBy,
	idempotencyKey: key,
});

const ledgerFor = (groupId: string) => env.GROUP_LEDGER.get(env.GROUP_LEDGER.idFromName(groupId));

async function settlementCount(groupId: string): Promise<number> {
	const row = await env.DB.prepare("SELECT count(*) AS n FROM settlement WHERE group_id = ?").bind(groupId).first<{ n: number }>();
	return row?.n ?? -1;
}

describe("GroupLedger: the contested write", () => {
	it("THIRTY simultaneous settlements of one £40 debt: exactly one wins (this test guards the lock)", async () => {
		// Measured on 2026-09-25, with blockConcurrencyWhile REMOVED:
		//   2-way race: failed about 1 run in 12 (1 of 4, then 0 of 8)
		//   8-way race: passed 8/8 (no interleave observed)
		//   30-way race: FAILED 6/6
		// With the lock, 30-way passes every time. So the size is what makes
		// this test a real guard: delete the lock and it goes red.
		const g = await groupWhereAliceOwesBob40();
		const ledger = ledgerFor(g.groupId);
		const results = await Promise.all(
			Array.from({ length: 30 }, (_, i) => ledger.settle(settleReq(g, i % 2 === 0 ? g.alice : g.bob))),
		);
		expect(results.filter((r) => r.decision.status === "settled")).toHaveLength(1);
		expect(results.filter((r) => r.decision.status === "already-settled")).toHaveLength(29);
		expect(await settlementCount(g.groupId)).toBe(1);
	});

	it("two simultaneous settlements of one £40 debt: exactly one wins, and the other is told it lost", async () => {
		const g = await groupWhereAliceOwesBob40();
		const ledger = ledgerFor(g.groupId);
		const [a, b] = await Promise.all([ledger.settle(settleReq(g, g.alice)), ledger.settle(settleReq(g, g.bob))]);
		const statuses = [a.decision.status, b.decision.status].sort();
		expect(statuses).toEqual(["already-settled", "settled"]);
		expect(await settlementCount(g.groupId)).toBe(1);
		const loser = a.decision.status === "already-settled" ? a.decision : b.decision;
		const winnerRecordedBy = a.decision.status === "settled" ? "Alice" : "Bob";
		expect(loser.status === "already-settled" && loser.lastPayment?.recordedByName).toBe(winnerRecordedBy);
	});

	it("refuses more than is owed, and says the most it would take", async () => {
		const g = await groupWhereAliceOwesBob40();
		const { decision } = await ledgerFor(g.groupId).settle(settleReq(g, g.alice, 6000));
		expect(decision).toMatchObject({ status: "exceeds", maxMinorUnits: 4000 });
		expect(await settlementCount(g.groupId)).toBe(0);
	});
});

describe("GroupLedger: idempotency (REQ-E.2)", () => {
	it("a replay returns the byte-identical body and writes nothing", async () => {
		const g = await groupWhereAliceOwesBob40();
		const ledger = ledgerFor(g.groupId);
		const first = await ledger.settle(settleReq(g, g.alice, 4000, "key-1"));
		const replay = await ledger.settle(settleReq(g, g.alice, 4000, "key-1"));
		expect(first.replayed).toBe(false);
		expect(replay.replayed).toBe(true);
		expect(replay.body).toBe(first.body);
		expect(await settlementCount(g.groupId)).toBe(1);
	});

	it("the same key twice at the same instant (a double-click): one write, identical bodies", async () => {
		const g = await groupWhereAliceOwesBob40();
		const ledger = ledgerFor(g.groupId);
		const [a, b] = await Promise.all([ledger.settle(settleReq(g, g.alice, 4000, "dbl")), ledger.settle(settleReq(g, g.alice, 4000, "dbl"))]);
		expect(a.body).toBe(b.body);
		expect([a.replayed, b.replayed].sort()).toEqual([false, true]);
		expect(await settlementCount(g.groupId)).toBe(1);
	});

	it("the alarm evicts expired entries, keeps live ones, and re-arms for the next expiry", async () => {
		const g = await groupWhereAliceOwesBob40();
		const ledger = ledgerFor(g.groupId);
		const now = Date.now();
		await runInDurableObject(ledger, async (_instance, state) => {
			await state.storage.put("idem:expired", { decision: { status: "recipient-not-owed", toName: "x" }, body: "{}", expiresAt: now - 1 });
			await state.storage.put("idem:live", { decision: { status: "recipient-not-owed", toName: "x" }, body: "{}", expiresAt: now + 60 * 60 * 1000 });
			// In the future, so it can't fire on its own first; the test fires it on demand.
			await state.storage.setAlarm(now + 10 * 60 * 1000);
		});
		expect(await runDurableObjectAlarm(ledger)).toBe(true);
		await runInDurableObject(ledger, async (_instance, state) => {
			expect(await state.storage.get("idem:expired")).toBeUndefined();
			expect(await state.storage.get("idem:live")).toBeDefined();
			expect(await state.storage.getAlarm()).toBe(now + 60 * 60 * 1000);
		});
	});
});

describe("SettleRateLimiter (REQ-F.1, ADR-0029 amendment): exact, per user", () => {
	const limiter = (user: string) => env.SETTLE_RATE.get(env.SETTLE_RATE.idFromName(user));

	it("allows 5 in a row and refuses the 6th, with a Retry-After", async () => {
		const stub = limiter(`u_seq_${crypto.randomUUID()}`);
		const results = [];
		for (let i = 0; i < 6; i++) results.push(await stub.take());
		expect(results.map((r) => r.allowed)).toEqual([true, true, true, true, true, false]);
		expect(results[5]?.retryAfterSeconds).toBeGreaterThan(0);
	});

	it("20 requests from one user at the same instant: exactly 5 are allowed (what the binding couldn't do)", async () => {
		const stub = limiter(`u_burst_${crypto.randomUUID()}`);
		const results = await Promise.all(Array.from({ length: 20 }, () => stub.take()));
		expect(results.filter((r) => r.allowed)).toHaveLength(5);
	});

	it("is per user: one user's lockout doesn't touch another's budget", async () => {
		const a = limiter(`u_a_${crypto.randomUUID()}`);
		const b = limiter(`u_b_${crypto.randomUUID()}`);
		for (let i = 0; i < 6; i++) await a.take();
		expect((await b.take()).allowed).toBe(true);
	});

	it("its alarm clears storage once every hit has left the window", async () => {
		const stub = limiter(`u_alarm_${crypto.randomUUID()}`);
		await stub.take();
		// Age the stored hit past the window, then fire the alarm (60 s can't be waited out).
		await runInDurableObject(stub, async (_instance, state) => {
			await state.storage.put("hits", [Date.now() - 120_000]);
		});
		expect(await runDurableObjectAlarm(stub)).toBe(true);
		await runInDurableObject(stub, async (_instance, state) => {
			expect(await state.storage.get("hits")).toBeUndefined();
		});
	});
});
