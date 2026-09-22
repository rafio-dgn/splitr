"use client";

/**
 * Sign out — one call into the library, then a hard navigation so every Server
 * Component re-renders without the session. `REQ-B.5`: nothing here knows what a
 * session cookie is.
 *
 * **The result is checked before navigating.** `signOut()` resolves to
 * `{ data, error }` and does **not** throw, so awaiting it and redirecting
 * unconditionally reported success for every failure — the user landed on
 * `/login` with the session still live (QA finding F-1). A sign-out that lies is
 * worse than one that fails loudly, so a failure keeps the user where they are
 * and says so; `login-form.tsx`, `register-form.tsx` and `join-form.tsx` handle
 * the same `{ data, error }` shape the same way.
 *
 * `.catch()` covers the other half: a rejected promise (the request never
 * leaving the browser) must not fall through to the redirect either.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	return (
		<div className="flex items-center gap-3">
			{error !== null ? (
				<p role="alert" className="text-sm text-red-600">
					{error}
				</p>
			) : null}

			<button
				type="button"
				disabled={busy}
				onClick={async () => {
					setError(null);
					setBusy(true);

					const result = await signOut().catch(() => null);

					setBusy(false);
					if (result === null || result.error) {
						// Deliberately no redirect: the session is still live, and
						// pretending otherwise is the defect this replaced.
						setError(
							"We couldn't sign you out — you're still signed in. Try again.",
						);
						return;
					}

					router.replace("/login");
					router.refresh();
				}}
				className="rounded-full border border-zinc-300 px-3 py-1.5 font-medium hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-500"
			>
				{busy ? "Signing out…" : "Sign out"}
			</button>
		</div>
	);
}
