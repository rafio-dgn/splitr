"use client";

/**
 * §5.5 — the balance error boundary, and the most carefully worded screen in
 * Cluster B.
 *
 * Splitr's balance is **derived**. A failure to derive it is a display failure,
 * and the spec is explicit: this boundary must never claim data is lost.
 * Telling a user their money records might be gone is the most damaging thing
 * this app could say.
 *
 * A Client Component because Next.js requires every `error.tsx` to be one.
 * `retry` is the Next.js 16 prop — not `reset`.
 */
import { ErrorState } from "@/components/ui";

export default function GroupError({ retry }: { retry: () => void }) {
	return (
		<ErrorState title="We couldn't work out the balance" onRetry={retry}>
			Your expenses are safe — we just couldn&rsquo;t add them up. Try again.
		</ErrorState>
	);
}
