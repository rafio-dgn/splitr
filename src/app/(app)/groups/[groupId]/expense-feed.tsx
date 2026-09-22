/**
 * "What's been spent" — §4.6 C and §5.6.
 *
 * A **Server Component**, and an `async` one: it awaits its own data inside the
 * render. It is deliberately a separate file so the dashboard can drop it into
 * its own `<Suspense>` and its own error boundary — a slow or broken feed must
 * not hold up, or take down, the balance the user came for.
 *
 * Nothing here is a client fetch. That is the `REQ-B.3` property, and splitting
 * the component out does not weaken it: the boundary around this component is
 * client-side, the component itself still renders on the server and streams in.
 */
import Link from "next/link";

import { ActionLink, EmptyState } from "@/components/ui";
import { listGroupExpenses } from "@/lib/expenses/expense-feed";
import { formatGbp } from "@/lib/money";

const DAY = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
});

/** `"2026-09-19"` → `"19 Sep"`. UTC, so the date shown is the date stored. */
function formatSpentAt(spentAt: string): string {
	return DAY.format(new Date(`${spentAt}T00:00:00Z`));
}

export async function ExpenseFeed({ groupId }: { groupId: string }) {
	const expenses = await listGroupExpenses(groupId);

	if (expenses.length === 0) {
		return (
			<EmptyState
				title="No expenses yet"
				action={
					<ActionLink href={`/groups/${groupId}/expenses/new`}>
						Add an expense
					</ActionLink>
				}
			>
				Add the first one and the balance starts working.
			</EmptyState>
		);
	}

	return (
		<ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
			{expenses.map((expense) => {
				// The per-person figure is the *first* share, not amount ÷ people:
				// the remainder penny lives on that share (§3), and showing the
				// division would contradict the split by a penny.
				const perPerson = expense.shares[0]?.shareMinorUnits ?? 0;
				return (
					<li key={expense.id} className="py-4">
						<Link
							href={`/groups/${groupId}/expenses/${expense.id}`}
							className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
						>
							<span className="font-medium">{expense.description}</span>
							<span className="text-zinc-500">·</span>
							<span>{formatGbp(expense.amountMinorUnits)}</span>
							<span className="text-zinc-500">·</span>
							<span className="text-sm text-zinc-500">
								{expense.paidByName} paid
							</span>
							<span className="text-zinc-500">·</span>
							<span className="text-sm text-zinc-500">
								{formatSpentAt(expense.spentAt)}
							</span>
							<span className="text-zinc-500">·</span>
							<span className="text-sm text-zinc-500">
								split {expense.shares.length} ways →{" "}
								{formatGbp(perPerson)} each
							</span>
						</Link>
					</li>
				);
			})}
		</ul>
	);
}

/** The five row skeletons of §5.6, used as this section's Suspense fallback. */
export function ExpenseFeedSkeleton() {
	return (
		<div className="flex flex-col gap-3" aria-hidden>
			{[0, 1, 2, 3, 4].map((row) => (
				<div
					key={row}
					className="h-12 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800"
				/>
			))}
		</div>
	);
}
