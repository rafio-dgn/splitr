/**
 * In-app settle-up reminders (REQ-E.6, ADR-0026 §2). A Server Component: the
 * list is decided on the server, from stored reminders that the live balances
 * still confirm (`liveReminders`), so it can never nag about a paid debt.
 */
import Link from "next/link";

import { formatGbp } from "@/lib/money";

import { Icon } from "./icons";
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
					className="flex flex-wrap items-center gap-3 rounded-tile border border-owe/30 bg-owe-soft px-4 py-3.5 text-[15px]"
				>
					<Icon name="bell" className="size-5 text-owe" />
					<span className="min-w-0 flex-1">
						You&rsquo;ve owed {r.creditorName}{" "}
						<strong className="tabular-nums">{formatGbp(r.amountMinorUnits)}</strong> since {formatDay(r.owedSince)}
						{showGroup ? ` in ${r.groupName}` : ""}.
					</span>
					<Link
						href={`/groups/${r.groupId}/settle`}
						className="inline-flex h-9 items-center rounded-full px-3 text-sm font-bold text-owe underline underline-offset-4 hover:bg-surface/60"
					>
						Settle up
					</Link>
				</li>
			))}
		</ul>
	);
}
