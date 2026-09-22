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

import { ActionLink, EmptyState, ScreenHeading } from "@/components/ui";
import { deriveBalances } from "@/lib/expenses/balances";
import { listGroupExpenses } from "@/lib/expenses/expense-feed";
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

	// One pass per group to work out where the viewer stands. In Cluster D this
	// becomes a single aggregate query; the shape the screen needs does not
	// change, which is the point of deriving it rather than storing it.
	const cards = await Promise.all(
		summaries.map(async (summary) => {
			const group = await getGroupForViewer(summary.id, viewerId);
			const expenses = await listGroupExpenses(summary.id);
			const balances =
				group === null ? [] : deriveBalances(group.members, expenses);
			const mine = balances.find((balance) => balance.userId === viewerId);
			return { ...summary, net: mine?.netMinorUnits ?? 0 };
		}),
	);

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<ScreenHeading title="Your groups" />
				{cards.length > 0 ? (
					<ActionLink href="/groups/new">Create a group</ActionLink>
				) : null}
			</div>

			{cards.length === 0 ? (
				<EmptyState
					title="No groups yet"
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
				<ul className="flex flex-col gap-3">
					{cards.map((card) => (
						<li key={card.id}>
							<Link
								href={`/groups/${card.id}`}
								className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-5 py-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
							>
								<span>
									<span className="block font-medium">{card.name}</span>
									<span className="block text-sm text-zinc-500">
										{card.memberCount}{" "}
										{card.memberCount === 1 ? "person" : "people"}
									</span>
								</span>
								<span className="text-sm font-medium">
									{positionLabel(card.net)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
