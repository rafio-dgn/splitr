/**
 * The `(auth)` route group — §1.
 *
 * A second route group, purely for grouping: parentheses add no URL segment, so
 * the routes stay `/login` and `/register`. It exists so the two auth pages can
 * share one narrow centred shell **without that shell leaking onto `/` or
 * `/join`**, which is what a shared `layout.tsx` higher up would have done.
 *
 * There is no session check here. These pages are public by definition — gating
 * the login page behind a session is a loop.
 */
import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
	return (
		<div className="flex min-h-full flex-1 flex-col">
			<header className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
				<Link href="/" aria-label="Splitr home" className="inline-flex rounded-lg">
					<Logo size="sm" />
				</Link>
			</header>
			<main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-16 md:pt-12">
				<div className="rounded-card border border-line bg-surface p-6 shadow-rest md:p-8">
					{children}
				</div>
			</main>
		</div>
	);
}
