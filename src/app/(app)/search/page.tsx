/**
 * `/search` — the route reserved for `REQ-D.4` (semantic search over expenses).
 *
 * §1 lists it as a Cluster B screen with its empty state written, and §5.13
 * writes both of its empties. Cluster B ships the route and the no-query empty
 * state; the **mechanics are Cluster D** and `REQ-M.2` forbids reaching for
 * them.
 *
 * There is deliberately no search box. A field that accepts a query and can
 * never answer it is exactly the "coming soon" promise §4.5 rules out — the box
 * arrives in the same change as the vectors behind it.
 */
import { EmptyState, ScreenHeading } from "@/components/ui";
import { requireSession } from "@/lib/session";

export default async function SearchPage() {
	await requireSession();

	return (
		<div className="flex flex-col gap-8">
			<ScreenHeading title="Search" />
			<EmptyState title="Find a past expense">
				<p>
					Search by what it actually was, not what the receipt called it. Try
					&ldquo;coffee&rdquo;, or &ldquo;that Thai place&rdquo;.
				</p>
				<p className="mt-4 text-zinc-500">
					Searching itself arrives with REQ-D.4, together with the embeddings it
					runs on.
				</p>
			</EmptyState>
		</div>
	);
}
