/** §5.9 — header skeleton plus a split-table skeleton. */
import { Skeleton } from "@/components/ui";

export default function ExpenseLoading() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-72" />
			</div>
			<div className="flex flex-col gap-3" aria-hidden>
				{[0, 1, 2].map((row) => (
					<Skeleton key={row} className="h-5 w-full" />
				))}
			</div>
			<p className="sr-only" role="status">
				Loading this expense…
			</p>
		</div>
	);
}
