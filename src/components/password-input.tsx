"use client";

/**
 * A password field with a show / hide toggle.
 *
 * A Client Component for one piece of state: whether the password is visible.
 * The field is still a plain `<input name="password">` inside the form, so the
 * forms read it from `FormData` exactly as before.
 *
 * The toggle is `type="button"` (it must never submit the form) and exposes its
 * state with `aria-pressed`. Give the field a visible `<label htmlFor={id}>`
 * *outside* this component: a button nested inside a `<label>` would add "Show
 * password" to the field's accessible name.
 */

import { useState } from "react";

import { Icon } from "./icons";
import { inputClass } from "./ui";

export function PasswordInput({
	id,
	autoComplete,
	minLength,
	disabled,
	describedBy,
}: {
	id: string;
	autoComplete: "current-password" | "new-password";
	minLength?: number;
	disabled?: boolean;
	describedBy?: string;
}) {
	const [visible, setVisible] = useState(false);
	return (
		<span className="relative block">
			<input
				id={id}
				name="password"
				type={visible ? "text" : "password"}
				autoComplete={autoComplete}
				required
				minLength={minLength}
				disabled={disabled}
				aria-describedby={describedBy}
				className={`${inputClass} pr-12`}
			/>
			<button
				type="button"
				onClick={() => setVisible((v) => !v)}
				aria-pressed={visible}
				aria-label={visible ? "Hide password" : "Show password"}
				aria-controls={id}
				disabled={disabled}
				className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed"
			>
				<Icon name={visible ? "eyeOff" : "eye"} />
			</button>
		</span>
	);
}
