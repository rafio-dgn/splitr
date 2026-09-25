/**
 * Recording "A paid B", arbitrated by the group's Durable Object
 * (REQ-E.1, ADR-0023).
 *
 * This file does what only the app can do: it authenticates (the caller
 * passes the session's user), parses, and checks membership and "the recorder
 * is one of the two parties" (ADR-0018 §8). The **ledger decision** (does the
 * payer still owe, and does the amount fit) is made by the `GroupLedger` DO,
 * reached through the `LEDGER` service binding. The DO runs the check and the
 * write as one critical section, so the second of two simultaneous
 * settlements is refused, not double-counted.
 *
 * Until 2026-09-25 this file did the check and the write itself, with the
 * race between them marked `RACE (REQ-E.1)`. That was E.2's "before",
 * reproduced in `wiki/evidence/REQ-E.1-double-settle-without-the-do.md`.
 */
import "server-only";

import { audit } from "@/lib/audit";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getGroupForViewer, isMember } from "@/lib/groups/membership";
import { parseRecordSettlement, type SettlementFieldErrors } from "@/lib/schemas/settlement";

import type { LedgerDecision } from "./ledger-contract";

export interface Actor {
	readonly id: string;
}

export type RecordSettlementResult =
	| LedgerDecision
	| { readonly status: "invalid"; readonly fieldErrors: SettlementFieldErrors; readonly formErrors: readonly string[] }
	| { readonly status: "not-found" }
	/** (d) in §6.3: the only genuine error. The ledger was unreachable, and nothing was written. */
	| { readonly status: "failed" };

/**
 * The result, plus the ledger's **exact** response body when there is one, so
 * the Route Handler can return a replay byte-for-byte (REQ-E.2).
 */
export interface RecordSettlementOutcome {
	readonly result: RecordSettlementResult;
	readonly ledgerBody: string | null;
	readonly replayed: boolean;
}

const local = (result: RecordSettlementResult): RecordSettlementOutcome => ({ result, ledgerBody: null, replayed: false });

export async function recordSettlement(
	rawInput: unknown,
	actor: Actor,
	idempotencyKey: string | null,
): Promise<RecordSettlementOutcome> {
	const parsed = parseRecordSettlement(rawInput);
	if (!parsed.ok) {
		audit({ actor: actor.id, action: "settlement.record", target: "unknown", outcome: "rejected:invalid-shape", persisted: false });
		return local({ status: "invalid", fieldErrors: parsed.fieldErrors, formErrors: parsed.formErrors });
	}
	const attempt = parsed.value;

	// Not a member (or no such group) → 404, never 403, as everywhere else.
	const group = await getGroupForViewer(attempt.groupId, actor.id);
	if (group === null) {
		audit({ actor: actor.id, action: "settlement.record", target: attempt.groupId, outcome: "rejected:not-found", persisted: false });
		return local({ status: "not-found" });
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
		return local({ status: "invalid", fieldErrors, formErrors });
	}

	// The ledger decision, made by the group's Durable Object in one critical
	// section: read the balances, check, write (ADR-0023). The DO emits the
	// [AUDIT] line after its D1 write (REQ-E.3).
	try {
		const { env } = await getCloudflareContext({ async: true });
		const response = await env.LEDGER.settle({
			groupId: group.id,
			fromUserId: attempt.fromUserId,
			toUserId: attempt.toUserId,
			amountMinorUnits: attempt.amount,
			currency: group.currency,
			recordedBy: actor.id,
			idempotencyKey,
		});
		return { result: response.decision, ledgerBody: response.body, replayed: response.replayed };
	} catch (error) {
		audit({ actor: actor.id, action: "settlement.record", target: group.id, outcome: `error:ledger-unreachable:${String(error).slice(0, 100)}`, persisted: false });
		return local({ status: "failed" });
	}
}
