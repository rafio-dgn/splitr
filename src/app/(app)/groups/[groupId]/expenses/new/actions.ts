"use server";

/**
 * The form's entry point into the one validation path (ADR-0010).
 *
 * Like the Route Handler beside it, this file holds **no rules**. It reads the
 * FormData, checks there is a session, and delegates. Everything that decides
 * whether the expense is acceptable lives in `addExpense`, which is why curling
 * the Route Handler proves something about this form.
 */

import {
	addExpense,
	type AddExpenseResult,
} from "@/lib/expenses/add-expense";
import { requireSession } from "@/lib/session";

export type AddExpenseFormState = { status: "idle" } | AddExpenseResult;

export async function addExpenseAction(
	_previous: AddExpenseFormState,
	formData: FormData,
): Promise<AddExpenseFormState> {
	// A Server Action is a public POST endpoint, reachable without the form.
	// Next.js 16's own guidance: "Treat every action as an untrusted entry
	// point." So it authenticates for itself rather than trusting the page.
	const session = await requireSession();

	// `FormData` values are `string | File`. They are handed over as `unknown`
	// and narrowed by the shared schema — not cast here.
	const input = {
		groupId: formData.get("groupId"),
		description: formData.get("description"),
		amount: formData.get("amount"),
		currency: formData.get("currency"),
		spentAt: formData.get("spentAt"),
		paidById: formData.get("paidById"),
		participantIds: formData.getAll("participantIds"),
	};

	return addExpense(input, {
		id: session.user.id,
		email: session.user.email,
	});
}
