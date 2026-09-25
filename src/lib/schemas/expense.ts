/**
 * The shared zod schema — `REQ-B.2`.
 *
 * **This module is the requirement.** It is imported unchanged by:
 *
 *   - the Client Component that renders the add-expense form, and
 *   - the server, through `src/lib/expenses/add-expense.ts`, which both the
 *     Server Action and the `POST /api/groups/[groupId]/expenses` Route Handler
 *     call (ADR-0010).
 *
 * So it must stay **isomorphic**: no `server-only`, no `next/*`, no database,
 * no `process.env`. Only `zod`. The moment something server-side leaks in here,
 * the client can no longer import it and `REQ-B.2` is quietly unsatisfied.
 *
 * Field rules and every user-facing string come from
 * `wiki/context/screens-cluster-b.md` §7.3 and are reproduced exactly, so the
 * message a curl sees is the message the form shows.
 *
 * Note what this schema does **not** decide: whether `paidById` and
 * `participantIds` are actually members of the group. That is not a shape
 * question and it cannot be answered in the browser — it is enforced
 * server-side in `add-expense.ts`, and it is the payload that proves the server
 * checks something the client cannot.
 */
import { z } from "zod";

/** £1,000,000.00, in minor units. */
export const MAX_AMOUNT_MINOR_UNITS = 100_000_000;

/** Splitr keeps expenses from this date onward. */
export const EARLIEST_SPENT_AT = "2020-01-01";

/**
 * Turns a cleaned decimal string into integer minor units without ever touching
 * floating point.
 *
 * `Math.round(Number("8.20") * 100)` is 820 today and a bug the day someone
 * enters a value where binary floating point rounds the wrong way. Splitting on
 * the decimal point and padding is exact for every input the regex admits.
 */
function toMinorUnits(cleaned: string): number {
	const [whole, fraction = ""] = cleaned.split(".");
	return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/**
 * Money arrives from the DOM as a string and must land as an integer.
 *
 * The first check is `fatal`, which stops zod running the transform on input it
 * has already rejected — verified against zod 4.6.5 rather than assumed.
 */
/**
 * Money as typed by a person ("42.50") → integer minor units (4250), with the
 * refusal messages supplied by the caller, because "an expense has to be more
 * than £0.00" is the wrong sentence on a settlement form. One parser, so the
 * two forms can never disagree about what a valid amount *is*.
 */
export function amountMinorUnitsField(messages: { zero: string; overLimit: string }) {
	return z
		.string({ error: "Enter an amount." })
		// Thousands separators and stray spaces are a paste artefact, not an error.
		.transform((raw) => raw.replace(/[\s, ]/g, ""))
		.superRefine((cleaned, ctx) => {
			const fail = (message: string): void => {
				ctx.addIssue({ code: "custom", message, fatal: true });
			};

			if (cleaned === "") {
				fail("Enter an amount.");
				return;
			}
			if (cleaned.startsWith("-")) {
				fail(
					"Amounts can't be negative. If someone paid you back, record that as a settlement instead.",
				);
				return;
			}
			if (/^\d+\.\d{3,}$/.test(cleaned)) {
				fail("Amounts can have at most two decimal places.");
				return;
			}
			if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) {
				fail("Amounts are numbers only — like 42.50.");
			}
		})
		.transform(toMinorUnits)
		.superRefine((minorUnits, ctx) => {
			if (minorUnits <= 0) {
				ctx.addIssue({
					code: "custom",
					message: messages.zero,
				});
				return;
			}
			if (minorUnits > MAX_AMOUNT_MINOR_UNITS) {
				ctx.addIssue({
					code: "custom",
					message: messages.overLimit,
				});
			}
		});
}

const amountMinorUnits = amountMinorUnitsField({
	zero: "An expense has to be more than £0.00.",
	overLimit: "That's over the £1,000,000.00 limit. Split it into separate expenses.",
});

/** `YYYY-MM-DD`, a real calendar date, not in the future, not before 2020. */
const spentAt = z.iso
	.date({ error: "Use a real date, like 2026-09-19." })
	.refine((value) => value <= todayUtc(), {
		error: "An expense can't be dated in the future.",
	})
	.refine((value) => value >= EARLIEST_SPENT_AT, {
		error: "Splitr keeps expenses from 2020 onwards.",
	});

/** Today's UTC date as `YYYY-MM-DD`. UTC everywhere — see `CLAUDE.md` §6. */
export function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

/**
 * The fields, as a plain object schema. It's kept separate from the refined
 * `addExpenseSchema` below because Zod 4 refuses `.pick()` on a schema with a
 * refinement, and the form picks the money-and-split subset from this one.
 * That broke the add-expense page at runtime (not at compile time) on
 * 2026-09-24, and the browser test caught it.
 */
export const addExpenseFields = z.object({
	/**
	 * Route-derived, never typed by a user. No message is specified because none
	 * is ever shown: a viewer who is not a member of this group gets a 404, not
	 * a field error — a 403 would confirm the group exists.
	 */
	groupId: z.string().min(1),

	description: z
		.string({ error: "Say what this was for — 'Tesco run', 'taxi to the airport'." })
		.trim()
		.min(1, {
			error: "Say what this was for — 'Tesco run', 'taxi to the airport'.",
		})
		.max(80, { error: "Keep it under 80 characters." }),

	amount: amountMinorUnits,

	/**
	 * Not an input — the `£` prefix on the amount field *is* the currency. It is
	 * in the schema so that a request claiming otherwise is refused rather than
	 * silently treated as pounds.
	 */
	currency: z.literal("GBP", {
		error: "Splitr only handles pounds at the moment.",
	}),

	spentAt,

	paidById: z.string({ error: "Choose who paid." }).min(1, {
		error: "Choose who paid.",
	}),

	participantIds: z
		.array(z.string().min(1), {
			error: "Pick at least one person to split this with.",
		})
		.min(1, { error: "Pick at least one person to split this with." })
		.refine((ids) => new Set(ids).size === ids.length, {
			error: "That person is already in the split.",
		}),

	/**
	 * The R2 key of an uploaded receipt photo, or absent (ADR-0020). Only the
	 * *shape* is checked here, and the form sends "" when there's no photo.
	 * Whether the key is this group's, and whether the object really exists,
	 * is checked on the server through the R2 binding before it's stored.
	 */
	receiptKey: z
		.string()
		.optional()
		.transform((value) => (value === undefined || value === "" ? undefined : value)),

	/**
	 * Line items from a confirmed receipt draft (D.6, ADR-0021). They're
	 * informational: they never change who owes what (ADR-0018 §1), so they're
	 * not checked against the total, which often differs anyway because of
	 * tax and rounding lines.
	 */
	lineItems: z
		.array(
			z.object({
				rawText: z.string().trim().max(120).nullable(),
				description: z.string().trim().min(1).max(120),
				amountMinorUnits: z.number().int().min(0).max(MAX_AMOUNT_MINOR_UNITS),
			}),
		)
		.max(60, { error: "That's too many line items for one expense." })
		.optional(),

	/**
	 * "I've checked the amount against the receipt". It's required whenever line
	 * items from a read receipt are submitted (see the refinement below), so the
	 * money-needs-a-human rule (ADR-0016 §2) is enforced **here**, on the one
	 * validation path, and not only by a disabled button that a UI bug can
	 * break. One did, and it was caught in testing on 2026-09-24.
	 */
	amountConfirmed: z.literal("yes").optional(),
});

/** The full rule set: the fields plus the cross-field rules. This is what every entry point parses with. */
export const addExpenseSchema = addExpenseFields.refine(
	(value) => value.lineItems === undefined || value.lineItems.length === 0 || value.amountConfirmed === "yes",
	{
		error: "Check the amount against the receipt, then tick the box to confirm it.",
		path: ["amountConfirmed"],
	},
);

/**
 * What the form sends: `amount` is still the string the user typed.
 * Use this to type the form's own state.
 */
export type AddExpenseInput = z.input<typeof addExpenseSchema>;

/**
 * What the server gets after parsing: `amount` is integer minor units.
 * These two types differ, which is the point of putting the transform in the
 * shared schema rather than in the form.
 */
export type AddExpense = z.output<typeof addExpenseSchema>;

/** Per-field errors, in the shape both the form and the API response use. */
export type FieldErrors = Partial<Record<keyof AddExpenseInput, string[]>>;

/**
 * Validates a raw, untrusted value.
 *
 * The parameter is `unknown` on purpose: on the client it is a `FormData`
 * readout, on the server it is a parsed JSON body from an unauthenticated
 * socket. Neither is trustworthy until this function has narrowed it.
 */
export function parseAddExpense(
	input: unknown,
):
	| { ok: true; value: AddExpense }
	| { ok: false; fieldErrors: FieldErrors; formErrors: string[] } {
	const result = addExpenseSchema.safeParse(input);
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

/**
 * The equal split, computed from the amount and the participants — **never**
 * submitted by the client.
 *
 * The remainder is distributed one penny at a time to the first participants, so
 * the shares always sum to exactly the total. £10.00 across 3 people is
 * 334/333/333, never 333/333/333 with a penny evaporating. A bill-splitter that
 * loses pennies loses arguments.
 */
export function equalShares(
	totalMinorUnits: number,
	participantIds: readonly string[],
): { userId: string; shareMinorUnits: number }[] {
	const count = participantIds.length;
	const base = Math.floor(totalMinorUnits / count);
	const remainder = totalMinorUnits - base * count;
	return participantIds.map((userId, index) => ({
		userId,
		shareMinorUnits: base + (index < remainder ? 1 : 0),
	}));
}
