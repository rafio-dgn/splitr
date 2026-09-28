/**
 * §5.1 — a skeleton of the group card plus a live region for screen readers.
 *
 * The page must not flash the form before the group name is known: showing
 * "Join" before "join *what*" is a dark pattern by accident.
 */
import { Skeleton } from "@/components/ui";

export default function JoinLoading() {
	return (
		<main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 md:py-16">
			<Skeleton className="h-8 w-28" />
			<Skeleton className="h-8 w-72" />
			<Skeleton className="h-4 w-56" />
			<Skeleton className="h-64 w-full rounded-card" />
			<p className="sr-only" role="status">
				Checking this invite…
			</p>
		</main>
	);
}
