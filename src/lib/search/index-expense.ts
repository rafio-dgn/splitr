/**
 * Writing an expense's search vectors (REQ-D.4, ADR-0022), after the save.
 *
 * It runs in `ctx.waitUntil`, after the response: **the expense's save never
 * waits on it and can never fail because of it** (REQ-M.7). Embedding is one
 * batched `bge` call for all of the expense's vectors. A failure is logged,
 * and the expense stays unsearchable until a backfill (E.8), which is a worse
 * search, never a lost expense.
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { vectorSpecs, type IndexableExpense } from "./vector-text";

export const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";

/** Texts → 768-dimension vectors, in one call. */
export async function embed(texts: readonly string[]): Promise<number[][]> {
	const { env } = await getCloudflareContext({ async: true });
	const result = await env.AI.run(EMBED_MODEL, { text: [...texts] });
	if (!("data" in result) || !Array.isArray(result.data) || result.data.length !== texts.length) {
		throw new Error(`embedding returned an unexpected shape for ${texts.length} text(s)`);
	}
	return result.data;
}

export async function indexExpense(expense: IndexableExpense): Promise<void> {
	const { env, ctx } = await getCloudflareContext({ async: true });
	const specs = vectorSpecs(expense);
	ctx.waitUntil(
		(async () => {
			try {
				const vectors = await embed(specs.map((spec) => spec.text));
				const mutation = await env.VECTORIZE.upsert(
					specs.map((spec, i) => ({ id: spec.id, values: vectors[i] ?? [], metadata: { ...spec.metadata } })),
				);
				console.log(`[search] indexed ${expense.id} vectors=${specs.length} mutation=${mutation.mutationId}`);
			} catch (error) {
				console.log(`[search] index-failed ${expense.id} ${String(error).slice(0, 160)}`);
			}
		})(),
	);
}
