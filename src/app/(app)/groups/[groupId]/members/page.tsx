/**
 * `/groups/[groupId]/members` — §4.3 and §5.8.
 *
 * A Server Component. The member list and the invite link are both resolved
 * during the render; the only thing that ships to the browser is the "Copy link"
 * button, which owns a two-second piece of state and needs `navigator.clipboard`.
 *
 * The invite URL is built from the request's own `Host` header rather than an
 * environment variable, so the link a user copies is a link back to the origin
 * they are actually on. `headers()` is **async** in Next.js 16.
 */
import { headers } from "next/headers";

import { CopyLinkButton } from "@/components/copy-link-button";
import { EmptyState, ScreenHeading } from "@/components/ui";
import { resolveGroup } from "@/lib/groups/current-group";
import { inviteUrl } from "@/lib/groups/membership";
import { requireSession } from "@/lib/session";

async function currentOrigin(): Promise<string> {
	const requestHeaders = await headers();
	const host = requestHeaders.get("host") ?? "splitr.example";
	// `x-forwarded-proto` is set by every proxy worth the name; local dev is http.
	const proto =
		requestHeaders.get("x-forwarded-proto") ??
		(host.startsWith("localhost") || host.startsWith("127.0.0.1")
			? "http"
			: "https");
	return `${proto}://${host}`;
}

export default async function MembersPage({
	params,
}: PageProps<"/groups/[groupId]/members">) {
	const session = await requireSession();
	const { groupId } = await params;

	const group = await resolveGroup(groupId, session.user.id);
	if (group === null) {
		return null; // The layout has already rendered not-found.
	}

	const link = inviteUrl(await currentOrigin(), group.inviteCode);
	const alone = group.members.length === 1;

	return (
		<div className="flex flex-col gap-8">
			<ScreenHeading eyebrow={group.name} title="Members &amp; invite" />

			{alone ? (
				/* §5.8: a group is never memberless — the viewer is in it. The real
				   empty state is being alone. */
				<EmptyState title="It's just you in here so far">
					<p>
						Splitr doesn&rsquo;t do much with one person. Send someone the link.
					</p>
				</EmptyState>
			) : (
				<ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
					{group.members.map((member) => (
						<li key={member.id} className="py-3 text-sm">
							{member.name}
						</li>
					))}
				</ul>
			)}

			<section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
				<h2 className="font-medium">Invite someone</h2>
				<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
					Anyone with this link can join {group.name}.
				</p>
				<div className="mt-4 flex flex-wrap items-center gap-3">
					<code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
						{link}
					</code>
					<CopyLinkButton value={link} />
				</div>
				<p className="mt-4 text-sm text-zinc-500">
					Splitr doesn&rsquo;t send it for you — paste it wherever the group
					already talks.
				</p>
			</section>
		</div>
	);
}
