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

export default function AuthLayout({ children }: LayoutProps<"/">) {
	return (
		<div className="flex min-h-full flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
			<header className="mx-auto w-full max-w-5xl px-6 py-6">
				<Link href="/" className="text-lg font-semibold tracking-tight">
					Splitr
				</Link>
			</header>
			<main className="mx-auto w-full max-w-sm flex-1 px-6 py-16">
				{children}
			</main>
		</div>
	);
}
