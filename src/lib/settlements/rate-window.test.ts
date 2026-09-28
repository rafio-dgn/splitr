// The exact settle-up limit's window (REQ-F.1).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { takeSlot } from "./rate-window.ts";

/** Takes n slots at the given times, threading the stored hits through. */
function run(times: readonly number[]) {
	let hits: number[] = [];
	return times.map((t) => {
		const slot = takeSlot(hits, t);
		hits = slot.hits;
		return slot;
	});
}

describe("takeSlot: 5 per 60 s, sliding", () => {
	it("allows 5, refuses the 6th in the same minute", () => {
		assert.deepEqual(run([0, 1, 2, 3, 4, 5]).map((s) => s.allowed), [true, true, true, true, true, false]);
	});
	it("says when to retry: when the oldest accepted request leaves the window", () => {
		const slots = run([0, 10_000, 20_000, 30_000, 40_000, 45_000]);
		assert.equal(slots[5]?.retryAfterSeconds, 15);
	});
	it("frees a slot once the oldest request is 60 s old: it slides, it doesn't reset", () => {
		// At 60 000 only the request from 0 has left the window: one slot is free, and the next request at the same instant is refused.
		assert.deepEqual(run([0, 1, 2, 3, 4, 60_000, 60_000]).map((s) => s.allowed), [true, true, true, true, true, true, false]);
	});
	it("refused requests don't count, so a flood doesn't extend the lockout", () => {
		const flood = run([0, 1, 2, 3, 4, ...Array.from({ length: 50 }, (_, i) => 5 + i), 60_001]);
		assert.equal(flood.at(-1)?.allowed, true);
	});
	it("stores only what's still in the window", () => {
		assert.deepEqual(takeSlot([1, 2, 100_000], 100_001).hits, [100_000, 100_001]);
	});
});
