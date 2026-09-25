"use client";

/**
 * The settle-up form and its four outcomes (`screens-cluster-b.md` §6).
 *
 * A Client Component, because it owns the pending state and shows the outcome
 * in place. The balances and the prefill were computed on the server; nothing
 * here fetches.
 *
 * §6's rules, binding on this file:
 *   - Submitting is blocking: the button is disabled and reads "Recording…".
 *     The contested write is two taps, and the UI mustn't add a third.
 *   - "Already settled" is **not** an error: neutral styling, it names who and
 *     when, and it states the balance after the fact. "Something went wrong" is
 *     forbidden there.
 *   - Only "couldn't reach the ledger" is an error, and it says plainly that
 *     nothing happened.
 */
import Link from "next/link";
import { useActionState } from "react";

import { formatGbp } from "@/lib/money";

import { recordSettlementAction, type SettleFormState } from "./actions";

interface Party {
	readonly id: string;
	readonly name: string;
}

const initialState: SettleFormState = { status: "idle" };

function timeOf(unixSeconds: number): string {
	return new Date(unixSeconds * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function SettleForm({
	groupId,
	groupName,
	payers,
	recipients,
	defaultFromId,
	defaultToId,
	defaultAmount,
	idempotencyKey,
}: {
	groupId: string;
	groupName: string;
	payers: readonly Party[];
	recipients: readonly Party[];
	defaultFromId: string;
	defaultToId: string;
	/** "40.00", prefilled with what's owed. */
	defaultAmount: string;
	/** Minted when the page rendered: this form's one intent (ADR-0023 §3, REQ-E.2). */
	idempotencyKey: string;
}) {
	const [state, formAction, pending] = useActionState(recordSettlementAction, initialState);
	const back = (
		<Link href={`/groups/${groupId}`} className="text-sm font-medium underline underline-offset-4">
			Back to {groupName}
		</Link>
	);

	// (a) Settled.
	if (state.status === "settled") {
		return (
			<section role="status" className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
				<h2 className="text-lg font-semibold">Settled: {formatGbp(state.amountMinorUnits)}</h2>
				<p className="text-sm">
					{state.payerNowOwes > 0
						? `${state.payerName} now owes ${formatGbp(state.payerNowOwes)}.`
						: `${state.payerName}'s debt is cleared.`}
				</p>
				{back}
			</section>
		);
	}

	// (b) Refused because the payer no longer owes: the duplicate. Not an error.
	if (state.status === "already-settled") {
		return (
			<section role="status" className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
				<h2 className="text-lg font-semibold">Already settled</h2>
				{state.lastPayment !== null ? (
					<p className="text-sm">
						{state.lastPayment.recordedByName} recorded{" "}
						{state.lastPayment.recordedByName === state.payerName ? "a" : `${state.payerName}'s`} payment of{" "}
						{formatGbp(state.lastPayment.amountMinorUnits)} to {state.lastPayment.toName} at{" "}
						{timeOf(state.lastPayment.createdAt)}. We didn&rsquo;t record yours, so it isn&rsquo;t counted twice.
					</p>
				) : (
					<p className="text-sm">We didn&rsquo;t record this, so nothing is counted twice.</p>
				)}
				<p className="text-sm font-medium">{state.payerName} owes {formatGbp(0)}.</p>
				{back}
			</section>
		);
	}

	const fieldError = (name: "fromUserId" | "toUserId" | "amount"): string | undefined =>
		state.status === "invalid" ? state.fieldErrors[name]?.[0] : undefined;

	return (
		<form action={formAction} className="flex flex-col gap-4">
			<input type="hidden" name="groupId" value={groupId} />
			<input type="hidden" name="idempotencyKey" value={idempotencyKey} />
			<label className="flex flex-col gap-1 text-sm">
				Who paid
				<select name="fromUserId" defaultValue={defaultFromId} disabled={pending} className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
					{payers.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name}
						</option>
					))}
				</select>
				{fieldError("fromUserId") ? <span className="text-xs text-red-600">{fieldError("fromUserId")}</span> : null}
			</label>
			<label className="flex flex-col gap-1 text-sm">
				Paid to
				<select name="toUserId" defaultValue={defaultToId} disabled={pending} className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
					{recipients.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name}
						</option>
					))}
				</select>
				{fieldError("toUserId") ? <span className="text-xs text-red-600">{fieldError("toUserId")}</span> : null}
			</label>
			<label className="flex flex-col gap-1 text-sm">
				Amount (£)
				<input name="amount" inputMode="decimal" defaultValue={defaultAmount} disabled={pending} className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" />
				{fieldError("amount") ? <span className="text-xs text-red-600">{fieldError("amount")}</span> : null}
			</label>

			{/* (c) More than is owed: a correction, not a failure. */}
			{state.status === "exceeds" ? (
				<p role="status" className="text-sm">
					That&rsquo;s more than can be settled between {state.payerName} and {state.toName}. Enter{" "}
					{formatGbp(state.maxMinorUnits)} or less.
				</p>
			) : null}
			{state.status === "recipient-not-owed" ? (
				<p role="status" className="text-sm">
					{state.toName} isn&rsquo;t owed anything right now, so there&rsquo;s nothing to pay them.
				</p>
			) : null}
			{state.status === "invalid" && state.formErrors.length > 0 ? (
				<p role="alert" className="text-sm text-red-600">
					{state.formErrors[0]}
				</p>
			) : null}
			{/* (d) The only genuine error, and it says nothing happened. */}
			{state.status === "failed" ? (
				<p role="alert" className="text-sm text-red-600">
					We couldn&rsquo;t record that. Nothing was saved and no balance changed. Check with each other before
					trying again, so the payment isn&rsquo;t recorded twice.
				</p>
			) : null}

			<button type="submit" disabled={pending} className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
				{pending ? "Recording…" : "Record this settlement"}
			</button>
		</form>
	);
}
