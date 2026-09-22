/**
 * The expense-detail 404.
 *
 * Without this file the nearest boundary is the group's, which would tell
 * someone looking for a missing *expense* that we can't find their **group** —
 * while the group's name sits in the header above the message.
 *
 * **Flagged:** `wiki/context/screens-cluster-b.md` writes no copy for this case
 * (§5.9 covers the loading, error and empty states of an expense that exists).
 * The wording below follows §5.7's shape — same two possibilities, no hint as to
 * which — and is written down here so the product designer can overrule it.
 */
import { EmptyState } from "@/components/ui";

export default function ExpenseNotFound() {
	return (
		<EmptyState title="We can't find that expense">
			It may have been deleted, or it may belong to a different group.
		</EmptyState>
	);
}
