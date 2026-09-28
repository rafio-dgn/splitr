/**
 * The AI Worker's other three methods (ADR-0016 §6, ADR-0025 step 5): every
 * model call Splitr makes, besides categorisation (`../categorise/contract.ts`),
 * now goes through `splitr-ai`. Shared by the app and the Worker, so a change
 * is a compile error on both sides.
 *
 * No `server-only` and no path aliases: the AI Worker's program imports this.
 */
import { z } from "zod";

import type { ReceiptDraft } from "../receipts/draft.ts";

/** Texts → 768-dimension bge vectors. For the search query (the app still queries Vectorize itself). */
export const embedRequestSchema = z.object({
	texts: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
});
export type EmbedRequest = z.infer<typeof embedRequestSchema>;

/** One saved expense → its search vectors (ADR-0022), built, embedded and upserted in the Worker. */
export const indexRequestSchema = z.object({
	id: z.string().min(1).max(64),
	groupId: z.string().min(1).max(64),
	description: z.string().min(1).max(200),
	items: z.array(z.object({ id: z.string().min(1).max(64), description: z.string().min(1).max(200) })).max(60),
});
export type IndexRequest = z.infer<typeof indexRequestSchema>;

/**
 * A receipt photo as a base64 `data:` URI, the only form the vision model
 * accepts. The app checks the photo (group, type, size) and reads it from R2
 * first; the 10 MB photo limit is ~13.4 MB as base64.
 */
export const readReceiptRequestSchema = z.object({
	image: z
		.string()
		.max(14_500_000)
		.regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
});
export type ReadReceiptRequest = z.infer<typeof readReceiptRequestSchema>;

/** Every refusal the AI Worker can give before doing any work. */
export type Refusal = { readonly status: "refused" } | { readonly status: "invalid"; readonly issues: readonly string[] };

export type EmbedResponse = Refusal | { readonly status: "ok"; readonly vectors: number[][] } | { readonly status: "failed"; readonly error: string };

export type IndexResponse =
	| Refusal
	| { readonly status: "ok"; readonly vectors: number; readonly mutationId: string }
	| { readonly status: "timeout" }
	| { readonly status: "failed"; readonly error: string };

export type ReadReceiptResponse =
	| Refusal
	/** `draft: null`: the model answered, but not with a usable receipt. */
	| { readonly status: "ok"; readonly draft: ReceiptDraft | null }
	| { readonly status: "failed"; readonly error: string };
