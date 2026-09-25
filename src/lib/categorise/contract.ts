/**
 * The contract between the app and the `splitr-ai` Worker (ADR-0025), shared
 * by both sides, as `ledger-contract.ts` is for the ledger. A change to what
 * the AI Worker accepts or returns is a compile error on both sides.
 *
 * The request is also parsed with zod on the Worker side. The caller is
 * trusted (a service binding plus the shared secret), but a model-facing
 * surface still checks its input: ids and texts end up in SQL parameters and
 * prompts.
 *
 * No `server-only` and no path aliases: the AI Worker's own program imports this.
 */
import { z } from "zod";

import type { Category } from "../categories.ts";

/** The two candidates ADR-0017's eval compares. The production default is chosen by the eval. */
export const CATEGORISE_MODELS = {
	"8b": "@cf/meta/llama-3.1-8b-instruct-fp8",
	"70b": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
} as const;

export type CategoriseModel = keyof typeof CATEGORISE_MODELS;

export const categoriseRequestSchema = z.object({
	/** A real `grp_…`, or a reserved reference group (`eval-flat`, `eval-trip`) in the eval. */
	groupId: z.string().min(1).max(64),
	items: z
		.array(
			z.object({
				/** The line item's id, so its own vector is never retrieved as its neighbour. */
				id: z.string().min(1).max(64),
				/** What the model sees: the item's description (ADR-0022: never the raw print, when there is a better one). */
				text: z.string().trim().min(1).max(200),
			}),
		)
		.min(1)
		.max(60),
	/** For the eval. Production callers leave it out and get the defaults. */
	options: z
		.object({
			model: z.enum(["8b", "70b"]).optional(),
			rag: z.boolean().optional(),
			/** The cosine similarity a group neighbour must reach to count (ADR-0025 §2: measured, not guessed). */
			threshold: z.number().min(0).max(1).optional(),
		})
		.optional(),
});

export type CategoriseRequest = z.infer<typeof categoriseRequestSchema>;

export interface ItemResult {
	readonly id: string;
	/** Always a valid key. `uncategorised` when the model's answer wasn't one. */
	readonly category: Category;
	/** The model's raw answer, for the eval and the audit line. `null` if no call was made. */
	readonly raw: string | null;
	/** How many examples came from the group, and how many from the seed corpus. */
	readonly groupExamples: number;
	readonly seedExamples: number;
	readonly neurons: number | null;
}

export type CategoriseResponse =
	| { readonly status: "ok"; readonly model: CategoriseModel; readonly ms: number; readonly results: readonly ItemResult[] }
	/** The budget ran out (ADR-0025 §4). Every item is `uncategorised`; the nightly cron retries. */
	| { readonly status: "timeout"; readonly ms: number; readonly results: readonly ItemResult[] }
	/** The request didn't parse. Nothing was called. */
	| { readonly status: "invalid"; readonly issues: readonly string[] }
	/** The shared secret didn't match. Nothing was called. */
	| { readonly status: "refused" }
	/** A binding threw. Every item is `uncategorised`. */
	| { readonly status: "failed"; readonly error: string; readonly results: readonly ItemResult[] };
