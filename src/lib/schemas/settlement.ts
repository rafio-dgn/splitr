/**
 * The shape of "A paid B" (ADR-0018 §2), shared by the settle form and the
 * server, exactly as the expense schema is (`REQ-B.2`).
 *
 * Only the *shape* lives here. Whether A owes and B is owed is a question
 * about the ledger, answered on the server by `checkSettlement`.
 */
import { z } from "zod";

import { amountMinorUnitsField } from "./expense";

export const recordSettlementSchema = z.object({
	groupId: z.string().min(1),
	fromUserId: z.string({ error: "Choose who paid." }).min(1, { error: "Choose who paid." }),
	toUserId: z.string({ error: "Choose who was paid." }).min(1, { error: "Choose who was paid." }),
	amount: amountMinorUnitsField({
		zero: "A settlement has to be more than £0.00.",
		overLimit: "That's over the £1,000,000.00 limit.",
	}),
});

export type RecordSettlementInput = z.input<typeof recordSettlementSchema>;
export type RecordSettlement = z.output<typeof recordSettlementSchema>;
export type SettlementFieldErrors = Partial<Record<keyof RecordSettlementInput, string[]>>;

export function parseRecordSettlement(
	input: unknown,
):
	| { ok: true; value: RecordSettlement }
	| { ok: false; fieldErrors: SettlementFieldErrors; formErrors: string[] } {
	const result = recordSettlementSchema.safeParse(input);
	if (result.success) {
		return { ok: true, value: result.data };
	}
	const flat = z.flattenError(result.error);
	return { ok: false, fieldErrors: flat.fieldErrors, formErrors: flat.formErrors };
}
