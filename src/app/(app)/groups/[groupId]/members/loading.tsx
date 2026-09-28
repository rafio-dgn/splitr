/** §5.8 — member-row skeletons; the invite panel renders last. */
import { Skeleton } from "@/components/ui";

export default function MembersLoading() {
	return (
		<div className="flex flex-col gap-8">
			<Skeleton className="h-8 w-52" />
			<div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4" aria-hidden>
				{[0, 1, 2].map((row) => (
					<div key={row} className="flex items-center gap-3">
						<Skeleton className="size-9 rounded-full" />
						<Skeleton className="h-4 w-40" />
					</div>
				))}
			</div>
			<Skeleton className="h-44 w-full rounded-card" />
			<p className="sr-only" role="status">
				Loading the members…
			</p>
		</div>
	);
}
