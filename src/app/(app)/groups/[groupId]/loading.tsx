/**
 * §5.5 — the group header renders immediately (its name is resolved by the
 * layout, which is not replaced by this fallback), then a skeleton for the
 * headline figure and one bar per member.
 *
 * `loading.tsx` wraps the **page**, not the layout above it, which is exactly
 * why the group name stays on screen while the balance loads.
 */
import { Skeleton } from "@/components/ui";

export default function GroupLoading() {
	return (
		<div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
			{/* Same two columns as the page: the balance card, then the feed. */}
			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 md:order-2" aria-hidden>
				<Skeleton className="h-3 w-24" />
				<Skeleton className="h-10 w-56" />
				{[0, 1, 2].map((row) => (
					<div key={row} className="flex items-center gap-3">
						<Skeleton className="size-8 rounded-full" />
						<Skeleton className="h-4 flex-1" />
						<Skeleton className="h-4 w-20" />
					</div>
				))}
			</section>
			<section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 md:order-1" aria-hidden>
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
			</section>
			<p className="sr-only" role="status">
				Working out where everyone stands…
			</p>
		</div>
	);
}
