/**
 * `/groups` loading — `REQ-B.4`.
 *
 * §5.3: "Three card skeletons, each with a name bar and a balance bar." Three,
 * not a spinner: the shape of what is coming is the message.
 *
 * A Server Component. `loading.tsx` is streamed as the Suspense fallback for the
 * segment, so it costs the browser nothing.
 */
import { Skeleton } from "@/components/ui";

export default function GroupsLoading() {
	return (
		<div className="flex flex-col gap-8">
			<Skeleton className="h-8 w-40" />
			<ul className="flex flex-col gap-3" aria-hidden>
				{[0, 1, 2].map((row) => (
					<li
						key={row}
						className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800"
					>
						<span className="flex flex-col gap-2">
							<Skeleton className="h-4 w-36" />
							<Skeleton className="h-3 w-20" />
						</span>
						<Skeleton className="h-4 w-24" />
					</li>
				))}
			</ul>
			<p className="sr-only" role="status">
				Loading your groups…
			</p>
		</div>
	);
}
