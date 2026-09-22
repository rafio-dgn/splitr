"use client";

/**
 * Sign up. `REQ-B.5`: a form, one library call, and nothing else.
 *
 * **Why a Client Component:** it owns the submitting flag and the error message,
 * and Better Auth's `signUp.email` is its browser client. Note what is absent —
 * no hashing, no salt, no session creation, no cookie. The library owns all of
 * it; the password rule (12 characters) is configured in `src/lib/auth.ts`.
 *
 * Copy is §4.1 verbatim, including the two distinct failures: a taken email gets
 * a different sentence, because "try again" is useless advice to someone who
 * already has an account.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signUp } from "@/lib/auth-client";

export function RegisterForm() {
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
				const result = await signUp.email({
					name: String(form.get("name") ?? ""),
					email: String(form.get("email") ?? ""),
					password: String(form.get("password") ?? ""),
				});

				setBusy(false);
				if (result.error) {
					setError(
						result.error.code === "USER_ALREADY_EXISTS"
							? "That email already has a Splitr account. Log in instead."
							: "We couldn't create your account. Check your email and password and try again.",
					);
					return;
				}
				// §4.1: land on /groups, which is empty, so a new user meets the empty
				// state that explains what a group is.
				router.replace("/groups");
				router.refresh();
			}}
		>
			<label className="flex flex-col gap-1 text-sm">
				Your name
				<input
					name="name"
					autoComplete="name"
					required
					disabled={busy}
					className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
				/>
			</label>

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
					autoComplete="new-password"
					required
					minLength={12}
					disabled={busy}
					className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
				/>
				<span className="text-xs text-zinc-500">At least 12 characters.</span>
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
				{busy ? "Creating…" : "Create account"}
			</button>
		</form>
	);
}
