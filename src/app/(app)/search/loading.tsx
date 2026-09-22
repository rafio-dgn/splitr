/** §5.13 — "Searching…" with row skeletons. */
import { Skeleton } from "@/components/ui";

export default function SearchLoading() {
	return (
		<div className="flex flex-col gap-8">
			<Skeleton className="h-8 w-32" />
			<p role="status" className="text-sm text-zinc-500">
				Searching…
			</p>
			<div className="flex flex-col gap-3" aria-hidden>
				{[0, 1, 2, 3].map((row) => (
					<Skeleton key={row} className="h-12 w-full" />
				))}
			</div>
		</div>
	);
}
