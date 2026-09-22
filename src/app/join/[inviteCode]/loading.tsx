/**
 * §5.1 — a skeleton of the group card plus a live region for screen readers.
 *
 * The page must not flash the form before the group name is known: showing
 * "Join" before "join *what*" is a dark pattern by accident.
 */
import { Skeleton } from "@/components/ui";

export default function JoinLoading() {
	return (
		<main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-20">
			<Skeleton className="h-8 w-72" />
			<Skeleton className="h-4 w-56" />
			<Skeleton className="h-40 w-full rounded-2xl" />
			<p className="sr-only" role="status">
				Checking this invite…
			</p>
		</main>
	);
}
