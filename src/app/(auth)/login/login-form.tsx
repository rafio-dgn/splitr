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
			<label className="flex flex-col gap-1 text-sm">
				Email
				<input
					name="email"
					type="email"
					autoComplete="email"
					required
					disabled={busy}
					className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
				/>
			</label>

			<label className="flex flex-col gap-1 text-sm">
				Password
				<input
					name="password"
					type="password"
					autoComplete="current-password"
					required
					disabled={busy}
					className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
				/>
			</label>

			{error !== null ? (
				<p role="alert" className="text-sm text-red-600">
					{error}
				</p>
			) : null}

			<button
				type="submit"
				disabled={busy}
				className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
			>
				{busy ? "Logging in…" : "Log in"}
			</button>
		</form>
	);
}
