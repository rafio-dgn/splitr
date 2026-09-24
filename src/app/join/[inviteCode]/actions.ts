"use server";

/**
 * The join entry point. It's thin, like every other action: it authenticates
 * and delegates to `joinGroup()`, which holds the rules.
 *
 * `REQ-F.2` verifies the Turnstile token **here**, before `joinGroup` runs.
 * This is the one public form in Splitr, and a Server Action is a public POST
 * endpoint reachable without the page.
 */

import { redirect } from "next/navigation";

import { joinGroup, type JoinGroupResult } from "@/lib/groups/join-group";
import { requireSession } from "@/lib/session";

export type JoinOutcome = Exclude<JoinGroupResult, { status: "joined" } | { status: "already-member" }>;

/**
 * Called by the sign-up-then-join form, straight after `signUp` has set the
 * session cookie, and by the "Join" button for someone already signed in.
 * Success is a redirect; only the failures come back to the caller.
 */
export async function joinGroupAction(inviteCode: string): Promise<JoinOutcome> {
	const session = await requireSession();
	const result = await joinGroup(inviteCode, session.user.id);

	if (result.status === "joined") {
		redirect(`/groups/${result.groupId}?joined=1`);
	}
	if (result.status === "already-member") {
		redirect(`/groups/${result.groupId}`);
	}
	return result;
}
