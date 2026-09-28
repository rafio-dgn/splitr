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

import { getDb } from "@/db";
import { expense as expenseTable, expenseShare, lineItem } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getGroupForViewer, isMember } from "@/lib/groups/membership";
import { newId } from "@/lib/ids";
import { checkUploadedReceipt } from "@/lib/receipts/receipts";

import { categoriseExpense } from "@/lib/categorise/categorise-expense";
import { indexExpense } from "@/lib/search/index-expense";

import { forgetRecentDescriptions } from "./recent-descriptions";
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
			readonly expenseId: string;
			readonly expense: AddExpense;
			readonly shares: readonly ExpenseShare[];
			/** Always `true` from Cluster D: `accepted` is returned only after D1 confirmed the write. */
			readonly persisted: true;
	  }
	| {
			readonly status: "invalid";
			readonly fieldErrors: FieldErrors;
			readonly formErrors: readonly string[];
	  }
	| { readonly status: "not-found" }
	/** D1 refused or was unreachable. Nothing was written: the batch is all-or-nothing. */
	| { readonly status: "failed" };


/**
 * Validates and records an expense.
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
	if (expense.currency !== group.currency) {
		// ADR-0018 §4: one currency per group. It can't be a SQL CHECK,
		// because the group's currency lives in another row.
		fieldErrors.currency = [`This group uses ${group.currency}.`];
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

	// 3b. The receipt, if any (ADR-0020). Only a key is ever sent. The object
	//     must be under *this* group's prefix, must exist, and must be an
	//     allowed type and size, all checked through the R2 binding. A failing
	//     upload is deleted by the check, and nothing is saved.
	if (expense.receiptKey !== undefined) {
		const receipt = await checkUploadedReceipt(group.id, expense.receiptKey);
		if (!receipt.ok) {
			audit({
				actor: actor.id,
				action: "expense.add",
				target: group.id,
				outcome: `rejected:receipt-${receipt.reason}`,
				persisted: false,
			});
			return {
				status: "invalid",
				fieldErrors: {
					receiptKey: [
						receipt.reason === "too-large"
							? "That photo is over 10 MB. Try a smaller one."
							: receipt.reason === "wrong-type"
								? "Receipts must be a JPEG, PNG or WebP photo."
								: "That photo didn't finish uploading. Attach it again.",
					],
				},
				formErrors: [],
			};
		}
	}

	// 4. The split is derived here and never accepted from the client.
	const shares = equalShares(expense.amount, expense.participantIds);

	// 5. The write. The expense and its shares go in one D1 batch, which D1 runs
	//    as a single transaction, so there's never an expense without its
	//    shares, which would silently unbalance the group.
	const expenseId = newId("exp");
	// Ids are chosen before the write, so the same ids key the search vectors.
	const items = (expense.lineItems ?? []).map((item) => ({ ...item, id: newId("li") }));
	try {
		const db = await getDb();
		await db.batch([
			db.insert(expenseTable).values({
				id: expenseId,
				groupId: group.id,
				description: expense.description,
				amountCents: expense.amount,
				currency: expense.currency,
				spentOn: expense.spentAt,
				paidBy: expense.paidById,
				createdBy: actor.id,
				// Only the key is persisted, never the bytes (REQ-D.3).
				receiptKey: expense.receiptKey ?? null,
			}),
			db.insert(expenseShare).values(
				shares.map((share) => ({
					expenseId,
					userId: share.userId,
					shareCents: share.shareMinorUnits,
				})),
			),
			// Line items from a confirmed receipt draft, in the same batch, so the
			// expense and its items land together or not at all. Each one starts
			// `uncategorised` (the schema default) until step 9 below labels it.
			...items.map((item, position) =>
				db.insert(lineItem).values({
					id: item.id,
					expenseId,
					position,
					description: item.description,
					rawText: item.rawText,
					amountCents: item.amountMinorUnits,
				}),
			),
		]);
	} catch (error) {
		audit({
			actor: actor.id,
			action: "expense.add",
			target: group.id,
			outcome: `error:${String(error).slice(0, 120)}`,
			persisted: false,
		});
		return { status: "failed" };
	}

	// 6. Only now, after D1 has confirmed it, does the audit line say persisted.
	audit({
		actor: actor.id,
		action: "expense.add",
		target: expenseId,
		outcome: "accepted",
		persisted: true,
		detail: {
			group: group.id,
			amountMinorUnits: expense.amount,
			currency: expense.currency,
			participants: expense.participantIds.length,
			lineItems: expense.lineItems?.length ?? 0,
		},
	});

	// 7. The KV autofill list is now out of date (ADR-0019). It's dropped after
	//    the response, so this save doesn't wait on KV, and a KV failure can't
	//    fail it: the write above is already durable.
	await forgetRecentDescriptions(group.id).catch(() => undefined);

	// 8. Search vectors (REQ-D.4, ADR-0022), after the response too. A failure
	//    here leaves the expense unsearchable, never unsaved.
	await indexExpense({
		id: expenseId,
		groupId: group.id,
		description: expense.description,
		items: items.map((item) => ({ id: item.id, description: item.description })),
	}).catch(() => undefined);

	// 9. Categorise the line items (REQ-E.4, ADR-0025), after the response as
	//    well. A failure leaves them `uncategorised` for the nightly backfill.
	await categoriseExpense({
		actorId: actor.id,
		groupId: group.id,
		expenseId,
		items: items.map((item) => ({ id: item.id, description: item.description })),
	}).catch(() => undefined);

	return { status: "accepted", expenseId, expense, shares, persisted: true };
}
