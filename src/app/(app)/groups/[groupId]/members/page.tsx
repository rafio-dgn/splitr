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
import { Icon } from "@/components/icons";
import { Avatar, EmptyState, ScreenHeading, SectionLabel, cardClass } from "@/components/ui";
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
				<EmptyState icon="users" title="It's just you in here so far">
					<p>
						Splitr doesn&rsquo;t do much with one person. Send someone the link.
					</p>
				</EmptyState>
			) : (
				<section className="flex flex-col gap-3">
					<SectionLabel>
						{group.members.length} {group.members.length === 1 ? "member" : "members"}
					</SectionLabel>
					<ul className={`flex flex-col px-4 py-1 ${cardClass}`}>
						{group.members.map((member) => (
							<li
								key={member.id}
								className="flex items-center gap-3 border-t border-line py-3 text-[15px] font-semibold first:border-t-0"
							>
								<Avatar id={member.id} name={member.name} size="lg" />
								{member.name}
							</li>
						))}
					</ul>
				</section>
			)}

			{/* The invite panel: the one thing to do on this page.
			    Its <code> must stay the first on the page (the E2E reads it). */}
			<section className={`flex flex-col gap-4 p-5 md:p-6 ${cardClass}`}>
				<div className="flex items-start gap-3">
					<span className="grid size-10 shrink-0 place-items-center rounded-tile bg-primary-soft text-primary-ink">
						<Icon name="link" />
					</span>
					<div>
						<h2 className="font-display text-lg font-semibold">Invite someone</h2>
						<p className="text-[15px] text-muted">
					Anyone with this link can join {group.name}.
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<code className="flex h-11 min-w-0 flex-1 basis-64 items-center overflow-x-auto rounded-field border border-line bg-surface-2 px-3 font-mono text-sm whitespace-nowrap select-all">
						{link}
					</code>
					<CopyLinkButton value={link} />
				</div>
				<p className="text-sm text-muted">
					Splitr doesn&rsquo;t send it for you — paste it wherever the group
					already talks.
				</p>
			</section>
		</div>
	);
}
