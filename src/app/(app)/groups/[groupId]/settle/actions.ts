"use server";

/**
 * The settle form's entry point. It's thin (ADR-0010): it authenticates, reads
 * the `FormData` and delegates. Every rule is in `recordSettlement`.
 *
 * At E.6 this stays exactly this thin. What changes is *behind*
 * `recordSettlement`: the write goes through the Durable Object via a service
 * binding (`REQ-E.5`).
 */
import { recordSettlement, type RecordSettlementResult } from "@/lib/settlements/record-settlement";
import { requireSession } from "@/lib/session";

export type SettleFormState = { status: "idle" } | RecordSettlementResult;

export async function recordSettlementAction(_previous: SettleFormState, formData: FormData): Promise<SettleFormState> {
	const session = await requireSession();
	return recordSettlement(
		{
			groupId: formData.get("groupId"),
			fromUserId: formData.get("fromUserId"),
			toUserId: formData.get("toUserId"),
			amount: formData.get("amount"),
		},
		{ id: session.user.id },
	);
}
