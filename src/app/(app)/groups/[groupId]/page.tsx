/**
 * `/groups/[groupId]` — **the main page of `REQ-B.3`**.
 *
 * The requirement in full: a Server Component that fetches server-side, with
 * devtools showing **no client-side data call on load**. Three things in this
 * file make that true, and all three are load-bearing:
 *
 *   1. There is no `"use client"` here, so this component executes only on the
 *      server. React hooks are therefore not even available to it — the mistake
 *      is unavailable rather than merely avoided.
 *   2. Every read (`requireSession`, `resolveGroup`, `listGroupExpenses`) is
 *      `await`ed **during the render**. In the App Router an async Server
 *      Component awaits directly; `getServerSideProps` is Pages Router and does
 *      not exist here.
 *   3. The only JavaScript this route sends to the browser is
 *      `SectionErrorBoundary` — a class error boundary with no data of its own.
 *      Its `children` are still Server Components (§5.6, and
 *      `.claude/agents/frontend.md`): wrapping the feed in a client shell does
 *      not drag the feed's data into the browser.
 *
 * Layout of the screen is §4.6: where you stand, everyone's position, what's
 * been spent.
 */
import { Suspense } from "react";

import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { EmptyState } from "@/components/ui";
import { deriveBalances, isSettled } from "@/lib/expenses/balances";
import { listGroupExpenses } from "@/lib/expenses/expense-feed";
import { resolveGroup } from "@/lib/groups/current-group";
import { describePosition, formatGbp } from "@/lib/money";
import { requireSession } from "@/lib/session";

import { ExpenseFeed, ExpenseFeedSkeleton } from "./expense-feed";

export default async function GroupDashboardPage({
	params,
	searchParams,
}: PageProps<"/groups/[groupId]">) {
	const session = await requireSession();
	const { groupId } = await params;
	// §4.4: the join flow lands here with a one-line confirmation. Reading it
	// from the URL on the server keeps the confirmation off the client entirely —
	// no state, no effect, no extra request.
	const justJoined = (await searchParams).joined === "1";

	// The layout already established membership and `resolveGroup` is
	// `cache()`d, so this is the same read, not a second one. `null` cannot
	// happen here — the layout would have rendered not-found — but the type says
	// it can, and narrowing it is cheaper than asserting it away.
	const group = await resolveGroup(groupId, session.user.id);
	if (group === null) {
		return null;
	}

	// The balance is derived here, on the server, from the expense records.
	// Deriving rather than storing is what §5.5's error copy depends on: a
	// failure here loses a calculation, never a record.
	const balances = deriveBalances(group.members, await listGroupExpenses(groupId));
	const mine = balances.find((balance) => balance.userId === session.user.id);
	const settled = isSettled(balances);

	return (
		<div className="flex flex-col gap-12">
			{justJoined ? (
				<p
					role="status"
					className="rounded-xl bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900"
				>
					You&rsquo;re in. Here&rsquo;s where {group.name} stands.
				</p>
			) : null}

			{/* A. Where you stand — §4.6 A, with §5.5's empty state. */}
			<section>
				{settled ? (
					<EmptyState title="Everyone's square">
						Nothing is owed in {group.name} right now.
					</EmptyState>
				) : (
					<>
						<h1 className="text-3xl font-semibold tracking-tight">
							{describePosition(mine?.netMinorUnits ?? 0).sentence}
						</h1>
						<p className="mt-2 text-zinc-600 dark:text-zinc-400">
							{balances
								.filter(
									(balance) =>
										balance.userId !== session.user.id &&
										balance.netMinorUnits !== 0,
								)
								.map((balance) =>
									balance.netMinorUnits < 0
										? `${balance.name} owes ${formatGbp(-balance.netMinorUnits)}`
										: `${balance.name} is owed ${formatGbp(balance.netMinorUnits)}`,
								)
								.join(" · ")}
						</p>
					</>
				)}
			</section>

			{/* B. Everyone's position — §4.6 B. One line per member, so the group
			    can read it together over a table. Hidden when everyone is square,
			    because a column of "Square" says less than the sentence above. */}
			{settled ? null : (
				<section>
					<h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
						Everyone&rsquo;s position
					</h2>
					<ul className="mt-4 flex flex-col gap-2">
						{balances.map((balance) => (
							<li
								key={balance.userId}
								className="flex items-baseline justify-between gap-4 text-sm"
							>
								<span>{balance.name}</span>
								<span className="text-zinc-600 dark:text-zinc-400">
									{balance.netMinorUnits === 0
										? "square"
										: balance.netMinorUnits < 0
											? `owes ${formatGbp(-balance.netMinorUnits)}`
											: `owed ${formatGbp(balance.netMinorUnits)}`}
								</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{/* C. What's been spent — §4.6 C. Its own Suspense boundary so a slow
			    feed does not hold up the balance, and its own error boundary so a
			    broken feed does not take the balance down with it (§5.6). */}
			<section>
				<h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
					What&rsquo;s been spent
				</h2>
				<div className="mt-4">
					<SectionErrorBoundary
						title="We couldn't load the expenses"
						description="The balance above is still accurate."
					>
						<Suspense fallback={<ExpenseFeedSkeleton />}>
							<ExpenseFeed groupId={groupId} />
						</Suspense>
					</SectionErrorBoundary>
				</div>
			</section>
		</div>
	);
}
