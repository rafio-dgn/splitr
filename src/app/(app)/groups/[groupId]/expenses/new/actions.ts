"use server";

/**
 * The form's entry point into the one validation path (ADR-0010).
 *
 * Like the Route Handler beside it, this file holds **no rules**. It reads the
 * FormData, checks there is a session, and delegates. Everything that decides
 * whether the expense is acceptable lives in `addExpense`, which is why curling
 * the Route Handler proves something about this form.
 */

import { redirect } from "next/navigation";

import {
	addExpense,
	type AddExpenseResult,
} from "@/lib/expenses/add-expense";
import { audit } from "@/lib/audit";
import { getGroupForViewer } from "@/lib/groups/membership";
import type { ReceiptDraft } from "@/lib/receipts/draft";
import { readReceipt } from "@/lib/receipts/read-receipt";
import { isReceiptType, presignReceiptUpload } from "@/lib/receipts/receipts";
import { requireSession } from "@/lib/session";

/** What the form can be shown. `accepted` never reaches it: that's a redirect. */
export type AddExpenseFormState =
	| { status: "idle" }
	| Exclude<AddExpenseResult, { status: "accepted" }>;

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
		// "" when no photo was attached; `?? undefined` because a missing field is `null`.
		receiptKey: formData.get("receiptKey") ?? undefined,
		// A JSON array from the confirmed draft, or absent. Parsed here only as
		// JSON; the shared schema decides whether it's acceptable.
		lineItems: parseJsonField(formData.get("lineItems")),
		// Present only when the "I've checked the amount" box is ticked.
		amountConfirmed: formData.get("amountConfirmed") ?? undefined,
	};

	const result = await addExpense(input, {
		id: session.user.id,
		email: session.user.email,
	});
	if (result.status === "accepted") {
		// Back to the group, where the new expense is now in the feed and the
		// balances. Outside any try/catch: `redirect()` works by throwing.
		redirect(`/groups/${result.expense.groupId}`);
	}
	return result;
}

/** A form field holding JSON → the parsed value, `undefined` when absent or empty, or the raw string when it isn't JSON, so the schema refuses it. */
function parseJsonField(value: FormDataEntryValue | null): unknown {
	if (typeof value !== "string" || value === "") {
		return undefined;
	}
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

export type ReceiptUploadGrant =
	| { ok: true; key: string; url: string; contentType: string }
	| { ok: false; message: string };

/**
 * Hands the browser a presigned PUT for one receipt photo (ADR-0020). The
 * browser then uploads **straight to R2**; this action never sees the bytes.
 *
 * Membership is checked here like any write: a URL is a capability, and only a
 * member of the group may hold one for its prefix.
 */
export async function requestReceiptUploadAction(groupId: string, contentType: string): Promise<ReceiptUploadGrant> {
	const session = await requireSession();
	if (!isReceiptType(contentType)) {
		return { ok: false, message: "Receipts must be a JPEG, PNG or WebP photo." };
	}
	const group = await getGroupForViewer(groupId, session.user.id);
	if (group === null) {
		return { ok: false, message: "That group isn't available." };
	}
	try {
		const { key, url } = await presignReceiptUpload(group.id, contentType);
		audit({
			actor: session.user.id,
			action: "receipt.upload-url",
			target: key,
			outcome: "issued",
			persisted: false,
		});
		return { ok: true, key, url, contentType };
	} catch (error) {
		audit({
			actor: session.user.id,
			action: "receipt.upload-url",
			target: group.id,
			outcome: `error:${String(error).slice(0, 120)}`,
			persisted: false,
		});
		return { ok: false, message: "Photo upload isn't available right now. You can still save the expense without it." };
	}
}

export type ReadReceiptOutcome =
	| { ok: true; draft: ReceiptDraft }
	| { ok: false; message: string };

/**
 * "Read receipt" (D.6, ADR-0021): an attached photo → a **draft**. Nothing is
 * saved here, ever. The draft fills the form, and the user must confirm the
 * total before saving (ADR-0016 §2). Every failure comes back as a sentence,
 * and leaves the form exactly as it was, so the user can type the expense
 * instead (REQ-M.7).
 */
export async function readReceiptAction(groupId: string, receiptKey: string): Promise<ReadReceiptOutcome> {
	const session = await requireSession();
	const group = await getGroupForViewer(groupId, session.user.id);
	if (group === null) {
		return { ok: false, message: "That group isn't available." };
	}

	const result = await readReceipt(group.id, receiptKey);
	audit({
		actor: session.user.id,
		action: "receipt.read",
		target: receiptKey,
		outcome: result.ok ? `drafted:${result.draft.items.length}-items` : `failed:${result.reason}`,
		// A draft is never stored: nothing durable happened.
		persisted: false,
		detail: { ms: result.ms },
	});

	if (result.ok) {
		return { ok: true, draft: result.draft };
	}
	const messages = {
		"bad-photo": "That photo isn't available any more. Attach it again.",
		unreadable: "We couldn't read the total on that photo. Enter the expense yourself, or try a clearer photo.",
		timeout: "Reading the receipt took too long. Enter the expense yourself, or try again.",
		unavailable: "Receipt reading isn't available right now. Enter the expense yourself.",
	} as const;
	return { ok: false, message: messages[result.reason] };
}
