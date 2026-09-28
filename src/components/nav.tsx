"use client";

/**
 * Navigation with an active state (ADR-0033 §navigation).
 *
 * A Client Component for one reason: `usePathname()`, to mark where you are
 * with `aria-current="page"`. It fetches nothing and holds no data, so the
 * pages around it stay server-rendered (`REQ-B.3`).
 *
 * Two levels. Level 1 (Groups, Search) sits in the top bar on desktop and in a
 * bottom tab bar on phones, where a thumb reaches it. Level 2 (a group's
 * Overview and Members) is `GroupTabs`, under the group's name.
 *
 * The desktop `Search` link must stay inside `<header>`: the E2E reaches search
 * by clicking `header a[href="/search"]`.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "./icons";
import { buttonClass } from "./ui";

const MAIN: readonly { href: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
	{ href: "/groups", label: "Groups", icon: "users", match: (p) => p === "/groups" || p.startsWith("/groups/") },
	{ href: "/search", label: "Search", icon: "search", match: (p) => p.startsWith("/search") },
];

/** The top-bar links, desktop only. */
export function MainNav() {
	const path = usePathname();
	return (
		<nav aria-label="Main" className="hidden items-center gap-1 md:flex">
			{MAIN.map((item) => {
				const active = item.match(path);
				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={active ? "page" : undefined}
						className={`flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150 ${
							active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
						}`}
					>
						<Icon name={item.icon} className="size-[17px]" />
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}

/** The bottom tab bar, phones only. Its height is reserved by the `(app)` layout's padding. */
export function MobileNav() {
	const path = usePathname();
	return (
		<nav
			aria-label="Main"
			className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-line bg-surface/95 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden"
		>
			{MAIN.map((item) => {
				const active = item.match(path);
				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={active ? "page" : undefined}
						className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11.5px] font-semibold ${
							active ? "text-primary-ink" : "text-muted"
						}`}
					>
						<Icon name={item.icon} className="size-[22px]" />
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}

/** A group's second-level tabs. Pages that are actions (add, settle) mark neither. */
export function GroupTabs({ groupId }: { groupId: string }) {
	const path = usePathname();
	const base = `/groups/${groupId}`;
	const tabs = [
		{ href: base, label: "Overview", active: path === base },
		{ href: `${base}/members`, label: "Members & invite", active: path.startsWith(`${base}/members`) },
	];
	return (
		<nav aria-label="Group" className="-mb-px flex gap-1">
			{tabs.map((tab) => (
				<Link
					key={tab.href}
					href={tab.href}
					aria-current={tab.active ? "page" : undefined}
					className={`border-b-2 px-3 py-3 text-sm font-semibold transition-colors duration-150 ${
						tab.active ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink"
					}`}
				>
					{tab.label}
				</Link>
			))}
		</nav>
	);
}

/** The screens under a group that are themselves an action, with their own submit button. */
function isActionScreen(path: string): boolean {
	return path.endsWith("/expenses/new") || path.endsWith("/settle");
}

/**
 * A group's two actions in its header, desktop only. Hidden on the action
 * screens, so each screen has one primary button: its own submit.
 */
export function GroupActions({ groupId }: { groupId: string }) {
	const path = usePathname();
	if (isActionScreen(path)) return null;
	return (
		<nav aria-label="Group actions" className="hidden items-center gap-3 md:flex">
			<Link href={`/groups/${groupId}/settle`} className={buttonClass({ variant: "secondary" })}>
				<Icon name="swap" className="size-[18px]" />
				Settle up
			</Link>
			<Link href={`/groups/${groupId}/expenses/new`} className={buttonClass()}>
				<Icon name="plus" className="size-[18px]" />
				Add an expense
			</Link>
		</nav>
	);
}

/**
 * "Add expense" as a floating button on phones, above the tab bar. Hidden on
 * the screens that are themselves an action, where it would compete with that
 * screen's own submit button.
 */
export function AddExpenseFab({ groupId }: { groupId: string }) {
	const path = usePathname();
	if (isActionScreen(path)) return null;
	return (
		<Link
			href={`/groups/${groupId}/expenses/new`}
			className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-13 items-center gap-2 rounded-full bg-primary px-5 font-bold text-on-primary shadow-float transition-transform duration-150 active:scale-[.97] md:hidden"
		>
			<Icon name="plus" className="size-5" />
			Add expense
		</Link>
	);
}
