/**
 * The small shared presentational vocabulary for Cluster B's screens.
 *
 * **No `"use client"`, and no `server-only` either.** Every component here is
 * pure markup over its props, which means a Server Component page can render it
 * *and* a `"use client"` error boundary can import it. That is the whole reason
 * it is a separate module: `REQ-B.4` wants the empty state and the error state
 * to look like the same application, and they are rendered from opposite sides
 * of the boundary.
 */
import Link from "next/link";

/** A grey bar standing in for content that has not arrived. `loading.tsx` only. */
export function Skeleton({ className = "" }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`}
		/>
	);
}

/** The primary action style, as a link. */
export function ActionLink({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) {
	return (
		<Link
			href={href}
			className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
		>
			{children}
		</Link>
	);
}

/** The secondary action style, as a link. */
export function SecondaryLink({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) {
	return (
		<Link
			href={href}
			className="inline-flex items-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
		>
			{children}
		</Link>
	);
}

/**
 * An empty state: a heading, an explanation, and usually a way out of it.
 *
 * Every empty state in `wiki/context/screens-cluster-b.md` §5 has all three,
 * which is what separates an empty state from a blank area.
 */
export function EmptyState({
	title,
	children,
	action,
}: {
	title: string;
	children?: React.ReactNode;
	action?: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
			<h2 className="text-lg font-semibold tracking-tight">{title}</h2>
			{children !== undefined ? (
				<div className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
					{children}
				</div>
			) : null}
			{action !== undefined ? (
				<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
					{action}
				</div>
			) : null}
		</div>
	);
}

/**
 * The shared shell for an `error.tsx`.
 *
 * `retry` is passed in rather than taken from context because this module has no
 * `"use client"` of its own — the boundary that owns the retry closure is the
 * client file above it.
 *
 * Note there is no red, no warning triangle and no "Something went wrong".
 * §5.5 is emphatic: Splitr's balance is derived, so a failure to derive it is a
 * display failure, and telling someone their money records might be gone is the
 * most damaging thing this app could say.
 */
export function ErrorState({
	title,
	children,
	onRetry,
	retryLabel = "Try again",
}: {
	title: string;
	children: React.ReactNode;
	onRetry: () => void;
	retryLabel?: string;
}) {
	return (
		<div
			role="alert"
			className="rounded-2xl border border-zinc-300 bg-zinc-50 px-6 py-8 dark:border-zinc-700 dark:bg-zinc-900"
		>
			<h2 className="text-lg font-semibold tracking-tight">{title}</h2>
			<div className="mt-2 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
				{children}
			</div>
			<button
				type="button"
				onClick={onRetry}
				className="mt-6 rounded-full border border-zinc-400 px-4 py-2 text-sm font-medium hover:border-zinc-600 dark:border-zinc-600 dark:hover:border-zinc-400"
			>
				{retryLabel}
			</button>
		</div>
	);
}

/** A page heading with the group name above it (§2: never a form floating in space). */
export function ScreenHeading({
	eyebrow,
	title,
	children,
}: {
	eyebrow?: string;
	title: string;
	children?: React.ReactNode;
}) {
	return (
		<div>
			{eyebrow !== undefined ? (
				<p className="text-sm font-medium text-zinc-500">{eyebrow}</p>
			) : null}
			<h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
			{children !== undefined ? (
				<div className="mt-2 text-zinc-600 dark:text-zinc-400">{children}</div>
			) : null}
		</div>
	);
}
