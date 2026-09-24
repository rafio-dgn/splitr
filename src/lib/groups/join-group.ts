/**
 * Joining a group through its invite link (ADR-0018 §5).
 *
 * The link is the only credential, so this checks it on every call and never
 * trusts a `groupId` from the client. That's why the input is the *code*, not
 * the group. `REQ-F.2` adds a Turnstile check to the Server Action in front of
 * this.
 */
import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { groupMember } from "@/db/schema";
import { audit } from "@/lib/audit";

import { getInvite } from "./membership";

export type JoinGroupResult =
	| { readonly status: "joined"; readonly groupId: string }
	| { readonly status: "already-member"; readonly groupId: string }
	/** The code resolves to nothing: mistyped or rotated, deliberately indistinguishable. */
	| { readonly status: "invalid-invite" }
	| { readonly status: "failed" };

export async function joinGroup(
	inviteCode: string,
	actorId: string,
): Promise<JoinGroupResult> {
	const invite = await getInvite(inviteCode);
	if (invite === null) {
		audit({
			actor: actorId,
			action: "group.join",
			target: "unknown",
			outcome: "rejected:invalid-invite",
			persisted: false,
		});
		return { status: "invalid-invite" };
	}

	try {
		const db = await getDb();
		const current = await db
			.select({ userId: groupMember.userId })
			.from(groupMember)
			.where(
				and(
					eq(groupMember.groupId, invite.groupId),
					eq(groupMember.userId, actorId),
					isNull(groupMember.leftAt),
				),
			);
		if (current.length > 0) {
			return { status: "already-member", groupId: invite.groupId };
		}

		// A former member (ADR-0018 §6) rejoins on their original row: same
		// primary key, `left_at` cleared. Their history in the group is theirs.
		await db
			.insert(groupMember)
			.values({ groupId: invite.groupId, userId: actorId })
			.onConflictDoUpdate({
				target: [groupMember.groupId, groupMember.userId],
				set: { leftAt: null },
			});
	} catch (error) {
		audit({
			actor: actorId,
			action: "group.join",
			target: invite.groupId,
			outcome: `error:${String(error).slice(0, 120)}`,
			persisted: false,
		});
		return { status: "failed" };
	}

	audit({
		actor: actorId,
		action: "group.join",
		target: invite.groupId,
		outcome: "accepted",
		persisted: true,
	});
	return { status: "joined", groupId: invite.groupId };
}
