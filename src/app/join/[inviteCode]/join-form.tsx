"use client";

/**
 * The join form (§4.4, §5.2).
 *
 * **Why it is a Client Component:** it owns the submitting flag and the
 * whole-form error message, and it calls Better Auth's browser client. Its
 * parent page — the invite resolution, the group name, the member count — is
 * server-rendered; only this form ships.
 *
 * **Turnstile's position is decided now, not later** (§4.4): the widget sits
 * between the last field and the submit button, and its token is verified inside
 * the server action at `REQ-F.2`. The marker comment below is that space. There
 * is no placeholder widget, because a captcha that does not check anything is
 * worse than none.
 *
 * What this form does *not* do is create a membership row — there is no
 * membership table until `REQ-D.1`. Signing up is enough to be in the demo
 * group, which is the fixture's doing, and the redirect is honest about landing
 * the new member on the group.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signUp } from "@/lib/auth-client";

export function JoinForm({
	groupId,
	groupName,
}: {
	groupId: string;
	groupName: string;
}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	return (
		<>
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

					if (result.error) {
						setBusy(false);
						// §5.2 distinguishes the taken-email case, because "try again"
						// is useless advice to someone who already has an account.
						setError(
							result.error.code === "USER_ALREADY_EXISTS"
								? `That email already has a Splitr account. Log in instead and you'll join ${groupName}.`
								: "We couldn't complete the join. Nothing was created — try again.",
						);
						return;
					}

					// §4.4: land on the group with a one-line confirmation. The flag is
					// read server-side by the dashboard, so the confirmation costs no
					// client state.
					router.replace(`/groups/${groupId}?joined=1`);
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

				{/* REQ-F.2: the Turnstile widget goes here, between the last field and
				    the submit button. Nothing is rendered in Cluster B. */}

				{error !== null ? (
					<p role="alert" className="text-sm text-red-600">
						{error}
					</p>
				) : null}

				<button
					type="submit"
					disabled={busy}
					className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
				>
					{busy ? "Joining…" : `Join ${groupName}`}
				</button>
			</form>

			<p className="text-sm text-zinc-500">
				Already have a Splitr account?{" "}
				<Link href="/login" className="underline">
					Log in to join.
				</Link>
			</p>
		</>
	);
}
