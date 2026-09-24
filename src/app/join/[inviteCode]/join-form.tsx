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
 * Two steps, in order: Better Auth's browser client signs the visitor up
 * (which sets the session cookie), then `joinGroupAction` writes the
 * membership row server-side and redirects to the group. The membership is
 * never the client's claim: the action re-checks the invite code itself.
 */

import Link from "next/link";
import { useState } from "react";

import { signUp } from "@/lib/auth-client";

import { joinGroupAction, type JoinOutcome } from "./actions";

/** The failures `joinGroupAction` can come back with, in words (§5.2). */
function joinFailureMessage(outcome: JoinOutcome): string {
	return outcome.status === "invalid-invite"
		? "This invite isn't valid any more. Ask whoever sent it for a fresh link."
		: "We couldn't add you to the group. Try again.";
}

/**
 * For someone already signed in who isn't a member yet (§4.4). The fixture
 * made this case impossible, and real membership makes it the common one.
 */
export function JoinAsMember({ inviteCode, groupName }: { inviteCode: string; groupName: string }) {
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	return (
		<div className="flex flex-col gap-3">
			<button
				type="button"
				disabled={busy}
				onClick={async () => {
					setBusy(true);
					setError(null);
					// Success is a server-side redirect; only failures return.
					const outcome = await joinGroupAction(inviteCode);
					setBusy(false);
					setError(joinFailureMessage(outcome));
				}}
				className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
			>
				{busy ? "Joining…" : `Join ${groupName}`}
			</button>
			{error !== null ? (
				<p role="alert" className="text-sm text-red-600">
					{error}
				</p>
			) : null}
		</div>
	);
}

export function JoinForm({
	inviteCode,
	groupName,
}: {
	inviteCode: string;
	groupName: string;
}) {
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
								? `That email already has a Splitr account. Log in, then open this invite link again to join ${groupName}.`
								: "We couldn't complete the join. Nothing was created — try again.",
						);
						return;
					}

					// Signed up, so the session cookie is set. Now the membership, server-side.
					// On success the action redirects to the group (§4.4: `?joined=1` shows
					// the one-line confirmation); only a failure returns here.
					const outcome = await joinGroupAction(inviteCode);
					setBusy(false);
					setError(joinFailureMessage(outcome));
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
