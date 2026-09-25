/**
 * Turning a vision model's answer into a receipt **draft** (ADR-0021).
 *
 * The model's output is untrusted input, even with JSON mode on: JSON mode
 * guarantees the *shape*, not that "total" is money or that an item is real.
 * So everything is narrowed here. A draft is only ever a suggestion: the user
 * confirms the total before anything is saved (ADR-0016 §2).
 *
 * Pure: no `server-only` and no path aliases, so `node --test` imports it (ADR-0012).
 */
import { z } from "zod";

/** Money as a receipt prints it ("RM 1,234.50", "38.35", 38.35) → integer minor units, or `null`. */
export function moneyTextToCents(value: unknown): number | null {
	if (typeof value !== "string" && typeof value !== "number") {
		return null;
	}
	const cleaned = String(value).replace(/[^0-9.]/g, "");
	const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(cleaned);
	if (match === null) {
		return null;
	}
	const [, whole = "0", fraction = ""] = match;
	return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export interface DraftItem {
	/** As printed, e.g. "COFFEEMIX 3IN". */
	readonly rawText: string;
	/** In plain English, e.g. "Coffee mix, 3-in-1". */
	readonly description: string;
	readonly amountMinorUnits: number;
}

export interface ReceiptDraft {
	/** Becomes the expense's description, capped at the form's 80-character limit. */
	readonly merchant: string;
	/** The one money figure the user must confirm. */
	readonly totalMinorUnits: number;
	readonly items: readonly DraftItem[];
}

/** The shape asked for (and, with JSON mode, enforced) from the model. */
export const RECEIPT_JSON_SCHEMA = {
	type: "object",
	properties: {
		merchant: { type: "string" },
		date: { type: ["string", "null"] },
		total: { type: "string" },
		items: {
			type: "array",
			items: {
				type: "object",
				properties: {
					raw: { type: "string" },
					description: { type: "string" },
					amount: { type: "string" },
				},
				required: ["raw", "description", "amount"],
			},
		},
	},
	required: ["merchant", "total", "items"],
} as const;

const modelAnswer = z.object({
	merchant: z.string(),
	total: z.union([z.string(), z.number()]),
	items: z
		.array(
			z.object({
				raw: z.string().optional(),
				description: z.string().optional(),
				amount: z.union([z.string(), z.number()]).optional(),
			}),
		)
		.default([]),
});

const MAX_ITEMS = 60;

/**
 * The model's answer → a draft, or `null` when there's nothing trustworthy
 * in it. **No total means no draft:** the total is the point, and a draft
 * without one would invite saving a guessed amount. Individual items that
 * don't parse are dropped rather than failing the whole draft, because items
 * are informational (ADR-0018 §1).
 */
export function toReceiptDraft(answer: unknown): ReceiptDraft | null {
	const parsed = modelAnswer.safeParse(typeof answer === "string" ? safeJson(answer) : answer);
	if (!parsed.success) {
		return null;
	}
	const totalMinorUnits = moneyTextToCents(parsed.data.total);
	if (totalMinorUnits === null || totalMinorUnits <= 0) {
		return null;
	}
	const items: DraftItem[] = [];
	for (const item of parsed.data.items.slice(0, MAX_ITEMS)) {
		const amountMinorUnits = moneyTextToCents(item.amount);
		const rawText = (item.raw ?? "").trim().slice(0, 120);
		const description = (item.description ?? "").trim().slice(0, 120) || rawText;
		if (amountMinorUnits === null || description === "") {
			continue;
		}
		items.push({ rawText: rawText || description, description, amountMinorUnits });
	}
	return {
		merchant: parsed.data.merchant.trim().slice(0, 80) || "Receipt",
		totalMinorUnits,
		items,
	};
}

function safeJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		// A model can still wrap JSON in prose despite being asked not to. Take
		// the outermost object if there is one; anything else isn't a draft.
		const start = text.indexOf("{");
		const end = text.lastIndexOf("}");
		if (start < 0 || end <= start) {
			return null;
		}
		try {
			return JSON.parse(text.slice(start, end + 1));
		} catch {
			return null;
		}
	}
}
