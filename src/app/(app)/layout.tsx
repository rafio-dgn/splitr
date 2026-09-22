/**
 * The `(app)` route group — everything behind a session.
 *
 * `REQ-B.5`'s "route gating" lives here, in a layout, deliberately not in edge
 * middleware: middleware runs before the segment and would need extra
 * configuration to do a database-backed session check, and a redirect there is a
 * weaker guarantee than one co-located with the render.
 *
 * The gate is not a substitute for checking in the Server Action and the Route
 * Handler. Both do their own `getSession()`, because both are reachable without
 * ever rendering this layout.
 *
 * `(app)` is in parentheses, so it is a **route group**: it contributes no URL
 * segment. `/groups` is `/groups`, not `/app/groups`. That is why the one file
 * below gates every authenticated screen in the tree (`REQ-B.1`).
 *
 * Extended by the frontend agent for the route tree; the `requireSession()` gate
 * on the first line of the body is the original and is the single chokepoint.
 */
import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
	// Redirects to /login when there is no session. Nothing below renders.
	const session = await requireSession();

	return (
		<div className="flex min-h-full flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
			<header className="border-b border-zinc-200 dark:border-zinc-800">
				<div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-6 py-4">
					<div className="flex items-baseline gap-6">
						<Link
							href="/groups"
							className="text-lg font-semibold tracking-tight"
						>
							Splitr
						</Link>
						<Link
							href="/groups"
							className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
						>
							Your groups
						</Link>
					</div>
					<div className="flex items-center gap-4 text-sm">
						<span className="hidden text-zinc-500 sm:inline">
							{session.user.email}
						</span>
						<SignOutButton />
					</div>
				</div>
			</header>
			<main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
				{children}
			</main>
		</div>
	);
}
