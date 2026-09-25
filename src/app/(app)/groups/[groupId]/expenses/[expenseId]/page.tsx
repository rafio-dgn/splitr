/**
 * `/groups/[groupId]/expenses/[expenseId]` — §5.9.
 *
 * A Server Component. It resolves the expense inside the group, so an id from
 * another group is indistinguishable from an id that does not exist: both are
 * `notFound()`, the same enumeration defence the group layout applies (§2.2).
 *
 * `getExpenseInGroup` reads D1 (D.3). A voided expense (ADR-0018 §3) is also
 * `null` here, so it renders not-found like any other id that names nothing.
 * The "No line items" empty state is where the vision model's confirmed
 * output will land (`REQ-D.3`/`REQ-D.6`); until then every expense shows it.
 */
import { notFound } from "next/navigation";

import { EmptyState, ScreenHeading } from "@/components/ui";
import { categoryLabel } from "@/lib/categories";
import { getExpenseInGroup, listLineItems } from "@/lib/expenses/expense-feed";
import { resolveGroup } from "@/lib/groups/current-group";
import { formatGbp } from "@/lib/money";
import { presignReceiptView } from "@/lib/receipts/receipts";
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

	// A short-lived presigned GET, so the photo is served by R2 directly and
	// never streamed through the Worker (ADR-0020 §6). Signing failure means
	// "no photo shown", never a broken page.
	const receiptUrl =
		expense.receiptKey === null
			? null
			: await presignReceiptView(expense.receiptKey).catch(() => null);

	const lineItems = await listLineItems(expense.id);

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

			{expense.receiptKey !== null ? (
				<section>
					<h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
						Receipt
					</h2>
					{receiptUrl !== null ? (
						// A plain <img>, deliberately not next/image: its optimiser would
						// fetch the photo *through* the Worker, which is exactly what
						// REQ-D.3 rules out. The URL is R2's own, signed, and five minutes long.
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={receiptUrl}
							alt={`Receipt for ${expense.description}`}
							className="mt-4 max-h-[32rem] rounded-lg border border-zinc-200 dark:border-zinc-800"
						/>
					) : (
						<p className="mt-4 text-sm text-zinc-500">The receipt photo can&rsquo;t be shown right now.</p>
					)}
				</section>
			) : null}

			<section>
				<h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
					Line items
				</h2>
				<div className="mt-4">
					{lineItems.length > 0 ? (
						<ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
							{lineItems.map((item) => (
								<li key={item.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
									<span className="flex flex-col">
										<span>{item.description}</span>
										{item.rawText !== null && item.rawText !== item.description ? (
											<span className="text-xs text-zinc-500">Printed as &ldquo;{item.rawText}&rdquo;</span>
										) : null}
									</span>
									<span className="flex flex-col items-end">
										<span className="tabular-nums">{formatGbp(item.amountMinorUnits)}</span>
										<span className="text-xs text-zinc-500">{categoryLabel(item.category)}</span>
									</span>
								</li>
							))}
						</ul>
					) : (
						// §5.9's empty state: an expense typed by hand, or a photo not yet read.
						<EmptyState title="No line items">
							{expense.receiptKey === null
								? "This expense was entered by hand, so there's nothing to itemise."
								: "The receipt photo is attached, but it wasn't read into items."}
						</EmptyState>
					)}
				</div>
			</section>
		</div>
	);
}
