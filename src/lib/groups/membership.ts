/**
 * Group membership: who is in which group, answered from D1 (`REQ-D.1`).
 *
 * This file was the Cluster B fixture, and it was built to be swapped: Cluster D
 * replaced the *bodies*, not the signatures, so no call site changed. The one
 * contract that matters survives the swap: **`null` means both "not a member" and
 * "no such group"**, indistinguishably. Callers turn it into a 404, never a 403,
 * because a 403 would confirm the group exists (enumeration defence).
 *
 * "Member" always means a **current** member: `left_at IS NULL`. Someone who
 * left (ADR-0018 §6) can no longer see the group, but their past expenses still
 * name them. The feed resolves names from `user`, not from this list.
 */
import "server-only";

import { and, asc, count, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import { getDb } from "@/db";
import { group, groupMember, user } from "@/db/schema";
import { parseCurrency, type Currency } from "@/lib/money";

export interface GroupMember {
	readonly id: string;
	readonly name: string;
}

export interface Group {
	readonly id: string;
	readonly name: string;
	readonly currency: Currency;
	/** The reusable, rotatable code in the `/join/[code]` link (ADR-0018 §5). */
	readonly inviteCode: string;
	/** Current members, in the order they joined. */
	readonly members: readonly GroupMember[];
}

/**
 * The group as the viewer may see it, or `null` if the viewer isn't a current
 * member **or the group doesn't exist**. The two are deliberately
 * indistinguishable.
 *
 * One query: the group joined to its current members. The viewer's own
 * membership is then just "is the viewer in that list", which avoids a second
 * round trip, and avoids an answer that could differ between two reads.
 */
export async function getGroupForViewer(
	groupId: string,
	viewerId: string,
): Promise<Group | null> {
	const db = await getDb();
	const rows = await db
		.select({
			id: group.id,
			name: group.name,
			currency: group.currency,
			inviteCode: group.inviteCode,
			memberId: user.id,
			memberName: user.name,
		})
		.from(group)
		.innerJoin(
			groupMember,
			and(eq(groupMember.groupId, group.id), isNull(groupMember.leftAt)),
		)
		.innerJoin(user, eq(user.id, groupMember.userId))
		.where(eq(group.id, groupId))
		.orderBy(asc(groupMember.joinedAt), asc(user.name));

	const first = rows[0];
	if (first === undefined || !rows.some((row) => row.memberId === viewerId)) {
		return null;
	}

	return {
		id: first.id,
		name: first.name,
		currency: parseCurrency(first.currency),
		inviteCode: first.inviteCode,
		members: rows.map((row) => ({ id: row.memberId, name: row.memberName })),
	};
}

export function isMember(group: Group, userId: string): boolean {
	return group.members.some((member) => member.id === userId);
}

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
 * `null` is deliberately the only failure: `screens-cluster-b.md` §5.1 says
 * the invalid-invite copy must not distinguish "mistyped" from "rotated away",
 * so a leaked link that was rotated looks exactly like a typo.
 *
 * "Invited by" is the group's creator. The link is the group's, not a
 * person's (ADR-0018 §5), so the creator is the honest name to show.
 */
export async function getInvite(code: string): Promise<Invite | null> {
	const db = await getDb();
	const creator = alias(user, "creator");
	const rows = await db
		.select({
			groupId: group.id,
			groupName: group.name,
			invitedByName: creator.name,
			memberCount: count(groupMember.userId),
		})
		.from(group)
		.innerJoin(creator, eq(creator.id, group.createdBy))
		.leftJoin(
			groupMember,
			and(eq(groupMember.groupId, group.id), isNull(groupMember.leftAt)),
		)
		.where(eq(group.inviteCode, code))
		.groupBy(group.id, group.name, creator.name);

	const row = rows[0];
	if (row === undefined) {
		return null;
	}
	return { code, ...row };
}

/** The absolute invite link shown on the members screen (§4.3). */
export function inviteUrl(origin: string, code: string): string {
	return `${origin}/join/${code}`;
}

/** A row in the `/groups` list: §5.3 shows the name, the member count and the viewer's position. */
export interface GroupSummary {
	readonly id: string;
	readonly name: string;
	readonly memberCount: number;
}

/** Every group the viewer is a current member of, by name. */
export async function getGroupsForViewer(
	viewerId: string,
): Promise<readonly GroupSummary[]> {
	const db = await getDb();
	const mine = alias(groupMember, "mine");
	return db
		.select({
			id: group.id,
			name: group.name,
			memberCount: count(groupMember.userId),
		})
		.from(mine)
		.innerJoin(group, eq(group.id, mine.groupId))
		.innerJoin(
			groupMember,
			and(eq(groupMember.groupId, group.id), isNull(groupMember.leftAt)),
		)
		.where(and(eq(mine.userId, viewerId), isNull(mine.leftAt)))
		.groupBy(group.id, group.name)
		.orderBy(asc(group.name));
}
