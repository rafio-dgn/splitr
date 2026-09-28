"use client";

/**
 * The create-group form (§7.2) — "also ships, not the proof".
 *
 * **Why this one is a Client Component:** it owns the field value, the touched
 * flag and the pending state of the submission. `useActionState` and `useState`
 * are hooks; hooks need a client. It is a leaf — its parent page, its heading
 * and its copy are all server-rendered.
 *
 * It imports `parseCreateGroup` from `@/lib/schemas/group` — the same module the
 * Server Action reaches through `createGroup()`. One schema, both sides, exactly
 * as `REQ-B.2` requires of the expense form; this form simply is not the one the
 * curl evidence rests on.
 */

import { useActionState, useState } from "react";

import { Spinner, buttonClass, errorTextClass, inputClass, labelClass } from "@/components/ui";
import { parseCreateGroup } from "@/lib/schemas/group";

import { createGroupAction, type CreateGroupFormState } from "./actions";

const initialState: CreateGroupFormState = { status: "idle" };

export function CreateGroupForm() {
	const [state, formAction, pending] = useActionState(
		createGroupAction,
		initialState,
	);
	const [name, setName] = useState("");
	const [touched, setTouched] = useState(false);
	// §7.4 "never validate an untouched field": the field is autofocused, so a
	// blur alone doesn't mean the person touched it. Without this, clicking
	// "Create group" first showed the error, which moved the button mid-click
	// and lost the click (the add-expense form had the same bug, 2026-09-25).
	const [edited, setEdited] = useState(false);

	const parsed = parseCreateGroup({ name });
	const clientError = parsed.ok ? undefined : parsed.fieldErrors.name?.[0];
	const serverError =
		state.status === "invalid" ? state.fieldErrors.name?.[0] : undefined;

	// §7.4: never show an error on an untouched field, and let the server's
	// answer outrank the client's — it is the authoritative one.
	const error = serverError ?? (touched ? clientError : undefined);

	return (
		<form action={formAction} className="flex flex-col gap-3">
			<div className="flex flex-col gap-1.5">
				<label htmlFor="name" className={labelClass}>
					Group name
				</label>
				<input
					id="name"
					name="name"
					autoFocus
					value={name}
					disabled={pending}
					aria-invalid={error !== undefined}
					aria-describedby={error !== undefined ? "name-error" : undefined}
					onChange={(event) => {
						setEdited(true);
						setName(event.target.value);
					}}
					onBlur={() => {
						if (edited || name !== "") setTouched(true);
					}}
					className={inputClass}
				/>
				{/* Always present, so an error appearing never moves the button. */}
				<p id="name-error" role="alert" className={`min-h-5 ${errorTextClass}`}>
					{error}
				</p>
			</div>

			{state.status === "invalid" && state.formErrors.length > 0 ? (
				<p role="alert" className={errorTextClass}>
					We couldn&rsquo;t create the group. Try again — nothing was saved.
				</p>
			) : null}

			<button
				type="submit"
				disabled={pending}
				className={`mt-1 w-full ${buttonClass({ size: "lg" })}`}
			>
				{pending ? <Spinner /> : null}
				{pending ? "Creating…" : "Create group"}
			</button>

			{state.status === "failed" ? (
				<p role="alert" className={errorTextClass}>
					We couldn&rsquo;t create the group. Nothing was saved. Try again.
				</p>
			) : null}
		</form>
	);
}
