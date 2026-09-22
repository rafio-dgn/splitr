/**
 * §5.7 — "We can't find that group", rendered identically for a group that does
 * not exist and a group the viewer is not in.
 *
 * **Why it lives at `groups/`, not at `groups/[groupId]/`.** The membership
 * check is in `[groupId]/layout.tsx` (§2: one check, in the group layout), and a
 * `notFound()` thrown by a *layout* is not caught by the `not-found.tsx` beside
 * it — that boundary renders *inside* the very layout that threw. It bubbles to
 * the parent segment, which is this one. Verified by loading `/groups/nope`
 * before this file existed and getting Next.js's built-in 404 instead.
 *
 * The identity of the two cases is the requirement, not an implementation
 * accident: two different screens would let a stranger enumerate group ids by
 * noticing which refusal they got.
 */
import { ActionLink, EmptyState } from "@/components/ui";

export default function GroupNotFound() {
	return (
		<EmptyState
			title="We can't find that group"
			action={<ActionLink href="/groups">Back to your groups</ActionLink>}
		>
			It may have been deleted, or you may not be a member of it.
		</EmptyState>
	);
}
