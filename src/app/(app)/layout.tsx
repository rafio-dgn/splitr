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

import { AccountMenu } from "@/components/account-menu";
import { Logo } from "@/components/logo";
import { MainNav, MobileNav } from "@/components/nav";
import { Toaster } from "@/components/toaster";
import { readFlash } from "@/lib/flash";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
	// Redirects to /login when there is no session. Nothing below renders.
	const session = await requireSession();
	// A confirmation carried across the last redirect (lib/flash.ts). Read here,
	// on the server, so the toast arrives in the HTML rather than by a fetch.
	const flash = await readFlash();

	return (
		<div className="flex min-h-full flex-1 flex-col">
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas"
			>
				Skip to content
			</a>
			<header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
				<div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-4 md:px-6">
					<Link href="/groups" aria-label="Splitr, your groups" className="rounded-lg">
						<Logo size="sm" />
					</Link>
					{/* Groups and Search, with the active one marked. The Search link
					    here was the only way in to search until 2026-09-28 (REQ-D.4),
					    and the E2E still reaches it through `header a[href="/search"]`. */}
					<MainNav />
					<div className="flex-1" />
					{/* The account menu (a native <details>, closed on an outside tap
					    or Esc by components/account-menu.tsx). */}
					<AccountMenu id={session.user.id} name={session.user.name} email={session.user.email} />
				</div>
			</header>
			{/* Bottom padding on phones reserves the tab bar's height, so it never
			    covers the last row of content. */}
			<main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-28 md:px-6 md:pt-10 md:pb-16">
				{children}
			</main>
			<MobileNav />
			<Toaster initial={flash} />
		</div>
	);
}
