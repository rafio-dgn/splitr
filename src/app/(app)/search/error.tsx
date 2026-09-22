"use client";

/**
 * §5.13 error. A Client Component because every `error.tsx` must be one.
 *
 * The copy points at the working path on purpose: search failing must never
 * leave someone believing their expenses went with it.
 */
import { ErrorState } from "@/components/ui";

export default function SearchError({ retry }: { retry: () => void }) {
	return (
		<ErrorState title="Search isn't responding" onRetry={retry}>
			Your expenses are all still there — open a group to see them.
		</ErrorState>
	);
}
