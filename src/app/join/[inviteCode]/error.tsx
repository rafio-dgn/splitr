"use client";

/**
 * §5.1 — the error that is **our** fault, not the link's. The distinction is the
 * whole copy: an invite that resolved to nothing is the page's empty state, not
 * this boundary.
 *
 * A Client Component because every `error.tsx` must be one.
 */
import { ErrorState } from "@/components/ui";

export default function JoinError({ retry }: { retry: () => void }) {
	return (
		<main className="mx-auto w-full max-w-lg px-6 py-20">
			<ErrorState title="We couldn't load this invite" onRetry={retry}>
				This one&rsquo;s on us, not on your link. Try again in a moment.
			</ErrorState>
		</main>
	);
}
