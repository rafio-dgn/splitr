"use client";

/** §5.9 error. A Client Component because every `error.tsx` must be one. */
import { ErrorState } from "@/components/ui";

export default function ExpenseError({ retry }: { retry: () => void }) {
	return (
		<ErrorState title="We couldn't load this expense" onRetry={retry}>
			Try again.
		</ErrorState>
	);
}
