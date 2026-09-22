/**
 * The group shell — `wiki/context/screens-cluster-b.md` §2: "Group membership is
 * the spine."
 *
 * Every screen under `/groups/[groupId]` answers one question first: **is the
 * viewer a member of this group?** It is answered here, once, and the pages
 * below assume it. `resolveGroup` is `cache()`-wrapped, so a page calling it
 * again for the group's name performs no second read.
 *
 * `null` means *either* "not a member" *or* "no such group", and this file
 * cannot tell them apart — by design. Both render `not-found.tsx`, so someone
 * poking at group ids learns nothing from being refused (§2.2).
 *
 * The group name sits in this header, so no nested screen is ever a form
 * floating in space (§2.3).
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { resolveGroup } from "@/lib/groups/current-group";
import { requireSession } from "@/lib/session";

export default async function GroupLayout({
	children,
	params,
}: LayoutProps<"/groups/[groupId]">) {
	const session = await requireSession();
	const { groupId } = await params;

	const group = await resolveGroup(groupId, session.user.id);
	if (group === null) {
		// 404, never 403. A 403 would confirm the group exists.
		notFound();
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
				<Link
					href={`/groups/${group.id}`}
					className="text-xl font-semibold tracking-tight"
				>
					{group.name}
				</Link>
				<nav className="flex flex-wrap items-center gap-3 text-sm">
					<Link
						href={`/groups/${group.id}/expenses/new`}
						className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
					>
						Add an expense
					</Link>
					<Link
						href={`/groups/${group.id}/settle`}
						className="rounded-full border border-zinc-300 px-4 py-2 font-medium hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
					>
						Settle up
					</Link>
					<Link
						href={`/groups/${group.id}/members`}
						className="rounded-full border border-zinc-300 px-4 py-2 font-medium hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
					>
						Invite someone
					</Link>
				</nav>
			</div>
			{children}
		</div>
	);
}
