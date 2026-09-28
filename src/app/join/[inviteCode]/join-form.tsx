"use client";

/**
 * The join form (§4.4, §5.2).
 *
 * **Why it is a Client Component:** it owns the submitting flag and the
 * whole-form error message, and it calls Better Auth's browser client. Its
 * parent page — the invite resolution, the group name, the member count — is
 * server-rendered; only this form ships.
 *
 * **Turnstile** (§4.4, REQ-F.2, ADR-0030): the widget sits between the last
 * field and the submit button, and its token is verified inside the Server
 * Action. The button waits for a token; a token is single-use, so the widget
 * resets after every attempt.
 *
 * Two steps, in order: Better Auth's browser client signs the visitor up
 * (which sets the session cookie), then `joinGroupAction` writes the
 * membership row server-side and redirects to the group. The membership is
 * never the client's claim: the action re-checks the invite code itself.
 */

import Link from "next/link";
import { useState } from "react";

import { TurnstileWidget } from "@/components/turnstile-widget";
import { Spinner, buttonClass, errorTextClass, hintClass, inputClass, labelClass } from "@/components/ui";
import { signUp } from "@/lib/auth-client";

import { joinGroupAction, type JoinOutcome } from "./actions";

/** The failures `joinGroupAction` can come back with, in words (§5.2). */
function joinFailureMessage(outcome: JoinOutcome): string {
	switch (outcome.status) {
		case "invalid-invite":
			return "This invite isn't valid any more. Ask whoever sent it for a fresh link.";
		case "not-verified":
			return "We couldn't confirm you're human. Complete the check above, then try again.";
		case "verification-unavailable":
			return "We couldn't run the human check just now. Nothing was changed — try again in a moment.";
		case "failed":
			return "We couldn't add you to the group. Try again.";
	}
}

/**
 * For someone already signed in who isn't a member yet (§4.4). The fixture
 * made this case impossible, and real membership makes it the common one.
 */
export function JoinAsMember({ inviteCode, groupName, turnstileSiteKey }: { inviteCode: string; groupName: string; turnstileSiteKey: string }) {
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const [resetKey, setResetKey] = useState(0);
	return (
		<div className="flex flex-col gap-3">
			<TurnstileWidget siteKey={turnstileSiteKey} onToken={setToken} resetKey={resetKey} />
			<button
				type="button"
				disabled={busy || token === null}
				onClick={async () => {
					setBusy(true);
					setError(null);
					// Success is a server-side redirect; only failures return.
					const outcome = await joinGroupAction(inviteCode, token);
					setBusy(false);
					setResetKey((k) => k + 1);
					setError(joinFailureMessage(outcome));
				}}
				className={`mt-1 w-full ${buttonClass({ size: "lg" })}`}
			>
				{busy ? <Spinner /> : null}
				{busy ? "Joining…" : `Join ${groupName}`}
			</button>
			{error !== null ? (
				<p role="alert" className={errorTextClass}>
					{error}
				</p>
			) : null}
		</div>
	);
}

export function JoinForm({
	inviteCode,
	groupName,
	turnstileSiteKey,
}: {
	inviteCode: string;
	groupName: string;
	turnstileSiteKey: string;
}) {
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const [resetKey, setResetKey] = useState(0);

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
					const outcome = await joinGroupAction(inviteCode, token);
					setBusy(false);
					setResetKey((k) => k + 1);
					setError(joinFailureMessage(outcome));
				}}
			>
				<label className={`flex flex-col gap-1.5 ${labelClass}`}>
					Your name
					<input
						name="name"
						autoComplete="name"
						required
						disabled={busy}
						className={inputClass}
					/>
				</label>

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

				<label className={`flex flex-col gap-1.5 ${labelClass}`}>
					Password
					<input
						name="password"
						type="password"
						autoComplete="new-password"
						required
						minLength={12}
						disabled={busy}
						className={inputClass}
					/>
					<span className={`font-normal ${hintClass}`}>At least 12 characters.</span>
				</label>

				{/* REQ-F.2: between the last field and the submit button (§4.4). */}
				<TurnstileWidget siteKey={turnstileSiteKey} onToken={setToken} resetKey={resetKey} />

				{error !== null ? (
					<p role="alert" className={errorTextClass}>
						{error}
					</p>
				) : null}

				<button
					type="submit"
					disabled={busy || token === null}
					className={`mt-1 w-full ${buttonClass({ size: "lg" })}`}
				>
					{busy ? <Spinner /> : null}
					{busy ? "Joining…" : `Join ${groupName}`}
				</button>
			</form>

			<p className="text-center text-sm text-muted">
				Already have a Splitr account?{" "}
				<Link href="/login" className="font-semibold text-primary-ink underline underline-offset-4">
					Log in to join.
				</Link>
			</p>
		</>
	);
}
