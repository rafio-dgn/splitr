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

import { useActionState, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import {
	ActionLink,
	Avatar,
	Banner,
	EmptyState,
	Spinner,
	buttonClass,
	errorTextClass,
	hintClass,
	inputClass,
	labelClass,
} from "@/components/ui";
import type { GroupMember } from "@/lib/groups/membership";
import { formatGbp } from "@/lib/money";
import {
	addExpenseFields,
	equalShares,
	parseAddExpense,
	todayUtc,
	type AddExpenseInput,
	type FieldErrors,
} from "@/lib/schemas/expense";

import {
	addExpenseAction,
	readReceiptAction,
	requestReceiptUploadAction,
	type AddExpenseFormState,
} from "./actions";

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

/** The types a receipt may be (ADR-0020); the server checks them again. */
const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * The two fields the live "£x each" line needs — taken *from* the shared schema
 * with `.pick()`, never restated. If the amount rules change, this changes with
 * them.
 */
const MONEY_AND_SPLIT = addExpenseFields.pick({
	amount: true,
	participantIds: true,
});

export function AddExpenseForm({
	groupId,
	groupName,
	members,
	viewerId,
	recentDescriptions,
}: {
	groupId: string;
	groupName: string;
	members: readonly GroupMember[];
	viewerId: string;
	/** Autofill from KV (ADR-0019). Suggestions only; the field stays free text. */
	recentDescriptions: readonly string[];
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

	/**
	 * Fields the person has typed in. §7.4 says "never validate an untouched
	 * field", and `autoFocus` makes the browser blur the description without the
	 * person ever touching it: the first click anywhere below showed "Say what
	 * this was for", which moved the page mid-click and lost the click (found by
	 * the E2E, 2026-09-25). A blur now counts only once the field was edited or
	 * holds a value. A submit still marks every field. (The description lost
	 * `autoFocus` on 2026-09-28, since the receipt now comes first and a phone
	 * keyboard would cover it; the guard stays, as any blur can do the same.)
	 */
	const edited = useRef<Partial<Record<FieldName, boolean>>>({});

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

	/**
	 * The receipt photo (ADR-0020). It's separate from `values` because it
	 * isn't typed, it's uploaded: the browser gets a presigned URL, PUTs the
	 * file straight to R2, and only the resulting key joins the form.
	 */
	const [receipt, setReceipt] = useState<
		| { status: "none" }
		| { status: "uploading"; name: string }
		| { status: "attached"; key: string; name: string }
		| { status: "failed"; message: string }
	>({ status: "none" });

	/**
	 * The receipt draft (D.6, ADR-0021). Reading only ever *fills the form*: the
	 * user must tick "I've checked the total" before saving, because money
	 * needs a human (ADR-0016 §2). Items can be edited or removed; they're
	 * informational and never change who owes what.
	 */
	const [reading, setReading] = useState<
		{ status: "idle" } | { status: "reading" } | { status: "failed"; message: string }
	>({ status: "idle" });
	const [draftItems, setDraftItems] = useState<
		{ rawText: string; description: string; amountMinorUnits: number }[] | null
	>(null);
	const [totalConfirmed, setTotalConfirmed] = useState(false);

	/** A local preview of the chosen photo, as a blob: URL. Revoked when replaced or unmounted. */
	const [preview, setPreview] = useState<string | null>(null);
	useEffect(() => {
		if (preview === null) return;
		return () => URL.revokeObjectURL(preview);
	}, [preview]);
	const receiptInput = useRef<HTMLInputElement | null>(null);

	async function readAttachedReceipt(key: string): Promise<void> {
		setReading({ status: "reading" });
		const outcome = await readReceiptAction(groupId, key);
		if (!outcome.ok) {
			// The form is left exactly as it was: typing it in is the fallback.
			setReading({ status: "failed", message: outcome.message });
			return;
		}
		const { draft } = outcome;
		update("description", draft.merchant);
		update(
			"amount",
			`${Math.floor(draft.totalMinorUnits / 100)}.${String(draft.totalMinorUnits % 100).padStart(2, "0")}`,
		);
		setDraftItems(draft.items.map((item) => ({ ...item })));
		setTotalConfirmed(false);
		setReading({ status: "idle" });
	}

	async function attachReceipt(file: File): Promise<void> {
		setPreview(URL.createObjectURL(file));
		// A new photo replaces the old draft: its lines described a different receipt.
		setDraftItems(null);
		setTotalConfirmed(false);
		setReading({ status: "idle" });
		setReceipt({ status: "uploading", name: file.name });
		const grant = await requestReceiptUploadAction(groupId, file.type);
		if (!grant.ok) {
			setReceipt({ status: "failed", message: grant.message });
			return;
		}
		try {
			// Direct to R2: this request never touches Splitr's Worker. The
			// Content-Type must match the one that was signed, or R2 answers 403.
			const upload = await fetch(grant.url, {
				method: "PUT",
				headers: { "Content-Type": grant.contentType },
				body: file,
			});
			if (!upload.ok) {
				throw new Error(`R2 answered ${upload.status}`);
			}
			setReceipt({ status: "attached", key: grant.key, name: file.name });
		} catch {
			setReceipt({
				status: "failed",
				message: "The photo didn't upload. Try again, or save the expense without it.",
			});
			return;
		}
		// Read it straight away: the photo is the point of the flow, so there's no
		// separate "Read receipt" tap (2026-09-28). It spends ~70 neurons and
		// counts against the daily cap (ADR-0031); on failure the button comes back.
		await readAttachedReceipt(grant.key);
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

	/** A blur on a text field: validates it, unless it's empty and was never typed in. */
	function blurred(field: "description" | "amount"): void {
		if (values[field] === "" && edited.current[field] !== true) return;
		markTouched(field);
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

	const fileControlsDisabled = pending || receipt.status === "uploading" || reading.status === "reading";
	const [dragging, setDragging] = useState(false);

	function onReceiptChosen(event: React.ChangeEvent<HTMLInputElement>): void {
		const file = event.target.files?.[0];
		// Cleared so choosing the same file again still fires a change.
		event.target.value = "";
		if (file !== undefined) void attachReceipt(file);
	}

	/** The device picker, `input#receipt`. Rendered in one of two places, so built here once. */
	const receiptFileInput = (className: string) => (
		<input
			id="receipt"
			ref={receiptInput}
			type="file"
			accept={RECEIPT_ACCEPT}
			aria-label="Choose a receipt photo from your device"
			aria-describedby="receipt-status"
			disabled={fileControlsDisabled}
			onChange={onReceiptChosen}
			className={className}
		/>
	);

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
			className="flex max-w-xl flex-col gap-3"
		>
			<input type="hidden" name="groupId" value={groupId} />
			{/* Not an input the user sees — the £ prefix below *is* the currency
			    field (§7.3). It is submitted so a request claiming otherwise is
			    refused rather than silently treated as pounds. */}
			<input type="hidden" name="currency" value="GBP" />

			{/* The receipt comes first: it's Splitr's main way in ("Snap the bill").
			    Choosing a photo uploads it straight to R2 (ADR-0020) and then reads
			    it automatically (Raffaele's call, 2026-09-28). The read only ever
			    fills the form, and the amount must still be confirmed by a person
			    (ADR-0016 §2). A photo is optional, and a failure never blocks the
			    expense (ADR-0020 §9): typing it in below always works. */}
			<section
				aria-labelledby="receipt-heading"
				className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-rest md:p-5"
			>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h2 id="receipt-heading" className="font-display text-lg font-semibold">
							Snap the receipt
						</h2>
						<p className="text-sm text-muted">
							We read every line and fill this in for you. You check the total.
						</p>
					</div>
					<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-ink">
						<Icon name="sparkle" className="size-3.5" />
						AI
					</span>
				</div>

				{/* Two ways in, because a phone's camera-only picker (the old
				    `capture` attribute) hid the photo library and files:
				      - "Take a photo": the camera straight away. Touch devices only.
				      - "Choose from your device": library, files, and on phones the
				        OS sheet offers the camera too. This one is `input#receipt`,
				        which the E2E clicks.
				    On a desktop a file can also be dropped anywhere on the zone. */}
				<div
					onDragOver={(event) => {
						if (preview !== null || fileControlsDisabled) return;
						event.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={(event) => {
						if (preview !== null || fileControlsDisabled) return;
						event.preventDefault();
						setDragging(false);
						const file = event.dataTransfer.files[0];
						if (file !== undefined) void attachReceipt(file);
					}}
					className={`relative overflow-hidden rounded-tile ${
						preview === null
							? `border-2 border-dashed bg-surface-2 transition-colors duration-150 ${dragging ? "border-primary bg-primary-soft" : "border-line-strong"}`
							: "bg-surface-2"
					}`}
				>
					{preview === null ? (
						<div className="flex flex-col items-center gap-3 px-4 py-7 text-center">
							<span aria-hidden className="grid size-14 place-items-center rounded-2xl bg-primary text-on-primary shadow-rest">
								<Icon name="receipt" className="size-7" />
							</span>
							<span aria-hidden className="font-semibold">
								{dragging ? "Drop it here" : "Add a photo of the receipt"}
							</span>
							<div className="flex w-full flex-col items-stretch justify-center gap-2 sm:w-auto sm:flex-row">
								{/* Touch devices only. The switch is on this wrapper: on the label
								    itself, `hidden` lost to the button style's `inline-flex`. */}
								<span className="hidden pointer-coarse:flex pointer-coarse:flex-col sm:pointer-coarse:flex-row">
								<label
									className={`has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${buttonClass()}`}
								>
									<Icon name="camera" className="size-[18px]" />
									Take a photo
									<input
										type="file"
										accept={RECEIPT_ACCEPT}
										capture="environment"
										disabled={fileControlsDisabled}
										onChange={onReceiptChosen}
										className="sr-only"
									/>
								</label>
								</span>
								<span
									className={`relative has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${buttonClass({ variant: "secondary" })} pointer-fine:bg-primary pointer-fine:text-on-primary pointer-fine:border-transparent pointer-fine:hover:bg-primary-hover`}
								>
									<Icon name="upload" className="size-[18px]" />
									<span className="pointer-coarse:hidden">Choose a file</span>
									<span className="hidden pointer-coarse:inline">Choose from your device</span>
									{receiptFileInput("absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed")}
								</span>
							</div>
							<span className="max-w-xs text-[13px] text-muted">
								<span className="pointer-coarse:hidden">Or drop it here. </span>
								JPEG, PNG or WebP. It goes straight to storage, never through our servers.
							</span>
						</div>
					) : (
						<div className="flex items-center gap-4 p-3">
							<div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
								{/* A local preview of the chosen file (a blob: URL): nothing is
								    fetched to show it. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={preview} alt="The receipt you chose" className="size-full object-cover" />
								{reading.status === "reading" ? (
									<span aria-hidden className="absolute inset-x-0 top-0 h-0.5 animate-scan bg-highlight shadow-[0_0_10px_2px_var(--highlight)]" />
								) : null}
							</div>
							<div className="flex min-w-0 flex-1 flex-col gap-2">
								<ReceiptSteps
									uploaded={receipt.status === "attached"}
									reading={reading.status === "reading"}
									read={draftItems !== null}
									confirmed={totalConfirmed}
								/>
								<button
									type="button"
									onClick={() => receiptInput.current?.click()}
									disabled={fileControlsDisabled}
									className={`self-start ${buttonClass({ variant: "ghost", size: "sm" })}`}
								>
									<Icon name="camera" className="size-4" />
									Use a different photo
								</button>
							</div>
						</div>
					)}
					{/* With a photo chosen, the device picker stays mounted (hidden) for
					    "Use a different photo". */}
					{preview !== null ? receiptFileInput("sr-only") : null}
				</div>
				<input type="hidden" name="receiptKey" value={receipt.status === "attached" ? receipt.key : ""} />

				<p id="receipt-status" role="status" className={`${hintClass} empty:hidden`}>
					{receipt.status === "uploading" ? `Uploading ${receipt.name}…` : null}
					{receipt.status === "attached" ? `Attached: ${receipt.name}` : null}
					{receipt.status === "failed" ? receipt.message : null}
				</p>
				{errorFor("receiptKey") !== undefined ? (
					<p role="alert" className={errorTextClass}>
						{errorFor("receiptKey")}
					</p>
				) : null}

				{reading.status === "failed" && receipt.status === "attached" ? (
					<Banner
						role="status"
						action={
							<button
								type="button"
								disabled={pending}
								onClick={() => void readAttachedReceipt(receipt.key)}
								className={buttonClass({ variant: "secondary", size: "sm" })}
							>
								<Icon name="sparkle" className="size-4" />
								Read receipt
							</button>
						}
					>
						{reading.message} You can also type it in below.
					</Banner>
				) : null}

				{draftItems !== null ? (
					<div className="flex flex-col gap-3">
						<Banner tone="success" icon="sparkle" title="Read from the receipt">
							Check the description and, above all, the <strong>amount</strong> against the photo. The
							items are for reference only; they don&rsquo;t change the split.
						</Banner>
						<ul className="flex flex-col gap-2">
							{draftItems.map((item, index) => (
								<li key={index} className="flex flex-wrap items-center gap-2 border-t border-line pt-2 text-sm first:border-t-0 first:pt-0">
									<input
										aria-label={`Item ${index + 1}`}
										value={item.description}
										onChange={(event) =>
											setDraftItems((items) =>
												(items ?? []).map((it, i) => (i === index ? { ...it, description: event.target.value } : it)),
											)
										}
										className={`${inputClass} min-w-0 flex-1 basis-40`}
									/>
									<span className="w-20 text-right font-semibold tabular-nums">{formatGbp(item.amountMinorUnits)}</span>
									<button
										type="button"
										aria-label={`Remove item ${index + 1}`}
										onClick={() => setDraftItems((items) => (items ?? []).filter((_, i) => i !== index))}
										className={buttonClass({ variant: "ghost" })}
									>
										<Icon name="x" className="size-[18px]" />
									</button>
									{item.rawText !== item.description ? (
										<span className="basis-full pl-1 font-mono text-xs break-all text-muted">Printed as &ldquo;{item.rawText}&rdquo;</span>
									) : null}
								</li>
							))}
						</ul>
						<input
							type="hidden"
							name="lineItems"
							value={JSON.stringify(
								draftItems
									.filter((item) => item.description.trim() !== "")
									.map((item) => ({
										rawText: item.rawText,
										description: item.description.trim(),
										amountMinorUnits: item.amountMinorUnits,
									})),
							)}
						/>
						<label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-tile border border-highlight bg-highlight-soft/40 px-3 text-sm font-semibold">
							<input
								type="checkbox"
								name="amountConfirmed"
								value="yes"
								checked={totalConfirmed}
								onChange={(event) => setTotalConfirmed(event.target.checked)}
								className="size-5 shrink-0 accent-primary"
							/>
							I&rsquo;ve checked the amount against the receipt
						</label>
						{errorFor("amountConfirmed") !== undefined ? (
							<p role="alert" className={errorTextClass}>
								{errorFor("amountConfirmed")}
							</p>
						) : null}
					</div>
				) : null}
			</section>

			<div aria-hidden className="mt-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.1em] text-muted">
				<span className="h-px flex-1 bg-line" />
				{draftItems !== null ? "Check the details" : "Or type it in"}
				<span className="h-px flex-1 bg-line" />
			</div>

			<Field
				id="description"
				label="What was it for?"
				error={errorFor("description")}
				aiFilled={draftItems !== null}
			>
				<input
					id="description"
					name="description"
					list="recent-descriptions"
					autoComplete="off"
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
					onChange={(event) => {
						edited.current.description = true;
						update("description", event.target.value);
					}}
					onBlur={() => blurred("description")}
					className={inputClass}
				/>
				{/* Native suggestions: no JavaScript of ours, and a stale list only means a
				    missing suggestion (ADR-0019). */}
				<datalist id="recent-descriptions">
					{recentDescriptions.map((description) => (
						<option key={description} value={description} />
					))}
				</datalist>
			</Field>

			<Field id="amount" label="Amount" error={errorFor("amount")} aiFilled={draftItems !== null}>
				{/* The £ sits inside the field: it *is* the currency (§7.3). */}
				<div className="relative">
					<span
						aria-hidden
						className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-display text-lg font-semibold text-muted"
					>
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
						onChange={(event) => {
							edited.current.amount = true;
							update("amount", event.target.value);
						}}
						onBlur={() => blurred("amount")}
						className={`${inputClass} h-14 pl-8 font-display text-xl font-semibold tabular-nums`}
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
					className={inputClass}
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
					className={inputClass}
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
				<legend className={`mb-1 ${labelClass}`}>Split between</legend>
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
					// Each person is a 44px chip. The native checkbox is still the
					// control (it's what the form submits), just visually hidden; the
					// chip shows its state with a tick as well as colour.
					<div className="flex flex-wrap gap-2">
						{members.map((member) => (
							<label
								key={member.id}
								className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface py-1 pr-3.5 pl-1 text-sm font-semibold transition-colors duration-150 has-checked:border-primary has-checked:bg-primary-soft has-checked:text-primary-ink has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary has-disabled:opacity-60"
							>
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
									className="peer sr-only"
								/>
								<Avatar id={member.id} name={member.name} />
								{member.name}
								<Icon name="check" className="hidden size-4 peer-checked:block" />
							</label>
						))}
					</div>
				)}
				{errorFor("participantIds") !== undefined ? (
					<p
						id="participantIds-error"
						role="alert"
						className={errorTextClass}
					>
						{errorFor("participantIds")}
					</p>
				) : null}
			</fieldset>

			{perPerson !== undefined ? (
				<p className="text-sm text-muted">
					<strong className="font-semibold text-ink tabular-nums">{formatGbp(perPerson)}</strong> each.
				</p>
			) : null}

			{/* §5.11 — a whole-form failure. The values stay in the fields: retyping
			    an itemised expense after a failed round trip is the fastest way to
			    lose a user. */}
			{state.status === "invalid" && state.formErrors.length > 0 ? (
				<p role="alert" className={errorTextClass}>
					We couldn&rsquo;t save this expense. Nothing was added — your details
					are still here, try again.
				</p>
			) : null}

			<button
				type="submit"
				disabled={
					pending ||
					receipt.status === "uploading" ||
					reading.status === "reading" ||
					// Money needs a human (ADR-0016 §2): a read draft can't be saved until
					// its amount is confirmed. The server enforces this too.
					(draftItems !== null && !totalConfirmed)
				}
				aria-busy={pending}
				className={`mt-2 w-full sm:w-auto sm:self-start ${buttonClass({ size: "lg" })}`}
			>
				{pending ? <Spinner /> : null}
				{pending ? "Adding…" : "Add expense"}
			</button>

			{state.status === "failed" ? (
				<p role="alert" className={errorTextClass}>
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
	aiFilled = false,
	children,
}: {
	id: string;
	label: string;
	error: string | undefined;
	/** Filled in from a read receipt: say so, so the person knows what to check. */
	aiFilled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className={`flex items-center gap-2 ${labelClass}`}>
				{label}
				{aiFilled ? (
					<span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-ink">
						<Icon name="sparkle" className="size-3" />
						From the receipt
					</span>
				) : null}
			</label>
			{children}
			{/* The error's line is always there, empty until needed, so an error
			    appearing never moves what's below it. A move between mousedown and
			    mouseup loses the click (2026-09-25). The form's gap is smaller to
			    match. */}
			<p id={`${id}-error`} role="alert" className={`min-h-5 ${errorTextClass}`}>
				{error}
			</p>
		</div>
	);
}

/**
 * Where a receipt is in its three steps (ADR-0033 §loading). Reading takes
 * seconds, so it shows its progress instead of one spinner. Derived entirely
 * from the form's own state: it adds no new state and no request.
 */
function ReceiptSteps({
	uploaded,
	reading,
	read,
	confirmed,
}: {
	uploaded: boolean;
	reading: boolean;
	read: boolean;
	confirmed: boolean;
}) {
	const steps = [
		{ label: uploaded ? "Uploaded" : "Uploading", state: uploaded ? "done" : "now" },
		{ label: "Reading the lines", state: read ? "done" : reading ? "now" : "todo" },
		{ label: "Check the total", state: confirmed ? "done" : read ? "now" : "todo" },
	] as const;
	return (
		<ol className="flex flex-col gap-1.5 text-[13px]" aria-label="Receipt progress">
			{steps.map((step, index) => (
				<li key={step.label} className="flex items-center gap-2">
					<span
						className={`grid size-6 place-items-center rounded-full border-2 text-[11px] font-bold ${
							step.state === "done"
								? "border-primary bg-primary text-on-primary"
								: step.state === "now"
									? "border-primary text-primary-ink"
									: "border-line-strong text-muted"
						}`}
					>
						{step.state === "done" ? (
							<Icon name="check" className="size-3.5" />
						) : step.state === "now" && step.label !== "Check the total" ? (
							<Spinner className="size-3" />
						) : (
							index + 1
						)}
					</span>
					<span className={step.state === "todo" ? "text-muted" : "font-semibold"}>
						{step.label}
						<span className="sr-only">
							{step.state === "done" ? ", done" : step.state === "now" ? ", in progress" : ", to do"}
						</span>
					</span>
				</li>
			))}
		</ol>
	);
}
