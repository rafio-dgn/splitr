/**
 * Recording "A paid B": **the naive version, on purpose** (D.3).
 *
 * The rule is the real one (`checkSettlement`, ADR-0018 §2), but it runs as
 * **check-then-write with nothing in between to stop a second writer.** Two
 * people tapping "Settle" at the same moment can both read "Alice owes £40",
 * both pass the check, and both insert, so the £40 is counted twice. That's
 * the bug Splitr exists to prevent, and it's left in deliberately:
 *
 *   - E.2 reproduces it on camera, as the "before" (build plan, Cluster E);
 *   - E.1 then routes this write through the group's Durable Object, which
 *     serialises the check and the write, and the second writer is refused.
 *
 * Raffaele chose this sequencing on 2026-09-24. Until E.1, the live app
 * carries this race, documented and known. Search for `RACE (REQ-E.1)`.
 */
import "server-only";

import { getDb } from "@/db";
import { settlement } from "@/db/schema";
import { audit } from "@/lib/audit";
import { deriveBalances } from "@/lib/expenses/balances";
import { listGroupExpenses, listGroupSettlements } from "@/lib/expenses/expense-feed";
import { getGroupForViewer, isMember } from "@/lib/groups/membership";
import { newId } from "@/lib/ids";
import { parseRecordSettlement, type SettlementFieldErrors } from "@/lib/schemas/settlement";

import { checkSettlement } from "./rules";

export interface Actor {
	readonly id: string;
}

export type RecordSettlementResult =
	/** (a) in §6.3. `payerNowOwes` is the payer's remaining debt after this one. */
	| { readonly status: "settled"; readonly settlementId: string; readonly amountMinorUnits: number; readonly payerName: string; readonly payerNowOwes: number }
	/**
	 * (b) in §6.3: the payer no longer owes anything, which is how a *sequential*
	 * duplicate shows up. `lastPayment` names who recorded the most recent
	 * settlement from this payer, and when, because §6.3 says the loser must be
	 * told who won.
	 */
	| {
			readonly status: "already-settled";
			readonly payerName: string;
			readonly lastPayment: { readonly recordedByName: string; readonly toName: string; readonly amountMinorUnits: number; readonly createdAt: number } | null;
	  }
	/** (c) in §6.3: more than one side can absorb. */
	| { readonly status: "exceeds"; readonly maxMinorUnits: number; readonly payerName: string; readonly toName: string }
	| { readonly status: "recipient-not-owed"; readonly toName: string }
	| { readonly status: "invalid"; readonly fieldErrors: SettlementFieldErrors; readonly formErrors: readonly string[] }
	| { readonly status: "not-found" }
	/** (d) in §6.3: the only genuine error. Nothing was written. */
	| { readonly status: "failed" };

export async function recordSettlement(rawInput: unknown, actor: Actor): Promise<RecordSettlementResult> {
	const parsed = parseRecordSettlement(rawInput);
	if (!parsed.ok) {
		audit({ actor: actor.id, action: "settlement.record", target: "unknown", outcome: "rejected:invalid-shape", persisted: false });
		return { status: "invalid", fieldErrors: parsed.fieldErrors, formErrors: parsed.formErrors };
	}
	const attempt = parsed.value;

	// Not a member (or no such group) → 404, never 403, as everywhere else.
	const group = await getGroupForViewer(attempt.groupId, actor.id);
	if (group === null) {
		audit({ actor: actor.id, action: "settlement.record", target: attempt.groupId, outcome: "rejected:not-found", persisted: false });
		return { status: "not-found" };
	}

	const fieldErrors: SettlementFieldErrors = {};
	if (!isMember(group, attempt.fromUserId)) {
		fieldErrors.fromUserId = ["That person isn't in this group."];
	}
	if (!isMember(group, attempt.toUserId)) {
		fieldErrors.toUserId = ["That person isn't in this group."];
	}
	if (attempt.fromUserId === attempt.toUserId) {
		fieldErrors.toUserId = ["Someone can't pay themselves."];
	}
	// ADR-0018 §8: only the two people involved may record it. The database
	// enforces this too (`settlement_recorded_by_party`); this gives the words.
	const formErrors =
		actor.id === attempt.fromUserId || actor.id === attempt.toUserId
			? []
			: ["You can only record a payment you made or received."];
	if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
		audit({ actor: actor.id, action: "settlement.record", target: group.id, outcome: "rejected:not-a-party", persisted: false });
		return { status: "invalid", fieldErrors, formErrors };
	}

	const nameOf = (id: string): string => group.members.find((m) => m.id === id)?.name ?? "Someone";

	// ── RACE (REQ-E.1) ─────────────────────────────────────────────────────────
	// The CHECK: read the balances *now*…
	const [expenses, settlements] = await Promise.all([listGroupExpenses(group.id), listGroupSettlements(group.id)]);
	const balances = deriveBalances(group.members, expenses, settlements);
	const net = new Map(balances.map((b) => [b.userId, b.netMinorUnits]));
	const verdict = checkSettlement((id) => net.get(id) ?? 0, {
		fromUserId: attempt.fromUserId,
		toUserId: attempt.toUserId,
		amountMinorUnits: attempt.amount,
	});

	if (!verdict.ok) {
		audit({ actor: actor.id, action: "settlement.record", target: group.id, outcome: `refused:${verdict.reason}`, persisted: false });
		switch (verdict.reason) {
			case "payer-not-owing": {
				const last = settlements.find((s) => s.fromUserId === attempt.fromUserId);
				return {
					status: "already-settled",
					payerName: nameOf(attempt.fromUserId),
					lastPayment:
						last === undefined
							? null
							: { recordedByName: nameOf(last.recordedById), toName: last.toName, amountMinorUnits: last.amountMinorUnits, createdAt: last.createdAt },
				};
			}
			case "exceeds":
				return { status: "exceeds", maxMinorUnits: verdict.maxMinorUnits, payerName: nameOf(attempt.fromUserId), toName: nameOf(attempt.toUserId) };
			case "recipient-not-owed":
				return { status: "recipient-not-owed", toName: nameOf(attempt.toUserId) };
			case "same-person":
				return { status: "invalid", fieldErrors: { toUserId: ["Someone can't pay themselves."] }, formErrors: [] };
		}
	}

	// …and the WRITE, some milliseconds later. Nothing stops a second request
	// from passing the same check in between. That gap is the whole of E.1.
	const settlementId = newId("stl");
	try {
		const db = await getDb();
		await db.insert(settlement).values({
			id: settlementId,
			groupId: group.id,
			fromUser: attempt.fromUserId,
			toUser: attempt.toUserId,
			amountCents: attempt.amount,
			currency: group.currency,
			recordedBy: actor.id,
		});
	} catch (error) {
		audit({ actor: actor.id, action: "settlement.record", target: group.id, outcome: `error:${String(error).slice(0, 120)}`, persisted: false });
		return { status: "failed" };
	}
	// ───────────────────────────────────────────────────────────────────────────

	audit({
		actor: actor.id,
		action: "settlement.record",
		target: settlementId,
		outcome: "accepted",
		persisted: true,
		detail: { group: group.id, from: attempt.fromUserId, to: attempt.toUserId, amountMinorUnits: attempt.amount },
	});
	return {
		status: "settled",
		settlementId,
		amountMinorUnits: attempt.amount,
		payerName: nameOf(attempt.fromUserId),
		payerNowOwes: -(net.get(attempt.fromUserId) ?? 0) - attempt.amount,
	};
}
