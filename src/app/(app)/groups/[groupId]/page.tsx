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
 *   2. Every read (`requireSession`, `resolveGroup`, `getGroupBalances`) is
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
import { ReminderBanners } from "@/components/reminder-banners";
import { ToastOnMount } from "@/components/toaster";
import {
	Avatar,
	ButtonLink,
	EmptyState,
	SectionLabel,
	cardClass,
	positionTextClass,
} from "@/components/ui";
import { suggestTransfers } from "@/lib/expenses/transfers";
import { liveReminders } from "@/lib/reminders/live";
import { storedRemindersFor } from "@/lib/reminders/stored";
import { isSettled } from "@/lib/expenses/balances";
import { getGroupBalances } from "@/lib/expenses/group-balances";
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
	// from the URL on the server keeps the decision on the server — no fetch, no
	// extra request. It's shown as a toast (ADR-0033); `?joined=1` stays in the
	// URL because the E2E waits for exactly that path.
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
	const balances = await getGroupBalances(group);
	const mine = balances.find((balance) => balance.userId === session.user.id);
	const settled = isSettled(balances);
	// ADR-0026 §2: the cron's reminder for this group, only if the live balance still agrees.
	const reminders = liveReminders(session.user.id, await storedRemindersFor(session.user.id, [group.id]), new Map([[group.id, suggestTransfers(balances)]]));

	const iOwe = (mine?.netMinorUnits ?? 0) < 0;

	return (
		<div className="flex flex-col gap-6">
			{justJoined ? (
				<ToastOnMount
					id={`joined:${group.id}`}
					title="You're in"
					detail={`Here's where ${group.name} stands.`}
				/>
			) : null}

			<ReminderBanners reminders={reminders} showGroup={false} />

			<div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
				{/* A + B. Where you stand, then everyone's position — §4.6 A and B,
				    with §5.5's empty state. One card: the sentence is the headline and
				    the list is the detail, so no position is said twice. First on a
				    phone, on the right on a desktop. */}
				<section className={`flex flex-col gap-5 p-5 md:order-2 md:p-6 ${settled ? "" : cardClass}`}>
					{settled ? (
						<EmptyState title="Everyone's square" icon="checkCircle">
							Nothing is owed in {group.name} right now.
						</EmptyState>
					) : (
						<>
							<SectionLabel>Where you stand</SectionLabel>
							<h1 className="font-display text-[34px] leading-[1.05] font-bold tracking-tight tabular-nums md:text-[40px]">
								<Headline sentence={describePosition(mine?.netMinorUnits ?? 0).sentence} />
							</h1>
							{iOwe ? (
								<ButtonLink href={`/groups/${group.id}/settle`} variant="secondary" icon="swap">
									Settle up
								</ButtonLink>
							) : null}
							{/* Hidden when everyone is square, because a column of "Square"
							    says less than the sentence above. */}
							<div>
								<h2 className="sr-only">Everyone&rsquo;s position</h2>
								<ul className="flex flex-col">
									{balances.map((balance) => (
										<li
											key={balance.userId}
											className="flex items-center gap-3 border-t border-line py-2.5 text-[15px]"
										>
											<Avatar id={balance.userId} name={balance.name} />
											<span className="min-w-0 flex-1 truncate font-semibold">
												{balance.userId === session.user.id ? "You" : balance.name}
											</span>
											<span className={`font-semibold tabular-nums ${positionTextClass(balance.netMinorUnits)}`}>
												{balance.netMinorUnits === 0
													? "square"
													: balance.netMinorUnits < 0
														? `${balance.userId === session.user.id ? "owe" : "owes"} ${formatGbp(-balance.netMinorUnits)}`
														: `owed ${formatGbp(balance.netMinorUnits)}`}
											</span>
										</li>
									))}
								</ul>
							</div>
						</>
					)}
				</section>

				{/* C. What's been spent — §4.6 C. Its own Suspense boundary so a slow
				    feed does not hold up the balance, and its own error boundary so a
				    broken feed does not take the balance down with it (§5.6). */}
				<section className="flex flex-col gap-3 md:order-1">
					<SectionLabel>What&rsquo;s been spent</SectionLabel>
					<SectionErrorBoundary
						title="We couldn't load the expenses"
						description="The balance above is still accurate."
					>
						<Suspense fallback={<ExpenseFeedSkeleton />}>
							<ExpenseFeed groupId={groupId} />
						</Suspense>
					</SectionErrorBoundary>
				</section>
			</div>
		</div>
	);
}

/**
 * The position sentence with the amount under the highlighter: "You owe
 * £16.50". The sentence itself comes from `describePosition`, unchanged; this
 * only finds the amount in it to mark.
 */
function Headline({ sentence }: { sentence: string }) {
	const match = /£[\d,]+\.\d{2}/.exec(sentence);
	if (match === null) return <>{sentence}</>;
	const at = match.index;
	return (
		<>
			{sentence.slice(0, at)}
			<span className="highlighter">{match[0]}</span>
			{sentence.slice(at + match[0].length)}
		</>
	);
}
