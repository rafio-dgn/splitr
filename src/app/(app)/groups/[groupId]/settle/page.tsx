/**
 * `/groups/[groupId]/settle`: recording "A paid B" (`screens-cluster-b.md` §6,
 * ADR-0018 §2).
 *
 * A Server Component. It computes the balances and a sensible prefill, and the
 * form ships with no data of its own to fetch.
 *
 * The write behind it is arbitrated by the group's Durable Object (ADR-0023):
 * of two simultaneous taps, one settles and the other is told it already has.
 * Each render mints a fresh idempotency key, so this form's retries and
 * double-clicks replay instead of writing twice (REQ-E.2).
 */
import { Banner, EmptyState, ScreenHeading, cardClass } from "@/components/ui";
import { isSettled } from "@/lib/expenses/balances";
import { getGroupBalances } from "@/lib/expenses/group-balances";
import { resolveGroup } from "@/lib/groups/current-group";
import { formatGbp } from "@/lib/money";
import { requireSession } from "@/lib/session";

import { SettleForm } from "./settle-form";

/** Minor units → "40.00" for the amount field. Integer arithmetic, no floats. */
function toFieldAmount(minorUnits: number): string {
	return `${Math.floor(minorUnits / 100)}.${String(minorUnits % 100).padStart(2, "0")}`;
}

export default async function SettlePage({ params }: PageProps<"/groups/[groupId]/settle">) {
	const session = await requireSession();
	const { groupId } = await params;
	const viewerId = session.user.id;

	const group = await resolveGroup(groupId, viewerId);
	if (group === null) {
		return null; // The layout has already rendered not-found.
	}

	const balances = await getGroupBalances(group);
	if (isSettled(balances)) {
		return (
			<div className="flex flex-col gap-8">
				<ScreenHeading eyebrow={group.name} title={`Settle up in ${group.name}`} />
				<EmptyState icon="checkCircle" title={`Nothing to settle: everyone in ${group.name} is square.`} />
			</div>
		);
	}

	const debtors = balances.filter((b) => b.netMinorUnits < 0).sort((a, b) => a.netMinorUnits - b.netMinorUnits);
	const creditors = balances.filter((b) => b.netMinorUnits > 0).sort((a, b) => b.netMinorUnits - a.netMinorUnits);
	const me = balances.find((b) => b.userId === viewerId);

	// Prefill from the viewer's side, because only the payer or the recipient may
	// record a payment (ADR-0018 §8): if I owe, I pay the biggest creditor; if I'm
	// owed, the biggest debtor pays me.
	const from = me !== undefined && me.netMinorUnits < 0 ? me : debtors[0];
	const to = me !== undefined && me.netMinorUnits > 0 ? me : creditors[0];
	const viewerIsParty = me !== undefined && me.netMinorUnits !== 0;

	return (
		<div className="flex flex-col gap-8">
			<ScreenHeading eyebrow={group.name} title={`Settle up in ${group.name}`} />

			<ul className={`flex max-w-xl flex-col px-5 py-2 ${cardClass}`}>
				{debtors.map((b) => (
					<li key={b.userId} className="flex justify-between gap-4 border-t border-line py-2.5 text-[15px] first:border-t-0">
						<span className="font-semibold">{b.name}</span>
						<span className="font-semibold text-owe tabular-nums">owes {formatGbp(-b.netMinorUnits)}</span>
					</li>
				))}
				{creditors.map((b) => (
					<li key={b.userId} className="flex justify-between gap-4 border-t border-line py-2.5 text-[15px] first:border-t-0">
						<span className="font-semibold">{b.name}</span>
						<span className="font-semibold text-primary-ink tabular-nums">is owed {formatGbp(b.netMinorUnits)}</span>
					</li>
				))}
			</ul>

			{viewerIsParty && from !== undefined && to !== undefined ? (
				<SettleForm
					groupId={group.id}
					groupName={group.name}
					payers={debtors.map((b) => ({ id: b.userId, name: b.name }))}
					recipients={creditors.map((b) => ({ id: b.userId, name: b.name }))}
					defaultFromId={from.userId}
					defaultToId={to.userId}
					defaultAmount={toFieldAmount(Math.min(-from.netMinorUnits, to.netMinorUnits))}
					idempotencyKey={crypto.randomUUID()}
				/>
			) : (
				<Banner>
					You&rsquo;re square, so there&rsquo;s nothing for you to record. Only the person who paid, or the person
					who was paid, can record a settlement.
				</Banner>
			)}
		</div>
	);
}
