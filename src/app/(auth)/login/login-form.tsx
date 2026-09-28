"use client";

/**
 * Log in — one library call, no credential handling of our own (`REQ-B.5`).
 *
 * The error message is deliberately the same whether the email is unknown or the
 * password is wrong; distinguishing them tells an attacker which emails have
 * accounts. Better Auth already answers this way — we just do not "improve" it.
 *
 * **Why a Client Component:** the submitting flag and the error message are its
 * state, and `signIn.email` is a browser call.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PasswordInput } from "@/components/password-input";
import { Spinner, buttonClass, errorTextClass, inputClass, labelClass } from "@/components/ui";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={async (event) => {
				event.preventDefault();
				setError(null);
				setBusy(true);

				const form = new FormData(event.currentTarget);
				const result = await signIn.email({
					email: String(form.get("email") ?? ""),
					password: String(form.get("password") ?? ""),
				});

				setBusy(false);
				if (result.error) {
					setError("That email and password don't match an account.");
					return;
				}
				router.replace("/groups");
				router.refresh();
			}}
		>
			<label className={`flex flex-col gap-1.5 ${labelClass}`}>
				Email
				<input
					name="email"
					type="email"
					autoComplete="email"
					required
					disabled={busy}
					className={inputClass}
				/>
			</label>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="password" className={labelClass}>
					Password
				</label>
				<PasswordInput id="password" autoComplete="current-password" disabled={busy} />
			</div>

			{error !== null ? (
				<p role="alert" className={errorTextClass}>
					{error}
				</p>
			) : null}

			<button
				type="submit"
				disabled={busy}
				className={`mt-1 w-full ${buttonClass({ size: "lg" })}`}
			>
				{busy ? <Spinner /> : null}
				{busy ? "Logging in…" : "Log in"}
			</button>
		</form>
	);
}
