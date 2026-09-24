/**
 * Add an expense — the one Cluster B form (`REQ-B.2`).
 *
 * A **Server Component**: it holds the session and the membership list and
 * passes only what the form needs to the client. The member list therefore
 * reaches the browser as props inside the initial HTML payload, not as a fetch —
 * which is why the split picker has no client-side loading state (§5.10).
 *
 * The group name is passed down so the split picker's empty state can name it;
 * §2.3 — "Add an expense" with no context is a form floating in space.
 *
 * §4.5 reserves a "Snap a receipt instead" slot at the top of this screen from
 * Cluster D (`REQ-D.3`). In Cluster B the slot is **absent** — no disabled
 * button, no "coming soon". Do not promise what does not exist.
 */
import { ScreenHeading } from "@/components/ui";
import { resolveGroup } from "@/lib/groups/current-group";
import { requireSession } from "@/lib/session";

import { getRecentDescriptions } from "@/lib/expenses/recent-descriptions";

import { AddExpenseForm } from "./add-expense-form";

export default async function NewExpensePage({
	params,
}: PageProps<"/groups/[groupId]/expenses/new">) {
	const session = await requireSession();
	const { groupId } = await params;

	// The group layout already resolved membership and `resolveGroup` is
	// `cache()`d, so this is the same read. A viewer who is not a member never
	// reaches this page: the layout renders not-found first.
	const group = await resolveGroup(groupId, session.user.id);
	if (group === null) {
		return null;
	}

	// REQ-D.2's hot state (ADR-0019). Read only here, after the layout's
	// membership check, because the list is the group's data.
	const { descriptions } = await getRecentDescriptions(group.id);

	return (
		<div className="flex flex-col gap-8">
			<ScreenHeading eyebrow={group.name} title="Add an expense" />
			<AddExpenseForm
				groupId={group.id}
				groupName={group.name}
				members={group.members}
				viewerId={session.user.id}
				recentDescriptions={descriptions}
			/>
		</div>
	);
}
