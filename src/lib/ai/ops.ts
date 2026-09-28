/**
 * The AI Worker's embed, index and read-receipt operations (ADR-0016 §6,
 * ADR-0025 step 5). Pure: bindings are injected, so `node --test` covers the
 * refusals, budgets and parsing, and the Worker only wires AI and Vectorize in.
 *
 * Each one checks the shared secret **first** (ADR-0025 §3), then the request's
 * shape, and only then calls a model.
 */
import type { z } from "zod";

import { RECEIPT_JSON_SCHEMA, toReceiptDraft } from "../receipts/draft.ts";
import { vectorSpecs } from "../search/vector-text.ts";
import { secretAccepted } from "../categorise/secret.ts";
import { withBudget } from "./budget.ts";
import {
	embedRequestSchema,
	indexRequestSchema,
	readReceiptRequestSchema,
	type EmbedResponse,
	type IndexResponse,
	type ReadReceiptResponse,
	type Refusal,
} from "./contract.ts";

export interface OpsDeps {
	embed(texts: readonly string[]): Promise<number[][]>;
	upsert(vectors: readonly { id: string; values: number[]; metadata: Record<string, string> }[]): Promise<string>;
	/** One vision call with JSON mode. Returns the model's `response`, untrusted. */
	vision(prompt: string, image: string, schema: typeof RECEIPT_JSON_SCHEMA): Promise<unknown>;
}

/** ADR-0025 §4: the index write runs after the save, so 5 s is generous; the cron re-embeds a miss. */
export const INDEX_BUDGET_MS = 5_000;

/**
 * Prompt v1 from the D.6 spike (`scripts/vision-spike/run.mjs`), which gave
 * Scout its best item score (14/14). JSON mode carries the shape.
 */
export const RECEIPT_PROMPT = `You are reading a photo of a shop or restaurant receipt.
Return ONLY a JSON object with "merchant", "date" (YYYY-MM-DD or null), "total" and "items".
Rules:
- "total" is the final amount paid, as printed, after tax, discounts and rounding.
- "items" are the purchased lines only. Do NOT include subtotal, tax, GST, rounding, cash, change, card or payment lines.
- Each item has "raw" (the line's text exactly as printed), "description" (the same item in plain English, with abbreviations expanded) and "amount" (the line's total price as printed).
- Use plain numbers without currency symbols.`;

type Parsed<T> = { ok: true; value: T } | { ok: false; refusal: Refusal };

function authorise<T>(secret: unknown, accepted: string | undefined, raw: unknown, schema: z.ZodType<T>): Parsed<T> {
	if (!secretAccepted(secret, accepted)) return { ok: false, refusal: { status: "refused" } };
	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, refusal: { status: "invalid", issues: parsed.error.issues.map((i) => `${i.path.map(String).join(".")}: ${i.message}`) } };
	}
	return { ok: true, value: parsed.data };
}

const failure = (error: unknown): { status: "failed"; error: string } => ({ status: "failed", error: String(error).slice(0, 200) });

export async function embedTexts(deps: OpsDeps, secret: unknown, raw: unknown, accepted: string | undefined): Promise<EmbedResponse> {
	const req = authorise(secret, accepted, raw, embedRequestSchema);
	if (!req.ok) return req.refusal;
	try {
		return { status: "ok", vectors: await deps.embed(req.value.texts) };
	} catch (error) {
		return failure(error);
	}
}

export async function indexExpense(deps: OpsDeps, secret: unknown, raw: unknown, accepted: string | undefined, budgetMs = INDEX_BUDGET_MS): Promise<IndexResponse> {
	const req = authorise(secret, accepted, raw, indexRequestSchema);
	if (!req.ok) return req.refusal;
	const specs = vectorSpecs(req.value);
	try {
		const done = await withBudget(
			(async () => {
				const vectors = await deps.embed(specs.map((s) => s.text));
				if (vectors.length !== specs.length) throw new Error(`embedding returned ${vectors.length} vectors for ${specs.length} texts`);
				return deps.upsert(specs.map((s, i) => ({ id: s.id, values: vectors[i] ?? [], metadata: { ...s.metadata } })));
			})(),
			budgetMs,
		);
		return done.ok ? { status: "ok", vectors: specs.length, mutationId: done.value } : { status: "timeout" };
	} catch (error) {
		return failure(error);
	}
}

export async function readReceiptImage(deps: OpsDeps, secret: unknown, raw: unknown, accepted: string | undefined): Promise<ReadReceiptResponse> {
	const req = authorise(secret, accepted, raw, readReceiptRequestSchema);
	if (!req.ok) return req.refusal;
	try {
		// The model's answer is untrusted even in JSON mode: narrowed into a draft, or null.
		return { status: "ok", draft: toReceiptDraft(await deps.vision(RECEIPT_PROMPT, req.value.image, RECEIPT_JSON_SCHEMA)) };
	} catch (error) {
		return failure(error);
	}
}
