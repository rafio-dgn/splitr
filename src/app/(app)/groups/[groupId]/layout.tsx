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

import { Icon } from "@/components/icons";
import { AddExpenseFab, GroupActions, GroupTabs } from "@/components/nav";
import { AvatarStack, cardClass } from "@/components/ui";
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
			<div className={`px-5 pt-5 md:px-6 md:pt-6 ${cardClass}`}>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-3">
					<span
						aria-hidden
						className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-surface-2 font-display text-xl font-bold"
					>
						{group.name.trim().charAt(0).toUpperCase()}
					</span>
					<Link
						href={`/groups/${group.id}`}
						className="min-w-0 font-display text-2xl font-bold tracking-tight md:text-[28px]"
					>
						{group.name}
					</Link>
					<span className="flex items-center gap-1.5">
						<AvatarStack people={group.members} />
						{/* Invite lives on the Members tab; this is its shortcut. */}
						<Link
							href={`/groups/${group.id}/members`}
							aria-label="Invite someone"
							className="grid size-8 place-items-center rounded-full border border-dashed border-line-strong bg-surface-2 text-ink hover:bg-surface-3"
						>
							<Icon name="plus" className="size-3.5" />
						</Link>
					</span>
					<div className="flex-1" />
					{/* One primary action per screen: Add expense. On phones both move
					    down: Add expense to the floating button, Settle up to the
					    balance card. */}
					<GroupActions groupId={group.id} />
				</div>
				<div className="mt-4">
					<GroupTabs groupId={group.id} />
				</div>
			</div>
			{children}
			<AddExpenseFab groupId={group.id} />
		</div>
	);
}
