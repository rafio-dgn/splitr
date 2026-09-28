/**
 * In-app settle-up reminders (REQ-E.6, ADR-0026 §2). A Server Component: the
 * list is decided on the server, from stored reminders that the live balances
 * still confirm (`liveReminders`), so it can never nag about a paid debt.
 */
import Link from "next/link";

import { formatGbp } from "@/lib/money";
import type { LiveReminder } from "@/lib/reminders/live";

const formatDay = (ymd: string): string =>
	new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function ReminderBanners({ reminders, showGroup }: { reminders: readonly LiveReminder[]; showGroup: boolean }) {
	if (reminders.length === 0) return null;
	return (
		<ul className="flex flex-col gap-2" aria-label="Reminders">
			{reminders.map((r) => (
				<li
					key={`${r.groupId}:${r.creditorId}`}
					role="status"
					className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
				>
					<span>
						You&rsquo;ve owed {r.creditorName} {formatGbp(r.amountMinorUnits)} since {formatDay(r.owedSince)}
						{showGroup ? ` in ${r.groupName}` : ""}.
					</span>
					<Link href={`/groups/${r.groupId}/settle`} className="font-medium underline underline-offset-4">
						Settle up
					</Link>
				</li>
			))}
		</ul>
	);
}
