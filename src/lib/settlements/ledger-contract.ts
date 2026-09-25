/**
 * The contract between the app and the `splitr-ledger` Worker (ADR-0023).
 *
 * Both sides import these types, so a change to what the Durable Object accepts
 * or returns is a compile error on both sides, never a runtime surprise.
 * Types only, with no imports that need a runtime.
 */

/** What the app sends, after it has authenticated and checked membership. */
export interface SettleRequest {
	readonly groupId: string;
	readonly fromUserId: string;
	readonly toUserId: string;
	readonly amountMinorUnits: number;
	readonly currency: string;
	/** The session's user. Already checked to be the payer or the recipient (ADR-0018 §8). */
	readonly recordedBy: string;
	/** REQ-E.2. A replay with the same key returns the cached `body`, byte-for-byte. */
	readonly idempotencyKey: string | null;
}

/** The ledger's decision, as returned (and cached) by the Durable Object. */
export type LedgerDecision =
	| {
			readonly status: "settled";
			readonly settlementId: string;
			readonly amountMinorUnits: number;
			readonly payerName: string;
			readonly payerNowOwes: number;
	  }
	| {
			readonly status: "already-settled";
			readonly payerName: string;
			readonly lastPayment: {
				readonly recordedByName: string;
				readonly toName: string;
				readonly amountMinorUnits: number;
				readonly createdAt: number;
			} | null;
	  }
	| { readonly status: "exceeds"; readonly maxMinorUnits: number; readonly payerName: string; readonly toName: string }
	| { readonly status: "recipient-not-owed"; readonly toName: string };

/**
 * The decision twice over, deliberately:
 *
 * - `decision` is the typed object, for code. RPC carries it as structured
 *   data, so the app never needs `JSON.parse`, which returns `any` and would
 *   be an unchecked cast (coding standards).
 * - `body` is the **exact JSON string** of it, which is what the idempotency
 *   cache stores and what the Route Handler returns, so a replay is
 *   byte-for-byte (REQ-E.2).
 */
export interface SettleResponse {
	readonly decision: LedgerDecision;
	readonly body: string;
	readonly replayed: boolean;
}
