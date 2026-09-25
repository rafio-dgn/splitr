/**
 * Splitr's closed line-item taxonomy (ADR-0016 §4), in one place.
 *
 * Three consumers must agree on this list: the database `CHECK` on
 * `line_item.category` (src/db/schema.ts), the categoriser's prompt and output
 * validation (Cluster E), and the UI labels. Keeping it here means adding a
 * category is one edit plus a migration, never three edits that drift apart.
 *
 * Deliberately free of `server-only` and path aliases: `drizzle-kit` loads
 * `schema.ts` in plain Node, which imports this file.
 */

/**
 * The answers the model may give, as a literal tuple so the types are *derived*
 * rather than asserted (`Object.keys` would return `string[]` and need a cast).
 */
export const MODEL_CATEGORY_KEYS = [
	"groceries",
	"eating_out",
	"drinks",
	"transport",
	"travel_lodging",
	"household",
	"utilities_bills",
	"entertainment",
	"health_personal",
	"gifts",
	"other",
] as const;

export type ModelCategory = (typeof MODEL_CATEGORY_KEYS)[number];

/**
 * System-only: "not yet categorised, or the AI's answer was unusable". The
 * model can never return it. The nightly backfill looks for it, and never
 * touches `other`, which is a real answer.
 */
export const UNCATEGORISED = "uncategorised";

export type Category = ModelCategory | typeof UNCATEGORISED;

/** Every value `line_item.category` may hold: the 11 model answers plus `uncategorised`. */
export const CATEGORY_KEYS: readonly Category[] = [...MODEL_CATEGORY_KEYS, UNCATEGORISED];

/**
 * UI labels. The keys are stored; labels are display only. `satisfies` makes a
 * missing or misspelt key a compile error.
 */
export const CATEGORY_LABELS = {
	groceries: "Groceries",
	eating_out: "Eating out",
	drinks: "Drinks & nightlife",
	transport: "Transport",
	travel_lodging: "Travel & lodging",
	household: "Household",
	utilities_bills: "Utilities & bills",
	entertainment: "Entertainment",
	health_personal: "Health & personal care",
	gifts: "Gifts",
	other: "Other",
	uncategorised: "Uncategorised",
} as const satisfies Record<Category, string>;

/** Narrows a stored string to a known category, without a cast. */
export function isCategory(value: string): value is Category {
	return CATEGORY_KEYS.some((key) => key === value);
}

/** The label for a stored category, or the raw value if it's somehow not a known key. */
export function categoryLabel(value: string): string {
	return isCategory(value) ? CATEGORY_LABELS[value] : value;
}

