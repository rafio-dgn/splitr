/**
 * `/search`: past expenses across all your groups, found by meaning
 * (REQ-D.4, ADR-0022).
 *
 * A Server Component with a plain GET form: a search is a URL
 * (`/search?q=that+thai+place`), needs no client JavaScript, and can be shared.
 * `mode=keyword` runs a plain substring search over the same data, for the
 * REQ-D.4 comparison and a side-by-side at the demo.
 *
 * `searchParams` is a **Promise** in Next.js 16
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`).
 */
import Link from "next/link";

import { EmptyState, ScreenHeading } from "@/components/ui";
import { formatGbp } from "@/lib/money";
import { searchByKeyword, searchByMeaning } from "@/lib/search/search";
import { requireSession } from "@/lib/session";

function one(value: string | string[] | undefined): string {
	return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 200) ?? "";
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
	const session = await requireSession();
	const params = await searchParams;
	const query = one(params.q);
	const mode = one(params.mode) === "keyword" ? "keyword" : "meaning";

	const result =
		query === "" ? null : mode === "keyword" ? await searchByKeyword(session.user.id, query) : await searchByMeaning(session.user.id, query);

	const modeLink = (target: "meaning" | "keyword", label: string) =>
		target === mode ? (
			<span className="font-medium">{label}</span>
		) : (
			<Link
				href={`/search?q=${encodeURIComponent(query)}${target === "keyword" ? "&mode=keyword" : ""}`}
				className="underline underline-offset-4"
			>
				{label}
			</Link>
		);

	return (
		<div className="flex flex-col gap-8">
			<ScreenHeading title="Search" />

			<form action="/search" method="get" className="flex flex-col gap-3" role="search">
				<label className="flex flex-col gap-1 text-sm">
					Find a past expense, in any of your groups
					<input
						name="q"
						defaultValue={query}
						placeholder="coffee, that Thai place, the thing for the kitchen…"
						className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
					/>
				</label>
				{mode === "keyword" ? <input type="hidden" name="mode" value="keyword" /> : null}
				<button
					type="submit"
					className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
				>
					Search
				</button>
			</form>

			{result === null ? (
				// §5.13, first empty: no query yet.
				<EmptyState title="Find a past expense">
					<p>
						Search by what it actually was, not what the receipt called it. Try &ldquo;coffee&rdquo;, or &ldquo;that
						Thai place&rdquo;.
					</p>
				</EmptyState>
			) : (
				<section className="flex flex-col gap-3">
					<p className="text-sm text-zinc-500">
						{modeLink("meaning", "By meaning")} · {modeLink("keyword", "By keyword")}
						{result.truncated ? " · Searching your first 50 groups only." : null}
					</p>
					{result.hits.length === 0 ? (
						// §5.13, second empty: a query that found nothing.
						<EmptyState title={`Nothing matches “${query}”`}>
							<p>Try fewer words, or a different way of describing it.</p>
						</EmptyState>
					) : (
						<ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
							{result.hits.map((hit) => (
								<li key={hit.expenseId} className="py-3">
									<Link href={`/groups/${hit.groupId}/expenses/${hit.expenseId}`} className="flex items-baseline justify-between gap-4">
										<span className="flex flex-col">
											<span className="font-medium">{hit.description}</span>
											<span className="text-xs text-zinc-500">
												{hit.groupName} · {hit.spentAt}
												{hit.matchedItem !== null ? ` · matched “${hit.matchedItem}”` : ""}
											</span>
										</span>
										<span className="flex flex-col items-end">
											<span className="tabular-nums">{formatGbp(hit.amountMinorUnits)}</span>
											{hit.score !== null ? <span className="text-xs text-zinc-500">{hit.score.toFixed(2)}</span> : null}
										</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</section>
			)}
		</div>
	);
}
