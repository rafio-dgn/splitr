/**
 * Group membership — **Cluster B placeholder, deliberately not a table.**
 *
 * The add-expense form needs to know who is in a group so the server can refuse
 * a `paidById` or a `participantIds` entry that is not a member. That check is
 * the half of `REQ-B.2` the client cannot perform, so it has to exist now.
 *
 * What does *not* have to exist now is the `group` / `group_member` schema.
 * `REQ-D.1` owns Splitr's domain tables and `REQ-M.2` forbids jumping ahead one
 * cluster to get them, so Cluster B answers the membership question from a
 * fixture instead. `src/db/schema.ts` therefore holds exactly what Better Auth
 * requires and nothing else (ADR-0009).
 *
 * **Cluster D replaces the body of `getGroupForViewer`, not its signature.** It
 * becomes a Drizzle query joining `group_member` to `user`, keeping the same
 * `null`-for-not-a-member contract — which is what makes the 404-not-403 rule
 * survive the swap.
 */
import "server-only";

export interface GroupMember {
	readonly id: string;
	readonly name: string;
}

export interface Group {
	readonly id: string;
	readonly name: string;
	readonly members: readonly GroupMember[];
}

/** The one group Cluster B knows about. */
export const DEMO_GROUP_ID = "grp_demo";

/**
 * Two stand-ins for the housemates who will be real rows in Cluster D. They are
 * here so that "someone who is not in this group" is a testable condition — the
 * `REQ-B.2` curl payload that proves server-only validation needs a user id that
 * is syntactically fine and semantically wrong.
 */
const FIXTURE_MEMBERS: readonly GroupMember[] = [
	{ id: "usr_fixture_bob", name: "Bob" },
	{ id: "usr_fixture_chidi", name: "Chidi" },
];

/**
 * Returns the group as the viewer may see it, or `null` if the viewer is not a
 * member **or the group does not exist** — the two cases are deliberately
 * indistinguishable to the caller, so a caller cannot accidentally turn one into
 * a 403 and confirm the group exists.
 */
export async function getGroupForViewer(
	groupId: string,
	viewerId: string,
): Promise<Group | null> {
	// `await` is not needed by the fixture, but the signature is async because
	// Cluster D's implementation is a database round trip. Getting the call sites
	// awaiting now means the swap touches one file.
	await Promise.resolve();

	if (groupId !== DEMO_GROUP_ID) {
		return null;
	}

	return {
		id: DEMO_GROUP_ID,
		name: "Flat 3B",
		members: [{ id: viewerId, name: "You" }, ...FIXTURE_MEMBERS],
	};
}

export function isMember(group: Group, userId: string): boolean {
	return group.members.some((member) => member.id === userId);
}

/* -------------------------------------------------------------------------- *
 * Added by the frontend agent for the Cluster B route tree (`REQ-B.1`).
 *
 * Same contract as everything above it: **fixtures, not tables.** Each function
 * below is the exact shape the Cluster D (`REQ-D.1`) Drizzle query will have, so
 * the swap replaces a body and touches no call site. Nothing here writes.
 * -------------------------------------------------------------------------- */

/**
 * The invite code in the design spec's copy
 * (`wiki/context/screens-cluster-b.md` §4.3). Hard-coded because invites are
 * rows in Cluster D; the *screen* is Cluster B, and `REQ-F.2` drops Turnstile
 * onto it later.
 */
export const DEMO_INVITE_CODE = "7fK2pQvm";

/** What `/join/[inviteCode]` resolves to before it asks the visitor for anything. */
export interface Invite {
	readonly code: string;
	readonly groupId: string;
	readonly groupName: string;
	readonly invitedByName: string;
	readonly memberCount: number;
}

/**
 * Resolves an invite code, or `null` when it resolves to nothing.
 *
 * `null` is deliberately the only failure: §5.1 says the invalid-invite copy
 * must not distinguish "mistyped" from "turned off", so that adding expiry in a
 * later cluster needs no copy change.
 */
export async function getInvite(code: string): Promise<Invite | null> {
	await Promise.resolve();

	if (code !== DEMO_INVITE_CODE) {
		return null;
	}

	return {
		code: DEMO_INVITE_CODE,
		groupId: DEMO_GROUP_ID,
		groupName: "Flat 3B",
		invitedByName: "Bob",
		// The viewer is not counted: they are being invited, not a member yet.
		memberCount: FIXTURE_MEMBERS.length,
	};
}

/** The absolute invite link shown on the members screen (§4.3). */
export function inviteUrl(origin: string, code: string): string {
	return `${origin}/join/${code}`;
}

/** A row in the `/groups` list — §5.3: name, member count, the viewer's position. */
export interface GroupSummary {
	readonly id: string;
	readonly name: string;
	readonly memberCount: number;
}

/**
 * Every group the viewer belongs to.
 *
 * Cluster B knows one group and puts every signed-in viewer in it, which is
 * exactly what `getGroupForViewer` already does — this reuses it rather than
 * inventing a second source of truth. It returns an array, so the **empty**
 * state of §5.3 is one fixture change away rather than a rewrite.
 */
export async function getGroupsForViewer(
	viewerId: string,
): Promise<readonly GroupSummary[]> {
	const group = await getGroupForViewer(DEMO_GROUP_ID, viewerId);
	if (group === null) {
		return [];
	}
	return [{ id: group.id, name: group.name, memberCount: group.members.length }];
}
