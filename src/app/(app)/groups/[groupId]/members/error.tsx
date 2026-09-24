"use client";

/**
 * §5.8 error. A Client Component because every `error.tsx` must be one.
 *
 * **A knowing deviation from the spec, flagged rather than hidden.** §5.8 says
 * the invite link should survive this failure because it is "rendered from the
 * route, not the failed fetch". The invite code isn't a route param: it's a
 * column on the `group` row (ADR-0018 §5: one code per group, no invite
 * table), and that row is exactly the read that just failed. So there's still
 * no honest way to render the link here, and the deviation stands by design.
 */
import { ErrorState } from "@/components/ui";

export default function MembersError({ retry }: { retry: () => void }) {
	return (
		<ErrorState title="We couldn't load the members" onRetry={retry}>
			Try again.
		</ErrorState>
	);
}
