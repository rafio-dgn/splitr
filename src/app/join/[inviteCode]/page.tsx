/**
 * `/join/[inviteCode]` — **Splitr's one genuinely public authenticated-app
 * surface** (§4.4), and the screen `REQ-F.2` will protect with Turnstile.
 *
 * It lives **outside** `(app)` on purpose. Inside that group the layout's
 * `getSession()` gate would bounce every recipient to `/login`, which destroys
 * the entire point of an invite link. `REQ-B.1`'s "public routes outside the
 * `(app)` group" is not a filing convention here — it is the feature.
 *
 * A Server Component: the invite is resolved before the visitor is asked for
 * anything, because showing "Join" before "join *what*" is a dark pattern by
 * accident (§5.1).
 */
import { ActionLink, EmptyState, ScreenHeading } from "@/components/ui";
import { getGroupForViewer, getInvite } from "@/lib/groups/membership";
import { getSession } from "@/lib/session";

import { JoinAsMember, JoinForm } from "./join-form";

export default async function JoinPage({
	params,
}: PageProps<"/join/[inviteCode]">) {
	const { inviteCode } = await params;

	// `getSession()`, not `requireSession()`. A redirect here would be the bug.
	const session = await getSession();
	const invite = await getInvite(inviteCode);

	if (invite === null) {
		// §5.1: a single-record lookup has no list to be empty, so its empty *is*
		// "the invite resolved to nothing". No group name is shown — there is
		// nothing to leak, and the wording is vague about *why* on purpose so that
		// adding expiry later needs no copy change.
		return (
			<main className="mx-auto w-full max-w-lg px-6 py-20">
				<EmptyState
					title="This invite isn't valid"
					action={<ActionLink href="/">Go to Splitr</ActionLink>}
				>
					<p>The link may have been mistyped, or turned off by the group.</p>
					<p className="mt-2">
						Ask whoever sent it to send you a fresh one.
					</p>
				</EmptyState>
			</main>
		);
	}

	// Signed in: either already a member (§5.1 gives that its own screen), or
	// signed in but not yet a member, which gets a one-tap "Join" (§4.4).
	if (session !== null) {
		const group = await getGroupForViewer(invite.groupId, session.user.id);
		if (group !== null) {
			return (
				<main className="mx-auto w-full max-w-lg px-6 py-20">
					<EmptyState
						title={`You're already in ${group.name}.`}
						action={
							<ActionLink href={`/groups/${group.id}`}>
								Open {group.name}
							</ActionLink>
						}
					/>
				</main>
			);
		}
		return (
			<main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-20">
				<ScreenHeading
					title={`${invite.invitedByName} invited you to ${invite.groupName}`}
				>
					<p>
						{invite.memberCount}{" "}
						{invite.memberCount === 1 ? "person is" : "people are"} already
						splitting here.
					</p>
				</ScreenHeading>
				<JoinAsMember inviteCode={invite.code} groupName={invite.groupName} />
			</main>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-20">
			<ScreenHeading
				title={`${invite.invitedByName} invited you to ${invite.groupName}`}
			>
				<p>
					{invite.memberCount}{" "}
					{invite.memberCount === 1 ? "person is" : "people are"} already
					splitting here.
				</p>
			</ScreenHeading>

			<JoinForm inviteCode={invite.code} groupName={invite.groupName} />
		</main>
	);
}
