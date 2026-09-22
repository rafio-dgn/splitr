/**
 * The *other* shared schema — `wiki/context/screens-cluster-b.md` §7.2.
 *
 * The design spec ships this form "for contrast, not as the proof": one field,
 * two messages. `REQ-B.2`'s evidence rests on `./expense.ts`, which has six
 * fields and six genuinely different failure modes. This one exists because
 * `/groups/new` is in the `REQ-B.1` route tree and a route that cannot submit is
 * not a route.
 *
 * Same isomorphic rule as `./expense.ts`: **only `zod`**. The moment anything
 * server-side leaks in, the client can no longer import it.
 */
import { z } from "zod";

const NAME_REQUIRED = "Give the group a name — something you'll recognise later.";

export const createGroupSchema = z.object({
	name: z
		.string({ error: NAME_REQUIRED })
		.trim()
		.min(1, { error: NAME_REQUIRED })
		.max(60, { error: "Group names are 60 characters at most." }),
});

export type CreateGroupInput = z.input<typeof createGroupSchema>;
export type CreateGroup = z.output<typeof createGroupSchema>;

export type CreateGroupFieldErrors = Partial<
	Record<keyof CreateGroupInput, string[]>
>;

/** Validates an untrusted value. `unknown` because one caller reads `FormData`. */
export function parseCreateGroup(
	input: unknown,
):
	| { ok: true; value: CreateGroup }
	| { ok: false; fieldErrors: CreateGroupFieldErrors; formErrors: string[] } {
	const result = createGroupSchema.safeParse(input);
	if (result.success) {
		return { ok: true, value: result.data };
	}
	const flat = z.flattenError(result.error);
	return {
		ok: false,
		fieldErrors: flat.fieldErrors,
		formErrors: flat.formErrors,
	};
}
