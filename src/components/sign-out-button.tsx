"use client";

/**
 * Sign out — one call into the library, then a hard navigation so every Server
 * Component re-renders without the session. `REQ-B.5`: nothing here knows what a
 * session cookie is.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
	const router = useRouter();
	const [busy, setBusy] = useState(false);

	return (
		<button
			type="button"
			disabled={busy}
			onClick={async () => {
				setBusy(true);
				await signOut();
				router.replace("/login");
				router.refresh();
			}}
			className="rounded-full border border-zinc-300 px-3 py-1.5 font-medium hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-500"
		>
			{busy ? "Signing out…" : "Sign out"}
		</button>
	);
}
