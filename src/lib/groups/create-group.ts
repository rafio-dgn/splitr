/**
 * Creating a group: the same two-layer shape ADR-0010 set for expenses. The
 * Server Action is a thin entry point, and every rule lives here.
 *
 * The group and the creator's membership are written in **one D1 batch**,
 * which D1 runs as a single transaction. There is never a group without its
 * creator in it, which would be a group nobody could ever open, since
 * membership is how the app decides who sees what.
 */
import "server-only";

import { getDb } from "@/db";
import { group, groupMember } from "@/db/schema";
import { audit } from "@/lib/audit";
import { newId, newInviteCode } from "@/lib/ids";
import {
	parseCreateGroup,
	type CreateGroupFieldErrors,
} from "@/lib/schemas/group";

export interface Actor {
	readonly id: string;
	readonly email: string;
}

export type CreateGroupResult =
	| { readonly status: "created"; readonly groupId: string }
	| {
			readonly status: "invalid";
			readonly fieldErrors: CreateGroupFieldErrors;
			readonly formErrors: readonly string[];
	  }
	/** D1 refused or was unreachable. Nothing was created. */
	| { readonly status: "failed" };

/**
 * Only GBP is offered for now (ADR-0018 §4: one currency per group, the model
 * ready for more). It's a constant here rather than a form field, so it can't
 * be spoofed into a currency the UI can't format.
 */
const DEFAULT_CURRENCY = "GBP";

export async function createGroup(
	rawInput: unknown,
	actor: Actor,
): Promise<CreateGroupResult> {
	const parsed = parseCreateGroup(rawInput);
	if (!parsed.ok) {
		audit({
			actor: actor.id,
			action: "group.create",
			target: "unknown",
			outcome: "rejected:invalid-shape",
			persisted: false,
		});
		return {
			status: "invalid",
			fieldErrors: parsed.fieldErrors,
			formErrors: parsed.formErrors,
		};
	}

	const groupId = newId("grp");
	try {
		const db = await getDb();
		await db.batch([
			db.insert(group).values({
				id: groupId,
				name: parsed.value.name,
				currency: DEFAULT_CURRENCY,
				// ~58 bits of randomness. A collision fails the UNIQUE index and
				// lands in `failed` below, which is the right outcome for an event
				// this unlikely: nothing half-written, and the user can retry.
				inviteCode: newInviteCode(),
				createdBy: actor.id,
			}),
			db.insert(groupMember).values({ groupId, userId: actor.id }),
		]);
	} catch (error) {
		audit({
			actor: actor.id,
			action: "group.create",
			target: groupId,
			outcome: `error:${String(error).slice(0, 120)}`,
			persisted: false,
		});
		return { status: "failed" };
	}

	audit({
		actor: actor.id,
		action: "group.create",
		target: groupId,
		outcome: "accepted",
		persisted: true,
	});
	return { status: "created", groupId };
}
