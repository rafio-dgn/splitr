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

import { Icon } from "@/components/icons";
import {
	Banner,
	Spinner,
	buttonClass,
	errorTextClass,
	inputClass,
	labelClass,
} from "@/components/ui";
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
		<Link href={`/groups/${groupId}`} className={`self-start ${buttonClass({ variant: "secondary", size: "sm" })}`}>
			<Icon name="arrowLeft" className="size-4" />
			Back to {groupName}
		</Link>
	);

	// (a) Settled.
	if (state.status === "settled") {
		return (
			<section role="status" className="flex max-w-xl flex-col gap-4">
				<Banner tone="success" title={`Settled: ${formatGbp(state.amountMinorUnits)}`}>
				<p>
					{state.payerNowOwes > 0
						? `${state.payerName} now owes ${formatGbp(state.payerNowOwes)}.`
						: `${state.payerName}'s debt is cleared.`}
				</p>
				</Banner>
				{back}
			</section>
		);
	}

	// (b) Refused because the payer no longer owes: the duplicate. Not an error.
	if (state.status === "already-settled") {
		return (
			<section role="status" className="flex max-w-xl flex-col gap-4">
				{/* §6: not an error. Neutral styling, it names who and when, and it
				    states the balance after the fact. */}
				<Banner tone="neutral" title="Already settled">
				{state.lastPayment !== null ? (
					<p>
						{state.lastPayment.recordedByName} recorded{" "}
						{state.lastPayment.recordedByName === state.payerName ? "a" : `${state.payerName}'s`} payment of{" "}
						{formatGbp(state.lastPayment.amountMinorUnits)} to {state.lastPayment.toName} at{" "}
						{timeOf(state.lastPayment.createdAt)}. We didn&rsquo;t record yours, so it isn&rsquo;t counted twice.
					</p>
				) : (
					<p>We didn&rsquo;t record this, so nothing is counted twice.</p>
				)}
				<p className="mt-1 font-semibold">{state.payerName} owes {formatGbp(0)}.</p>
				</Banner>
				{back}
			</section>
		);
	}

	const fieldError = (name: "fromUserId" | "toUserId" | "amount"): string | undefined =>
		state.status === "invalid" ? state.fieldErrors[name]?.[0] : undefined;

	return (
		<form action={formAction} className="flex max-w-xl flex-col gap-4">
			<input type="hidden" name="groupId" value={groupId} />
			<input type="hidden" name="idempotencyKey" value={idempotencyKey} />
			<label className={`flex flex-col gap-1.5 ${labelClass}`}>
				Who paid
				<select name="fromUserId" defaultValue={defaultFromId} disabled={pending} className={inputClass}>
					{payers.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name}
						</option>
					))}
				</select>
				{fieldError("fromUserId") ? <span className={errorTextClass}>{fieldError("fromUserId")}</span> : null}
			</label>
			<label className={`flex flex-col gap-1.5 ${labelClass}`}>
				Paid to
				<select name="toUserId" defaultValue={defaultToId} disabled={pending} className={inputClass}>
					{recipients.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name}
						</option>
					))}
				</select>
				{fieldError("toUserId") ? <span className={errorTextClass}>{fieldError("toUserId")}</span> : null}
			</label>
			<label className={`flex flex-col gap-1.5 ${labelClass}`}>
				Amount (£)
				<span className="relative">
					<span aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-display text-lg font-semibold text-muted">
						£
					</span>
					<input name="amount" inputMode="decimal" defaultValue={defaultAmount} disabled={pending} className={`${inputClass} h-14 pl-8 font-display text-xl font-semibold tabular-nums`} />
				</span>
				{fieldError("amount") ? <span className={errorTextClass}>{fieldError("amount")}</span> : null}
			</label>

			{/* (c) More than is owed: a correction, not a failure. */}
			{state.status === "exceeds" ? (
				<Banner role="status" tone="reminder" icon="info">
					That&rsquo;s more than can be settled between {state.payerName} and {state.toName}. Enter{" "}
					{formatGbp(state.maxMinorUnits)} or less.
				</Banner>
			) : null}
			{state.status === "recipient-not-owed" ? (
				<Banner role="status" tone="reminder" icon="info">
					{state.toName} isn&rsquo;t owed anything right now, so there&rsquo;s nothing to pay them.
				</Banner>
			) : null}
			{state.status === "invalid" && state.formErrors.length > 0 ? (
				<p role="alert" className={errorTextClass}>
					{state.formErrors[0]}
				</p>
			) : null}
			{/* (e) REQ-F.1: too many settle-up attempts in a minute. Nothing was read or written. */}
			{state.status === "rate-limited" ? (
				<Banner role="alert" tone="danger">
					That&rsquo;s a lot of settle-up attempts in a short time. Nothing was recorded. Wait a minute, then try
					again.
				</Banner>
			) : null}
			{/* (d) The only genuine error, and it says nothing happened. */}
			{state.status === "failed" ? (
				<Banner role="alert" tone="danger">
					We couldn&rsquo;t record that. Nothing was saved and no balance changed. Check with each other before
					trying again, so the payment isn&rsquo;t recorded twice.
				</Banner>
			) : null}

			<button
				type="submit"
				disabled={pending}
				aria-busy={pending}
				className={`mt-2 w-full sm:w-auto sm:self-start ${buttonClass({ size: "lg" })}`}
			>
				{pending ? <Spinner /> : null}
				{pending ? "Recording…" : "Record this settlement"}
			</button>
		</form>
	);
}
