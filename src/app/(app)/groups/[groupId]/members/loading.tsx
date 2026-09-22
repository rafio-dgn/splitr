/** §5.8 — member-row skeletons; the invite panel renders last. */
import { Skeleton } from "@/components/ui";

export default function MembersLoading() {
	return (
		<div className="flex flex-col gap-8">
			<Skeleton className="h-8 w-52" />
			<div className="flex flex-col gap-3" aria-hidden>
				{[0, 1, 2].map((row) => (
					<Skeleton key={row} className="h-5 w-40" />
				))}
			</div>
			<Skeleton className="h-36 w-full rounded-2xl" />
			<p className="sr-only" role="status">
				Loading the members…
			</p>
		</div>
	);
}
