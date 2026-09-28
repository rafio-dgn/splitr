/**
 * `splitr-ai`: the AI Worker (REQ-E.4, ADR-0025).
 *
 * `AiService` is the RPC entrypoint the app reaches through a service binding.
 * The logic lives in `src/lib/categorise/` (pure, and unit-tested with fakes).
 * This file only wires the real bindings into it: bge for embeddings,
 * Vectorize for retrieval, D1 (read-only) for the neighbours' labels, and
 * Llama for the answer.
 */
import { WorkerEntrypoint } from "cloudflare:workers";

import { MODEL_CATEGORY_KEYS, type ModelCategory } from "../../../src/lib/categories.ts";
import { categorise, type CategoriseDeps, type Match } from "../../../src/lib/categorise/categorise.ts";
import type { EmbedResponse, IndexResponse, ReadReceiptResponse } from "../../../src/lib/ai/contract.ts";
import { embedTexts, indexExpense, readReceiptImage, type OpsDeps } from "../../../src/lib/ai/ops.ts";
import { CATEGORISE_MODELS, type CategoriseResponse } from "../../../src/lib/categorise/contract.ts";
import type { Example } from "../../../src/lib/categorise/prompt.ts";

/**
 * Declared by hand, as the ledger's is, because the app's program reads this
 * file to type its service binding. `env-check.ts` proves Wrangler's generated
 * `Env` still satisfies it.
 */
export interface AiEnv {
	readonly AI: Ai;
	/**
	 * `Vectorize`, the v2 API, because `splitr-search` is a v2 index (its upsert
	 * returns a `mutationId`). Wrangler labels every Vectorize binding with the v1
	 * `VectorizeIndex`, the same mismatch `cloudflare-globals.d.ts` fixes for the
	 * app. `env-check.ts` allows for exactly this one difference.
	 */
	readonly VECTORIZE: Vectorize;
	readonly DB: D1Database;
	readonly AI_SHARED_SECRETS?: string;
}

const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";
/** Llama 4 Scout with JSON mode: Raffaele's choice from the D.6 spike (ADR-0021). */
const RECEIPT_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

async function embed(env: AiEnv, texts: readonly string[]): Promise<number[][]> {
	const result = await env.AI.run(EMBED_MODEL, { text: [...texts] });
	if (!("data" in result) || !Array.isArray(result.data) || result.data.length !== texts.length) {
		throw new Error(`embedding returned an unexpected shape for ${texts.length} text(s)`);
	}
	return result.data;
}

function opsDeps(env: AiEnv): OpsDeps {
	return {
		embed: (texts) => embed(env, texts),
		async upsert(vectors) {
			const mutation = await env.VECTORIZE.upsert(vectors.map((v) => ({ id: v.id, values: v.values, metadata: { ...v.metadata } })));
			return mutation.mutationId;
		},
		async vision(prompt, image, schema) {
			const result = await env.AI.run(RECEIPT_MODEL, {
				messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image } }] }],
				response_format: { type: "json_schema", json_schema: schema },
				max_tokens: 1024,
				temperature: 0,
			});
			return typeof result === "object" && result !== null && "response" in result ? result.response : null;
		},
	};
}

const KEYS: ReadonlySet<string> = new Set(MODEL_CATEGORY_KEYS);
const isModelCategory = (value: unknown): value is ModelCategory => typeof value === "string" && KEYS.has(value);

function deps(env: AiEnv): CategoriseDeps {
	return {
		embed: (texts) => embed(env, texts),

		async nearest(vector, groupId, topK) {
			const found = await env.VECTORIZE.query([...vector], { topK, filter: { groupId }, returnMetadata: "all" });
			return found.matches.map((m): Match => ({ id: m.id, score: m.score, metadata: m.metadata }));
		},

		async resolve(matches, source, groupId) {
			const examples: Example[] = [];
			// Reference vectors (the seed corpus, the eval groups) carry their own label (ADR-0025 §5).
			const real: Match[] = [];
			for (const m of matches) {
				const meta = m.metadata;
				if (meta?.kind === "reference") {
					if (typeof meta.text === "string" && isModelCategory(meta.category)) {
						examples.push({ text: meta.text, category: meta.category, source });
					}
				} else if (meta?.kind === "item") {
					real.push(m);
				}
			}
			if (real.length > 0) {
				// Real items: the label from D1, the truth. Categorised, not voided, and in this group.
				const placeholders = real.map(() => "?").join(", ");
				const rows = await env.DB.prepare(
					`SELECT li.id, li.description, li.category FROM line_item li JOIN expense e ON e.id = li.expense_id
					 WHERE li.id IN (${placeholders}) AND e.group_id = ? AND e.voided_at IS NULL AND li.category != 'uncategorised'`,
				)
					.bind(...real.map((m) => m.id), groupId)
					.all<{ id: string; description: string; category: string }>();
				const byId = new Map(rows.results.map((r) => [r.id, r]));
				// In similarity order, which is the order Vectorize returned.
				for (const m of real) {
					const row = byId.get(m.id);
					if (row !== undefined && isModelCategory(row.category)) {
						examples.push({ text: row.description, category: row.category, source });
					}
				}
			}
			return examples;
		},

		async generate(model, messages) {
			const input = { messages: messages.map((m) => ({ role: m.role, content: m.content })), temperature: 0, max_tokens: 12 };
			// Each id literally, so the compiler checks both against the model catalogue (no cast).
			const result = model === "70b" ? await env.AI.run(CATEGORISE_MODELS["70b"], input) : await env.AI.run(CATEGORISE_MODELS["8b"], input);
			const response = typeof result === "object" && result !== null && "response" in result ? result.response : null;
			const usage = typeof result === "object" && result !== null && "usage" in result ? result.usage : undefined;
			const neurons = typeof usage === "object" && usage !== null && "neurons" in usage && typeof usage.neurons === "number" ? usage.neurons : null;
			return { response, neurons };
		},

		now: () => Date.now(),
	};
}

export class AiService extends WorkerEntrypoint<AiEnv> {
	/** RAG categorisation of line items (REQ-E.4). The first argument is the shared secret (ADR-0025 §3). */
	async categorise(secret: string, request: unknown): Promise<CategoriseResponse> {
		const response = await categorise(deps(this.env), secret, request, { acceptedSecrets: this.env.AI_SHARED_SECRETS });
		// One line per call, never the secret. A refusal is logged too: it's a signal.
		console.log(
			`[ai] categorise status=${response.status}` +
				("results" in response ? ` items=${response.results.length} ms=${"ms" in response ? response.ms : "-"}` : ""),
		);
		return response;
	}

	/** Texts → vectors, for the search query (ADR-0025 step 5). The app keeps the 3 s budget and the keyword fallback. */
	async embed(secret: string, request: unknown): Promise<EmbedResponse> {
		const response = await embedTexts(opsDeps(this.env), secret, request, this.env.AI_SHARED_SECRETS);
		console.log(`[ai] embed status=${response.status}`);
		return response;
	}

	/** A saved expense's search vectors (ADR-0022): built, embedded and upserted here, within 5 s. */
	async index(secret: string, request: unknown): Promise<IndexResponse> {
		const response = await indexExpense(opsDeps(this.env), secret, request, this.env.AI_SHARED_SECRETS);
		console.log(`[ai] index status=${response.status}${response.status === "ok" ? ` vectors=${response.vectors} mutation=${response.mutationId}` : ""}`);
		return response;
	}

	/** A receipt photo (a data URI) → a validated draft, or null. The app keeps the 30 s budget. */
	async readReceipt(secret: string, request: unknown): Promise<ReadReceiptResponse> {
		const started = Date.now();
		const response = await readReceiptImage(opsDeps(this.env), secret, request, this.env.AI_SHARED_SECRETS);
		console.log(`[ai] readReceipt status=${response.status} ms=${Date.now() - started}`);
		return response;
	}
}

/** No public HTTP surface: `workers_dev` is false, and anything that arrives here is refused. */
export default {
	async fetch(): Promise<Response> {
		return new Response("Not found", { status: 404 });
	},
};
