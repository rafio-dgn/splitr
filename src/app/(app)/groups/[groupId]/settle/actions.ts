"use server";

/**
 * The settle form's entry point. It's thin (ADR-0010): it authenticates, reads
 * the `FormData` and delegates. Every rule is in `recordSettlement`, and the
 * ledger decision is the GroupLedger Durable Object's (ADR-0023).
 */
import { recordSettlement, type RecordSettlementResult } from "@/lib/settlements/record-settlement";
import { requireSession } from "@/lib/session";

export type SettleFormState = { status: "idle" } | RecordSettlementResult;

export async function recordSettlementAction(_previous: SettleFormState, formData: FormData): Promise<SettleFormState> {
	const session = await requireSession();
	// Minted when the form rendered (ADR-0023 §3): a double-click, a retry or a
	// re-submit of this form carries the same key and replays, with no second write.
	const key = formData.get("idempotencyKey");
	const outcome = await recordSettlement(
		{
			groupId: formData.get("groupId"),
			fromUserId: formData.get("fromUserId"),
			toUserId: formData.get("toUserId"),
			amount: formData.get("amount"),
		},
		{ id: session.user.id },
		typeof key === "string" && key !== "" ? key : null,
	);
	return outcome.result;
}
