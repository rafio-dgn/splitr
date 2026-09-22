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
		<div className="flex flex-col gap-10">
			<section className="flex flex-col gap-3">
				<Skeleton className="h-9 w-56" />
				<Skeleton className="h-4 w-72" />
			</section>
			<section className="flex flex-col gap-2" aria-hidden>
				{[0, 1, 2].map((row) => (
					<Skeleton key={row} className="h-5 w-64" />
				))}
			</section>
			<section className="flex flex-col gap-2" aria-hidden>
				{[0, 1, 2, 3, 4].map((row) => (
					<Skeleton key={row} className="h-12 w-full" />
				))}
			</section>
			<p className="sr-only" role="status">
				Working out where everyone stands…
			</p>
		</div>
	);
}
