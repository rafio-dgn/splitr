/**
 * `/groups/[groupId]/settle` — the route reserved for `REQ-E.1`, Cluster E.
 *
 * **Nothing is settled here.** `wiki/context/screens-cluster-b.md` §6 sketches
 * this screen in detail precisely so the refused settlement — the reason Splitr
 * exists — is not designed in a hurry later, but it also says plainly that
 * nothing in §6 is built in Cluster B. `REQ-M.2` forbids reaching into a later
 * cluster for it.
 *
 * So this page renders the one state that is true today: with no expenses there
 * is nothing owed, and §5.12's empty state is the whole screen. There is no
 * form, no amount field and no button that pretends to record anything —
 * §4.5's rule applies: do not promise what does not exist.
 */
import { EmptyState, ScreenHeading } from "@/components/ui";
import { deriveBalances, isSettled } from "@/lib/expenses/balances";
import { listGroupExpenses } from "@/lib/expenses/expense-feed";
import { resolveGroup } from "@/lib/groups/current-group";
import { formatGbp } from "@/lib/money";
import { requireSession } from "@/lib/session";

export default async function SettlePage({
	params,
}: PageProps<"/groups/[groupId]/settle">) {
	const session = await requireSession();
	const { groupId } = await params;

	const group = await resolveGroup(groupId, session.user.id);
	if (group === null) {
		return null; // The layout has already rendered not-found.
	}

	const balances = deriveBalances(group.members, await listGroupExpenses(groupId));

	return (
		<div className="flex flex-col gap-8">
			<ScreenHeading eyebrow={group.name} title={`Settle up in ${group.name}`} />

			{isSettled(balances) ? (
				<EmptyState title={`Nothing to settle — everyone in ${group.name} is square.`} />
			) : (
				<div className="flex flex-col gap-4">
					<ul className="flex flex-col gap-2 text-sm">
						{balances
							.filter((balance) => balance.netMinorUnits < 0)
							.map((balance) => (
								<li key={balance.userId}>
									{balance.name} owes the group{" "}
									{formatGbp(-balance.netMinorUnits)}
								</li>
							))}
					</ul>
					<p className="text-sm text-zinc-500">
						Recording a settlement — and refusing the second one when two people
						record the same payment — arrives with REQ-E.1.
					</p>
				</div>
			)}
		</div>
	);
}
