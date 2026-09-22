/**
 * Creating a group — the same two-layer shape ADR-0010 set for expenses: the
 * Server Action is a thin entry point and every rule lives here.
 *
 * Cluster B has no `group` table (`REQ-D.1` owns it), so this validates, emits
 * its `[AUDIT]` line (`REQ-M.5` — from the first mutation path, not from Cluster
 * F) and reports `persisted: false`. It does **not** pretend to have saved
 * anything: `wiki/context/screens-cluster-b.md` §4.5 — "Do not promise what does
 * not exist."
 */
import "server-only";

import {
	parseCreateGroup,
	type CreateGroupFieldErrors,
} from "@/lib/schemas/group";

export interface Actor {
	readonly id: string;
	readonly email: string;
}

export type CreateGroupResult =
	| {
			readonly status: "accepted";
			readonly name: string;
			/** `false` for the whole of Cluster B — see the module comment. */
			readonly persisted: false;
	  }
	| {
			readonly status: "invalid";
			readonly fieldErrors: CreateGroupFieldErrors;
			readonly formErrors: readonly string[];
	  };

function audit(entry: {
	actor: string;
	action: string;
	target: string;
	outcome: string;
	persisted: boolean;
}): void {
	console.log(
		`[AUDIT] ${JSON.stringify({ ts: Math.floor(Date.now() / 1000), ...entry })}`,
	);
}

export async function createGroup(
	rawInput: unknown,
	actor: Actor,
): Promise<CreateGroupResult> {
	await Promise.resolve();

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

	audit({
		actor: actor.id,
		action: "group.create",
		target: parsed.value.name,
		outcome: "accepted:not-persisted-until-REQ-D.1",
		persisted: false,
	});

	return { status: "accepted", name: parsed.value.name, persisted: false };
}
