/**
 * The one server-side validation path for adding an expense.
 *
 * ADR-0010: there is exactly **one** copy of this logic and two thin entry
 * points into it —
 *
 *   - `src/app/(app)/groups/[groupId]/expenses/new/actions.ts` (the form), and
 *   - `src/app/api/groups/[groupId]/expenses/route.ts` (the `REQ-B.2` curl).
 *
 * That is what makes the curl evidence mean anything: the bytes curl sends reach
 * the same validator the browser reaches. Neither entry point may add a rule of
 * its own — if a check belongs to this operation, it belongs in this file.
 *
 * Authorisation lives here, below the routes, so a future route that forgets to
 * guard itself still cannot leak.
 */
import "server-only";

import { getGroupForViewer, isMember } from "@/lib/groups/membership";
import {
	equalShares,
	parseAddExpense,
	type AddExpense,
	type FieldErrors,
} from "@/lib/schemas/expense";

export interface Actor {
	readonly id: string;
	readonly email: string;
}

export interface ExpenseShare {
	readonly userId: string;
	readonly shareMinorUnits: number;
}

export type AddExpenseResult =
	| {
			readonly status: "accepted";
			readonly expense: AddExpense;
			readonly shares: readonly ExpenseShare[];
			/**
			 * `false` for the whole of Cluster B. There is no `expense` table until
			 * `REQ-D.1`. Saying so in the result type is cheaper than discovering it
			 * from a demo that appears to work.
			 */
			readonly persisted: false;
	  }
	| {
			readonly status: "invalid";
			readonly fieldErrors: FieldErrors;
			readonly formErrors: readonly string[];
	  }
	| { readonly status: "not-found" };

/**
 * Emits the `[AUDIT]` line required by `REQ-M.5` — one line, parseable JSON,
 * with actor, action, target, timestamp and outcome.
 *
 * `REQ-M.5` says the line follows a durable write. Cluster B has no durable
 * write, so `persisted` is reported honestly rather than the line being skipped:
 * the habit starts at the first mutation path, not at Cluster F.
 */
function audit(entry: {
	actor: string;
	action: string;
	target: string;
	outcome: string;
	persisted: boolean;
	detail?: Record<string, string | number>;
}): void {
	console.log(
		`[AUDIT] ${JSON.stringify({
			ts: Math.floor(Date.now() / 1000),
			...entry,
		})}`,
	);
}

/**
 * Validates and (from Cluster D) records an expense.
 *
 * @param rawInput Untrusted. `unknown` because on one path it is a `FormData`
 *   readout and on the other a JSON body off an open socket. It is narrowed by
 *   the shared schema before anything reads a property off it.
 */
export async function addExpense(
	rawInput: unknown,
	actor: Actor,
): Promise<AddExpenseResult> {
	// 1. Shape. The same schema the browser ran — and the only thing the browser
	//    could have run.
	const parsed = parseAddExpense(rawInput);
	if (!parsed.ok) {
		audit({
			actor: actor.id,
			action: "expense.add",
			target: "unknown",
			outcome: "rejected:invalid-shape",
			persisted: false,
			detail: { fields: Object.keys(parsed.fieldErrors).join(",") },
		});
		return {
			status: "invalid",
			fieldErrors: parsed.fieldErrors,
			formErrors: parsed.formErrors,
		};
	}

	const expense = parsed.value;

	// 2. Authorisation. A non-member gets the same answer as a non-existent
	//    group: 404, never 403 — a 403 confirms the group exists.
	const group = await getGroupForViewer(expense.groupId, actor.id);
	if (group === null) {
		audit({
			actor: actor.id,
			action: "expense.add",
			target: expense.groupId,
			outcome: "rejected:not-found",
			persisted: false,
		});
		return { status: "not-found" };
	}

	// 3. Membership. Shape-valid, semantically wrong — the check the client
	//    cannot make, because the client does not hold the membership list.
	const fieldErrors: FieldErrors = {};
	if (!isMember(group, expense.paidById)) {
		fieldErrors.paidById = [
			"That person isn't in this group. Refresh the page and pick again.",
		];
	}
	if (!expense.participantIds.every((id) => isMember(group, id))) {
		fieldErrors.participantIds = [
			"Someone selected isn't in this group any more. Refresh the page and try again.",
		];
	}
	if (Object.keys(fieldErrors).length > 0) {
		audit({
			actor: actor.id,
			action: "expense.add",
			target: group.id,
			outcome: "rejected:not-a-member",
			persisted: false,
			detail: { fields: Object.keys(fieldErrors).join(",") },
		});
		return { status: "invalid", fieldErrors, formErrors: [] };
	}

	// 4. The split is derived here and never accepted from the client.
	const shares = equalShares(expense.amount, expense.participantIds);

	// 5. Cluster D writes to D1 here, then emits the audit line after the write
	//    is durable. Until then the operation is validated and reported, not
	//    stored — see `persisted`.
	audit({
		actor: actor.id,
		action: "expense.add",
		target: group.id,
		outcome: "accepted:not-persisted-until-REQ-D.1",
		persisted: false,
		detail: {
			amountMinorUnits: expense.amount,
			currency: expense.currency,
			participants: expense.participantIds.length,
		},
	});

	return { status: "accepted", expense, shares, persisted: false };
}
