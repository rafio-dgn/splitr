/**
 * `/groups` — the app's home (`wiki/context/screens-cluster-b.md` §5.3).
 *
 * A **Server Component**. The session, the group list and each group's balance
 * are read during the server render; the browser receives HTML. There is no
 * `useEffect`, no `fetch` and no client state anywhere in this file — the same
 * property `REQ-B.3` demands of `/groups/[groupId]`, applied here because it is
 * the first screen a signed-in user sees.
 *
 * Replaces the backend agent's redirect-target stub.
 */
import Link from "next/link";

import { ReminderBanners } from "@/components/reminder-banners";
import {
	ActionLink,
	ButtonLink,
	EmptyState,
	PositionBadge,
	ScreenHeading,
} from "@/components/ui";
import { suggestTransfers } from "@/lib/expenses/transfers";
import { liveReminders } from "@/lib/reminders/live";
import { storedRemindersFor } from "@/lib/reminders/stored";
import { getGroupBalances } from "@/lib/expenses/group-balances";
import { getGroupForViewer, getGroupsForViewer } from "@/lib/groups/membership";
import { formatGbp } from "@/lib/money";
import { requireSession } from "@/lib/session";

/** §5.3: the card shows the viewer's position, and "Square" when there is none. */
function positionLabel(netMinorUnits: number): string {
	if (netMinorUnits > 0) return `You're owed ${formatGbp(netMinorUnits)}`;
	if (netMinorUnits < 0) return `You owe ${formatGbp(-netMinorUnits)}`;
	return "Square";
}

export default async function GroupsPage() {
	const session = await requireSession();
	const viewerId = session.user.id;

	const summaries = await getGroupsForViewer(viewerId);

	// One pass per group to work out where the viewer stands: the same
	// derivation the dashboard uses, so the two can never disagree. A group
	// count in the dozens makes this fine; an aggregate query is the answer if it
	// ever isn't, and the shape the screen needs wouldn't change.
	const cards = await Promise.all(
		summaries.map(async (summary) => {
			const group = await getGroupForViewer(summary.id, viewerId);
			const balances = group === null ? [] : await getGroupBalances(group);
			const mine = balances.find((balance) => balance.userId === viewerId);
			return { ...summary, net: mine?.netMinorUnits ?? 0, transfers: suggestTransfers(balances) };
		}),
	);

	// ADR-0026 §2: the cron's reminders, shown only where the live balances still agree.
	const reminders = liveReminders(
		viewerId,
		await storedRemindersFor(viewerId, cards.map((c) => c.id)),
		new Map(cards.map((c) => [c.id, c.transfers])),
	);

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<ScreenHeading title="Your groups" />
				{cards.length > 0 ? (
					<ButtonLink href="/groups/new" icon="plus">
						Create a group
					</ButtonLink>
				) : null}
			</div>

			<ReminderBanners reminders={reminders} showGroup />

			{cards.length === 0 ? (
				<EmptyState
					title="No groups yet"
					icon="users"
					action={<ActionLink href="/groups/new">Create a group</ActionLink>}
				>
					<p>
						A group is the set of people you split with — your flat, a trip, the
						Thursday dinner crowd.
					</p>
					<p className="mt-4">
						Got an invite link? Open it and you&rsquo;ll land straight inside.
					</p>
				</EmptyState>
			) : (
				<ul className="grid gap-3 md:grid-cols-2">
					{cards.map((card) => (
						<li key={card.id}>
							<Link
								href={`/groups/${card.id}`}
								className="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-4 shadow-rest transition-[border-color,box-shadow,transform] duration-200 ease-out-soft hover:-translate-y-px hover:border-line-strong hover:shadow-float md:px-5"
							>
								<span
									aria-hidden
									className="grid size-11 shrink-0 place-items-center rounded-tile bg-surface-2 font-display text-lg font-bold"
								>
									{card.name.trim().charAt(0).toUpperCase()}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate font-semibold">{card.name}</span>
									<span className="block text-sm text-muted">
										{card.memberCount}{" "}
										{card.memberCount === 1 ? "person" : "people"}
									</span>
								</span>
								<PositionBadge netMinorUnits={card.net}>
									{positionLabel(card.net)}
								</PositionBadge>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
