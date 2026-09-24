"use client";

/**
 * The client half of `REQ-B.2` — the **fifth criterion**: "the client validates
 * against the shared schema and shows per-field errors."
 *
 * It imports `parseAddExpense` and `equalShares` from `@/lib/schemas/expense` —
 * **the same module** the Server Action and the Route Handler import, not a copy
 * of it. That shared import *is* the requirement; everything else here is
 * presentation. Client validation is UX and nothing more: every rule it applies
 * is applied again by `addExpense()`, which is what the curl evidence in
 * `wiki/evidence/REQ-B.2-server-side-validation.md` demonstrates.
 *
 * **Why this has to be a Client Component**, when its page is not: it owns six
 * fields of live state, a per-field touched map, the pending flag and the focus
 * move on a failed submit. Those are hooks, and hooks need a client. It is the
 * leaf — the page, the heading and the group resolution above it all render on
 * the server, and the member list arrives as props rather than as a fetch.
 *
 * Behaviour follows `wiki/context/screens-cluster-b.md` §7.4: validate on blur,
 * then on every change once a field has errored, never on an untouched field —
 * a form that is red before it is filled is hostile.
 */

import { useActionState, useRef, useState } from "react";

import { ActionLink, EmptyState } from "@/components/ui";
import type { GroupMember } from "@/lib/groups/membership";
import { formatGbp } from "@/lib/money";
import {
	addExpenseSchema,
	equalShares,
	parseAddExpense,
	todayUtc,
	type AddExpenseInput,
	type FieldErrors,
} from "@/lib/schemas/expense";

import { addExpenseAction, type AddExpenseFormState } from "./actions";

type FieldName = keyof AddExpenseInput;

/** The order the spec lays the form out in — also the order focus falls in. */
const FIELD_ORDER: readonly FieldName[] = [
	"description",
	"amount",
	"spentAt",
	"paidById",
	"participantIds",
];

const initialState: AddExpenseFormState = { status: "idle" };

/**
 * The two fields the live "£x each" line needs — taken *from* the shared schema
 * with `.pick()`, never restated. If the amount rules change, this changes with
 * them.
 */
const MONEY_AND_SPLIT = addExpenseSchema.pick({
	amount: true,
	participantIds: true,
});

export function AddExpenseForm({
	groupId,
	groupName,
	members,
	viewerId,
}: {
	groupId: string;
	groupName: string;
	members: readonly GroupMember[];
	viewerId: string;
}) {
	const [state, formAction, pending] = useActionState(
		addExpenseAction,
		initialState,
	);

	const [values, setValues] = useState<AddExpenseInput>({
		groupId,
		description: "",
		amount: "",
		currency: "GBP",
		// The schema's own helper, so "today" means the same thing on both sides
		// of the boundary — a hand-rolled `new Date()` here could be a day out.
		spentAt: todayUtc(),
		paidById: viewerId,
		participantIds: members.map((member) => member.id),
	});
	const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
		{},
	);

	const fieldRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({});

	// One call into the shared schema; the per-field slices are read off it.
	// Note it parses `values` — the *input* type, with `amount` still the string
	// the user typed. The transform to integer minor units lives in the schema
	// and is deliberately not repeated here.
	const parsed = parseAddExpense(values);
	const clientErrors: FieldErrors = parsed.ok ? {} : parsed.fieldErrors;

	const serverErrors: FieldErrors =
		state.status === "invalid" ? state.fieldErrors : {};

	function errorFor(field: FieldName): string | undefined {
		// A server error outranks a client one: it is the authoritative answer,
		// and it can say things the client cannot check — membership, above all.
		// §7.4: from the user's side there is one validation system.
		const server = serverErrors[field]?.[0];
		if (server !== undefined) return server;
		if (touched[field] !== true) return undefined;
		return clientErrors[field]?.[0];
	}

	function update<K extends FieldName>(
		field: K,
		value: AddExpenseInput[K],
	): void {
		setValues((current) => ({ ...current, [field]: value }));
	}

	function markTouched(field: FieldName): void {
		setTouched((current) => ({ ...current, [field]: true }));
	}

	function focusFirstError(errors: FieldErrors): void {
		const first = FIELD_ORDER.find((field) => errors[field] !== undefined);
		if (first !== undefined) {
			fieldRefs.current[first]?.focus();
		}
	}

	// §7.3: "The client shows the derived figure live". It has to appear as soon
	// as the *amount* and the *participants* are valid — waiting for the whole
	// form would hide it until the description was typed, which is not what
	// "live" means. `.pick()` narrows the shared schema rather than restating two
	// of its rules here.
	const split = MONEY_AND_SPLIT.safeParse(values);
	//
	// §3: the per-person figure is the *first* share from `equalShares`, not
	// `amount / people`. The remainder penny lives on that share, and showing the
	// division instead would contradict the split the server computes.
	const perPerson = split.success
		? equalShares(split.data.amount, split.data.participantIds)[0]
				?.shareMinorUnits
		: undefined;

	const alone = members.length === 1;

	return (
		<form
			action={formAction}
			onSubmit={(event) => {
				// §7.4: on a failed submit, every field becomes touched (so nothing
				// is hidden) and the first errored one takes focus. An obviously
				// invalid form is not sent — not as a control, purely to spare the
				// round trip. The server re-checks everything regardless.
				setTouched({
					description: true,
					amount: true,
					spentAt: true,
					paidById: true,
					participantIds: true,
				});
				if (!parsed.ok) {
					event.preventDefault();
					focusFirstError(parsed.fieldErrors);
				}
			}}
			className="flex max-w-lg flex-col gap-5"
		>
			<input type="hidden" name="groupId" value={groupId} />
			{/* Not an input the user sees — the £ prefix below *is* the currency
			    field (§7.3). It is submitted so a request claiming otherwise is
			    refused rather than silently treated as pounds. */}
			<input type="hidden" name="currency" value="GBP" />

			<Field
				id="description"
				label="What was it for?"
				error={errorFor("description")}
			>
				<input
					id="description"
					name="description"
					autoFocus
					value={values.description}
					disabled={pending}
					ref={(node) => {
						fieldRefs.current.description = node;
					}}
					aria-invalid={errorFor("description") !== undefined}
					aria-describedby={
						errorFor("description") !== undefined
							? "description-error"
							: undefined
					}
					onChange={(event) => update("description", event.target.value)}
					onBlur={() => markTouched("description")}
					className="rounded-md border border-zinc-300 px-3 py-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
				/>
			</Field>

			<Field id="amount" label="Amount" error={errorFor("amount")}>
				<div className="flex items-center gap-2">
					<span aria-hidden className="text-zinc-500">
						£
					</span>
					<input
						id="amount"
						name="amount"
						inputMode="decimal"
						value={values.amount}
						disabled={pending}
						ref={(node) => {
							fieldRefs.current.amount = node;
						}}
						aria-invalid={errorFor("amount") !== undefined}
						aria-describedby={
							errorFor("amount") !== undefined ? "amount-error" : undefined
						}
						onChange={(event) => update("amount", event.target.value)}
						onBlur={() => markTouched("amount")}
						className="flex-1 rounded-md border border-zinc-300 px-3 py-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
					/>
				</div>
			</Field>

			<Field id="spentAt" label="When?" error={errorFor("spentAt")}>
				<input
					id="spentAt"
					name="spentAt"
					type="date"
					value={values.spentAt}
					disabled={pending}
					ref={(node) => {
						fieldRefs.current.spentAt = node;
					}}
					aria-invalid={errorFor("spentAt") !== undefined}
					aria-describedby={
						errorFor("spentAt") !== undefined ? "spentAt-error" : undefined
					}
					onChange={(event) => update("spentAt", event.target.value)}
					onBlur={() => markTouched("spentAt")}
					className="rounded-md border border-zinc-300 px-3 py-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
				/>
			</Field>

			<Field id="paidById" label="Who paid?" error={errorFor("paidById")}>
				<select
					id="paidById"
					name="paidById"
					value={values.paidById}
					disabled={pending}
					ref={(node) => {
						fieldRefs.current.paidById = node;
					}}
					aria-invalid={errorFor("paidById") !== undefined}
					aria-describedby={
						errorFor("paidById") !== undefined ? "paidById-error" : undefined
					}
					onChange={(event) => update("paidById", event.target.value)}
					onBlur={() => markTouched("paidById")}
					className="rounded-md border border-zinc-300 px-3 py-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
				>
					{members.map((member) => (
						<option key={member.id} value={member.id}>
							{member.name}
						</option>
					))}
				</select>
			</Field>

			{/* §5.10 — the split picker. Its member list is *not* an async surface
			    on the client: it arrives as props from the server render, so there
			    is no skeleton and no "submit disabled until the list is known"
			    state to build. The route's loading.tsx covers the wait. */}
			<fieldset
				className="flex flex-col gap-2"
				ref={(node) => {
					fieldRefs.current.participantIds = node;
				}}
				tabIndex={-1}
				aria-describedby={
					errorFor("participantIds") !== undefined
						? "participantIds-error"
						: undefined
				}
			>
				<legend className="text-sm font-medium">Split between</legend>
				{alone ? (
					<EmptyState
						title={`You're the only member of ${groupName}`}
						action={
							<ActionLink href={`/groups/${groupId}/members`}>
								Invite someone
							</ActionLink>
						}
					>
						You can still record this expense, but there&rsquo;s nobody to split
						it with yet.
					</EmptyState>
				) : (
					members.map((member) => (
						<label key={member.id} className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								name="participantIds"
								value={member.id}
								disabled={pending}
								checked={values.participantIds.includes(member.id)}
								onChange={(event) => {
									markTouched("participantIds");
									update(
										"participantIds",
										event.target.checked
											? [...values.participantIds, member.id]
											: values.participantIds.filter((id) => id !== member.id),
									);
								}}
							/>
							{member.name}
						</label>
					))
				)}
				{errorFor("participantIds") !== undefined ? (
					<p
						id="participantIds-error"
						role="alert"
						className="text-sm text-red-600"
					>
						{errorFor("participantIds")}
					</p>
				) : null}
			</fieldset>

			{perPerson !== undefined ? (
				<p className="text-sm text-zinc-500">{formatGbp(perPerson)} each.</p>
			) : null}

			{/* §5.11 — a whole-form failure. The values stay in the fields: retyping
			    an itemised expense after a failed round trip is the fastest way to
			    lose a user. */}
			{state.status === "invalid" && state.formErrors.length > 0 ? (
				<p role="alert" className="text-sm text-red-600">
					We couldn&rsquo;t save this expense. Nothing was added — your details
					are still here, try again.
				</p>
			) : null}

			<button
				type="submit"
				disabled={pending}
				className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
			>
				{pending ? "Adding…" : "Add expense"}
			</button>

			{state.status === "failed" ? (
				<p role="alert" className="text-sm text-red-600">
					We couldn&rsquo;t save that expense. Nothing was recorded and no balance
					changed. Try again.
				</p>
			) : null}
		</form>
	);
}

function Field({
	id,
	label,
	error,
	children,
}: {
	id: string;
	label: string;
	error: string | undefined;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={id} className="text-sm font-medium">
				{label}
			</label>
			{children}
			{error !== undefined ? (
				<p id={`${id}-error`} role="alert" className="text-sm text-red-600">
					{error}
				</p>
			) : null}
		</div>
	);
}
