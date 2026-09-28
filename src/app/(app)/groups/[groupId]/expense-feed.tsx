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

import { Icon } from "@/components/icons";
import { ActionLink, EmptyState, Skeleton, cardClass } from "@/components/ui";
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
				icon="camera"
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

	// Grouped by day, newest first as the query returns them, so the eye can
	// find "last Friday" without reading every row.
	const days: { day: string; rows: (typeof expenses)[number][] }[] = [];
	for (const expense of expenses) {
		const last = days.at(-1);
		if (last !== undefined && last.day === expense.spentAt) last.rows.push(expense);
		else days.push({ day: expense.spentAt, rows: [expense] });
	}

	return (
		<div className={`px-3 pb-2 md:px-4 ${cardClass}`}>
			{days.map(({ day, rows }) => (
				<section key={day}>
					<h3 className="px-2 pt-4 pb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">
						{formatSpentAt(day)}
					</h3>
					<ul className="flex flex-col">
						{rows.map((expense) => {
							const perPerson = expense.shares[0]?.shareMinorUnits ?? 0;
							return (
								<li key={expense.id} className="border-t border-line first:border-t-0">
									<Link
										href={`/groups/${groupId}/expenses/${expense.id}`}
										className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-3 transition-colors duration-150 hover:bg-surface-2"
									>
										{/* A receipt when a photo is attached, a pen when typed in by hand. */}
										<span className="grid size-10 place-items-center rounded-tile bg-surface-2 text-ink">
											<Icon name={expense.receiptKey !== null ? "receipt" : "pen"} />
										</span>
										<span className="min-w-0">
											<span className="block truncate font-semibold">{expense.description}</span>
											<span className="block truncate text-[13px] text-muted">
												{expense.paidByName} paid · split {expense.shares.length} ways
											</span>
										</span>
										<span className="text-right">
											<span className="block font-semibold tabular-nums">
												{formatGbp(expense.amountMinorUnits)}
											</span>
											<span className="block text-[12.5px] text-muted tabular-nums">
												{formatGbp(perPerson)} each
											</span>
										</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</section>
			))}
		</div>
	);
}

/** The five row skeletons of §5.6, shaped like real rows so nothing jumps when they land. */
export function ExpenseFeedSkeleton() {
	return (
		<div className={`flex flex-col gap-4 p-5 ${cardClass}`} aria-hidden>
			<Skeleton className="h-3 w-16" />
			{[0, 1, 2, 3, 4].map((row) => (
				<div key={row} className="grid grid-cols-[40px_1fr_64px] items-center gap-3">
					<Skeleton className="size-10 rounded-tile" />
					<div className="flex flex-col gap-1.5">
						<Skeleton className="h-3.5 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
					<Skeleton className="h-3.5" />
				</div>
			))}
		</div>
	);
}
