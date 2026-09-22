"use client";

/**
 * §5.8 error. A Client Component because every `error.tsx` must be one.
 *
 * **A knowing deviation from the spec, flagged rather than hidden.** §5.8 says
 * the invite link should survive this failure because it is "rendered from the
 * route, not the failed fetch". In Cluster B the invite code is *not* a route
 * param — it comes from the group fixture, which is the read that just failed —
 * so there is no honest way to render the link here. When `REQ-D.1` gives
 * invites a table, the code becomes available independently and this boundary
 * should render it. Recorded in the changelog rather than quietly dropped.
 */
import { ErrorState } from "@/components/ui";

export default function MembersError({ retry }: { retry: () => void }) {
	return (
		<ErrorState title="We couldn't load the members" onRetry={retry}>
			Try again.
		</ErrorState>
	);
}
