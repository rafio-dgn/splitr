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

import { Icon } from "@/components/icons";
import { Banner, EmptyState, ScreenHeading, buttonClass, cardClass, inputClass } from "@/components/ui";
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
		// A two-option segmented control. Both are links, so each mode is a URL.
		target === mode ? (
			<span aria-current="true" className="rounded-full bg-surface px-3.5 py-1.5 font-semibold text-ink shadow-rest">
				{label}
			</span>
		) : (
			<Link
				href={`/search?q=${encodeURIComponent(query)}${target === "keyword" ? "&mode=keyword" : ""}`}
				className="rounded-full px-3.5 py-1.5 font-semibold text-muted hover:text-ink"
			>
				{label}
			</Link>
		);

	return (
		<div className="flex flex-col gap-8">
			<ScreenHeading title="Search" />

			<form action="/search" method="get" className="flex max-w-2xl flex-col gap-2" role="search">
				<label htmlFor="q" className="text-sm font-semibold">
					Find a past expense, in any of your groups
				</label>
				<div className="flex flex-col gap-3 sm:flex-row">
					<span className="relative flex-1">
						<Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
						<input
							id="q"
							name="q"
							type="search"
							defaultValue={query}
							placeholder="coffee, that Thai place, the thing for the kitchen…"
							className={`${inputClass} pl-11`}
						/>
					</span>
					{mode === "keyword" ? <input type="hidden" name="mode" value="keyword" /> : null}
					<button type="submit" className={buttonClass({ size: "md" })}>
						Search
					</button>
				</div>
			</form>

			{result === null ? (
				// §5.13, first empty: no query yet.
				<EmptyState icon="search" title="Find a past expense">
					<p>
						Search by what it actually was, not what the receipt called it. Try &ldquo;coffee&rdquo;, or &ldquo;that
						Thai place&rdquo;.
					</p>
				</EmptyState>
			) : (
				<section className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<span className="inline-flex rounded-full bg-surface-2 p-1">
							{modeLink("meaning", "By meaning")}
							{modeLink("keyword", "By keyword")}
						</span>
						{result.truncated ? <span className="text-muted">Searching your first 50 groups only.</span> : null}
					</div>
					{"fellBackToKeyword" in result && result.fellBackToKeyword ? (
						// ADR-0025 §4: the query couldn't be understood by meaning in time. Say so,
						// rather than pass keyword matches off as meaning matches.
						<Banner role="status">
							Search by meaning isn&rsquo;t available right now, so these are keyword matches.
						</Banner>
					) : null}
					{result.hits.length === 0 ? (
						// §5.13, second empty: a query that found nothing.
						<EmptyState icon="search" title={`Nothing matches “${query}”`}>
							<p>Try fewer words, or a different way of describing it.</p>
						</EmptyState>
					) : (
						<ul className={`flex max-w-2xl flex-col px-3 py-1 ${cardClass}`}>
							{result.hits.map((hit) => (
								<li key={hit.expenseId} className="border-t border-line first:border-t-0">
									<Link
										href={`/groups/${hit.groupId}/expenses/${hit.expenseId}`}
										className="flex items-center justify-between gap-4 rounded-[10px] px-2 py-3 hover:bg-surface-2"
									>
										<span className="flex min-w-0 flex-col">
											<span className="truncate font-semibold">{hit.description}</span>
											<span className="truncate text-[13px] text-muted">
												{hit.groupName} · {hit.spentAt}
												{hit.matchedItem !== null ? ` · matched “${hit.matchedItem}”` : ""}
											</span>
										</span>
										<span className="flex flex-col items-end">
											<span className="font-semibold tabular-nums">{formatGbp(hit.amountMinorUnits)}</span>
											{/* Kept for the REQ-D.4 side-by-side at the demo, but labelled
											    and quiet: it means little to anyone else. */}
											{hit.score !== null ? (
												<span className="text-xs text-faint tabular-nums">similarity {hit.score.toFixed(2)}</span>
											) : null}
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
