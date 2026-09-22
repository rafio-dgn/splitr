/**
 * `/groups/new` — §4.2. A Server Component wrapping one client form leaf.
 *
 * The page itself does nothing interactive: it takes the session (the `(app)`
 * layout already gated, but a page that renders a form for a user should know
 * who that user is) and renders copy. Only the form below owns state.
 */
import { ScreenHeading } from "@/components/ui";
import { requireSession } from "@/lib/session";

import { CreateGroupForm } from "./create-group-form";

export default async function NewGroupPage() {
	await requireSession();

	return (
		<div className="flex max-w-lg flex-col gap-8">
			<ScreenHeading title="Name your group">
				<p>
					Something you&rsquo;ll recognise in six months — &lsquo;Flat
					12b&rsquo;, &lsquo;Ski trip 2027&rsquo;, &lsquo;Thursday
					dinner&rsquo;.
				</p>
			</ScreenHeading>
			<CreateGroupForm />
		</div>
	);
}
