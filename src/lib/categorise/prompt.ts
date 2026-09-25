/**
 * The categorisation prompt and the parsing of its answer (ADR-0016 §4,
 * ADR-0025). Pure, so `node --test` covers it.
 *
 * The model answers with a bare key. `-fp8` has no JSON mode (ADR-0017), and
 * both candidate models get the identical prompt so the eval compares models,
 * not prompts. The answer is untrusted: anything that isn't exactly one key
 * becomes `null`, which the caller stores as `uncategorised`.
 */
import { CATEGORY_LABELS, MODEL_CATEGORY_KEYS, type ModelCategory } from "../categories.ts";

/** A labelled item shown to the model. `group` examples outrank `seed` ones (ADR-0025 §2). */
export interface Example {
	readonly text: string;
	readonly category: ModelCategory;
	readonly source: "group" | "seed";
}

export interface ChatMessage {
	readonly role: "system" | "user";
	readonly content: string;
}

/** One line per key: the key, its label, and what belongs there. */
const HINTS: Record<ModelCategory, string> = {
	groceries: "food and drink bought to take home, supermarket shops",
	eating_out: "restaurants, takeaways, cafés, food delivery, meal deals",
	drinks: "pubs, bars, clubs, drinks bought to drink out",
	transport: "local travel: taxis, trains, buses, the Tube, fuel, parking",
	travel_lodging: "trips: flights, hotels, hostels, holiday rentals",
	household: "things for the home: cleaning, furniture, repairs, supplies",
	utilities_bills: "bills: energy, water, broadband, phone, council tax",
	entertainment: "cinema, theatre, events, games, streaming, activities",
	health_personal: "pharmacy, medicine, doctor, dentist, haircuts, gym, toiletries",
	gifts: "presents, cards and flowers for other people",
	other: "none of the above",
};

const SYSTEM = [
	"You categorise one line item from a shared expense into exactly one category.",
	"The categories (answer with the key on the left):",
	...MODEL_CATEGORY_KEYS.map((key) => `- ${key}: ${CATEGORY_LABELS[key]}: ${HINTS[key]}`),
	"If examples from this group are given, follow how this group categorises, even when a general rule would say otherwise.",
	"Answer with the key only: one word, lowercase, no punctuation, no explanation.",
].join("\n");

const quote = (text: string): string => JSON.stringify(text.slice(0, 200));

/** The messages for one item. With no examples, this is the no-RAG baseline. */
export function buildMessages(itemText: string, examples: readonly Example[]): ChatMessage[] {
	const group = examples.filter((e) => e.source === "group");
	const seed = examples.filter((e) => e.source === "seed");
	const sections: string[] = [];
	if (group.length > 0) {
		sections.push("How this group has categorised similar items:", ...group.map((e) => `- ${quote(e.text)} → ${e.category}`), "");
	}
	if (seed.length > 0) {
		sections.push("General examples:", ...seed.map((e) => `- ${quote(e.text)} → ${e.category}`), "");
	}
	sections.push(`Item: ${quote(itemText)}`, "Category key:");
	return [
		{ role: "system", content: SYSTEM },
		{ role: "user", content: sections.join("\n") },
	];
}

const KEYS: ReadonlySet<string> = new Set(MODEL_CATEGORY_KEYS);

function isModelCategory(value: string): value is ModelCategory {
	return KEYS.has(value);
}

/**
 * The model's answer → a key, or `null`. Tolerates the harmless noise small
 * models add (case, quotes, a trailing full stop, a leading "Category:"), and
 * nothing else: two keys, or a key inside a sentence, is not an answer.
 */
export function parseCategory(raw: unknown): ModelCategory | null {
	if (typeof raw !== "string") return null;
	const cleaned = raw
		.trim()
		.toLowerCase()
		.replace(/^(category( key)?\s*:\s*)/, "")
		.replace(/^["'`]+|["'`.]+$/g, "")
		.trim();
	return isModelCategory(cleaned) ? cleaned : null;
}
