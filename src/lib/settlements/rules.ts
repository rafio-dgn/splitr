/**
 * The settlement rule (ADR-0018 §2), as a pure function.
 *
 * "A paid B" is valid only if A currently owes, B is currently owed, and the
 * amount is at most what each side can absorb. This is the check the
 * Durable Object will make at `REQ-E.1`. It lives here, pure and tested, so that
 * the DO and today's naive path use **the same rule**, and E only changes
 * *when* it runs (serialised) rather than *what* it decides.
 *
 * Pure: no `server-only`, no aliases, so `node --test` imports it (ADR-0012).
 */

export interface SettlementAttempt {
	readonly fromUserId: string;
	readonly toUserId: string;
	readonly amountMinorUnits: number;
}

export type SettlementVerdict =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: "same-person" }
	/** The payer doesn't owe anything. This is how the *duplicate* is refused. */
	| { readonly ok: false; readonly reason: "payer-not-owing" }
	| { readonly ok: false; readonly reason: "recipient-not-owed" }
	/** More than one side can absorb. `maxMinorUnits` is the most that would be accepted. */
	| { readonly ok: false; readonly reason: "exceeds"; readonly maxMinorUnits: number };

/**
 * Judges one settlement against the current net balances.
 *
 * `netOf` returns a member's current net in minor units (positive means owed).
 * A member with no entry counts as 0, which can only make the check stricter.
 */
export function checkSettlement(
	netOf: (userId: string) => number,
	attempt: SettlementAttempt,
): SettlementVerdict {
	if (attempt.fromUserId === attempt.toUserId) {
		return { ok: false, reason: "same-person" };
	}
	const payerOwes = -netOf(attempt.fromUserId);
	const recipientIsOwed = netOf(attempt.toUserId);
	if (payerOwes <= 0) {
		return { ok: false, reason: "payer-not-owing" };
	}
	if (recipientIsOwed <= 0) {
		return { ok: false, reason: "recipient-not-owed" };
	}
	const maxMinorUnits = Math.min(payerOwes, recipientIsOwed);
	if (attempt.amountMinorUnits > maxMinorUnits) {
		return { ok: false, reason: "exceeds", maxMinorUnits };
	}
	return { ok: true };
}
