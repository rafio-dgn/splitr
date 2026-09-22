"use client";

/**
 * `/groups` error boundary — `REQ-B.4`.
 *
 * `"use client"` is not a choice here: React error boundaries are class
 * components with browser-side lifecycle, so Next.js requires every `error.tsx`
 * to be a Client Component. It owns no data.
 *
 * `retry` — **not** `reset`. Next.js 16 renamed it; `reset()` still exists but
 * only clears the error without re-fetching, which is the wrong thing for a
 * failed server read
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`).
 *
 * Copy is §5.3 verbatim, and it says "nothing is lost" because nothing is: the
 * group list is a read.
 */
import { ErrorState } from "@/components/ui";

export default function GroupsError({ retry }: { retry: () => void }) {
	return (
		<ErrorState title="We couldn't load your groups" onRetry={retry}>
			Nothing is lost — your groups are safe. This is a display problem.
		</ErrorState>
	);
}
