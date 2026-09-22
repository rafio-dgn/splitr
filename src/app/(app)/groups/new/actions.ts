"use server";

/**
 * The create-group form's entry point. Thin, by the same rule as ADR-0010: it
 * authenticates, reads the `FormData` and delegates. No rule lives here.
 */

import { createGroup, type CreateGroupResult } from "@/lib/groups/create-group";
import { requireSession } from "@/lib/session";

export type CreateGroupFormState = { status: "idle" } | CreateGroupResult;

export async function createGroupAction(
	_previous: CreateGroupFormState,
	formData: FormData,
): Promise<CreateGroupFormState> {
	// A Server Action is a public POST endpoint, reachable without the form, so
	// it authenticates for itself rather than trusting the layout gate.
	const session = await requireSession();

	// `FormData.get` returns `string | File | null`. It is handed over as
	// `unknown` and narrowed by the shared schema, never cast here.
	return createGroup(
		{ name: formData.get("name") },
		{ id: session.user.id, email: session.user.email },
	);
}
