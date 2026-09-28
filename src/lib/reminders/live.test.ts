// Reminders are shown only while the debt is still real (ADR-0026 §2).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { liveReminders, reminderCutoff, type StoredReminder } from "./live.ts";

const stored: StoredReminder = { groupId: "g1", groupName: "Flat", creditorId: "bob", creditorName: "Bob", owedSince: "2026-09-20" };

describe("liveReminders", () => {
	it("shows a reminder whose pair still owes, with the LIVE amount", () => {
		const live = new Map([["g1", [{ fromUserId: "alice", toUserId: "bob", amountMinorUnits: 1500 }]]]);
		assert.deepEqual(liveReminders("alice", [stored], live), [{ ...stored, amountMinorUnits: 1500 }]);
	});
	it("hides a reminder whose debt was settled since the cron ran", () => {
		assert.deepEqual(liveReminders("alice", [stored], new Map([["g1", []]])), []);
	});
	it("hides it if the viewer now owes someone else instead", () => {
		const live = new Map([["g1", [{ fromUserId: "alice", toUserId: "carol", amountMinorUnits: 900 }]]]);
		assert.deepEqual(liveReminders("alice", [stored], live), []);
	});
});

describe("reminderCutoff", () => {
	it("is 3 days before today (UTC)", () => {
		assert.equal(reminderCutoff(Date.parse("2026-09-28T10:00:00Z")), "2026-09-25");
	});
});
