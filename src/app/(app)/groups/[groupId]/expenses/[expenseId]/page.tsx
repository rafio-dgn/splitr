/**
 * `/groups/[groupId]/expenses/[expenseId]` — §5.9.
 *
 * A Server Component. It resolves the expense inside the group, so an id from
 * another group is indistinguishable from an id that does not exist: both are
 * `notFound()`, the same enumeration defence the group layout applies (§2.2).
 *
 * **Cluster B honesty:** `getExpenseInGroup` returns `null` for everything,
 * because no expense is stored until `REQ-D.1`. Every id therefore renders
 * not-found today. The rest of this file is the screen Cluster D switches on by
 * changing one function body — including the "No line items" empty state, which
 * is where the vision model's output will land (`REQ-D.3`/`REQ-D.6`).
 */
import { notFound } from "next/navigation";

import { EmptyState, ScreenHeading } from "@/components/ui";
import { getExpenseInGroup } from "@/lib/expenses/expense-feed";
import { resolveGroup } from "@/lib/groups/current-group";
import { formatGbp } from "@/lib/money";
import { requireSession } from "@/lib/session";

const DAY = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

export default async function ExpenseDetailPage({
	params,
}: PageProps<"/groups/[groupId]/expenses/[expenseId]">) {
	const session = await requireSession();
	const { groupId, expenseId } = await params;

	const group = await resolveGroup(groupId, session.user.id);
	if (group === null) {
		return null; // The layout has already rendered not-found.
	}

	const expense = await getExpenseInGroup(groupId, expenseId);
	if (expense === null) {
		notFound();
	}

	const nameOf = (userId: string): string =>
		group.members.find((member) => member.id === userId)?.name ?? "Someone";

	return (
		<div className="flex flex-col gap-8">
			<ScreenHeading eyebrow={group.name} title={expense.description}>
				<p>
					{formatGbp(expense.amountMinorUnits)} · {expense.paidByName} paid ·{" "}
					{DAY.format(new Date(`${expense.spentAt}T00:00:00Z`))}
				</p>
			</ScreenHeading>

			<section>
				<h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
					The split
				</h2>
				<ul className="mt-4 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
					{expense.shares.map((share) => (
						<li
							key={share.userId}
							className="flex items-baseline justify-between gap-4 py-3 text-sm"
						>
							<span>{nameOf(share.userId)}</span>
							<span>{formatGbp(share.shareMinorUnits)}</span>
						</li>
					))}
				</ul>
			</section>

			<section>
				<h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
					Line items
				</h2>
				<div className="mt-4">
					{/* §5.9's empty state, and the slot Cluster D's OCR output lands in. */}
					<EmptyState title="No line items">
						This expense was entered by hand, so there&rsquo;s nothing to
						itemise.
					</EmptyState>
				</div>
			</section>
		</div>
	);
}
