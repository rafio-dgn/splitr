/**
 * RAG categorisation (REQ-E.4, ADR-0016 §1, ADR-0025): retrieve similar,
 * already-categorised items, first from this group and then from the seed
 * corpus, and have Llama pick one key from the closed list.
 *
 * Every binding arrives as a dependency, so this file is pure and `node --test`
 * drives every branch with fakes: the refusal, the timeout, a bad answer and the
 * seed top-up. The AI Worker wires the real AI, Vectorize and D1 in.
 */
import { UNCATEGORISED } from "../categories.ts";
import {
	categoriseRequestSchema,
	type CategoriseModel,
	type CategoriseResponse,
	type ItemResult,
} from "./contract.ts";
import { buildMessages, parseCategory, type ChatMessage, type Example } from "./prompt.ts";
import { secretAccepted } from "./secret.ts";

/** A vector near the item: its id, its cosine score and whatever metadata it carries. */
export interface Match {
	readonly id: string;
	readonly score: number;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface CategoriseDeps {
	/** Texts → vectors, in one call. */
	embed(texts: readonly string[]): Promise<number[][]>;
	/** The nearest vectors within one group's slice of the index. */
	nearest(vector: readonly number[], groupId: string, topK: number): Promise<readonly Match[]>;
	/**
	 * Matches → labelled examples (ADR-0025 §5): reference vectors from their own
	 * metadata, real items from D1. Anything uncategorised, voided, unknown or
	 * not in `groupId` is dropped, so the result can be shorter than the input.
	 * (Vectorize already filtered on the group; D1 checks it again, because "no
	 * data crosses group boundaries" (ADR-0016 §8) is worth enforcing twice.)
	 */
	resolve(matches: readonly Match[], source: Example["source"], groupId: string): Promise<Example[]>;
	/** One chat completion with `CATEGORISE_MODELS[model]`. `neurons` from the binding's `usage`, when it reports it. */
	generate(model: CategoriseModel, messages: readonly ChatMessage[]): Promise<{ response: unknown; neurons: number | null }>;
	now(): number;
}

export interface CategoriseConfig {
	/** `AI_SHARED_SECRETS`: comma-separated (ADR-0025 §3). */
	readonly acceptedSecrets: string | undefined;
	/** ADR-0025 §4: ~8 s for the whole call, embed and retrieval included. */
	readonly budgetMs?: number;
}

/**
 * Chosen by the eval (ADR-0025, Raffaele, 2026-09-25): 8B + RAG scored 28/30 against
 * 70B + RAG's 26/30, and 8/10 against 6/10 on group habits, at half the neurons.
 */
export const DEFAULT_MODEL: CategoriseModel = "8b";
/** Measured (ADR-0025 §2): 0.5 and 0.6 both 8/10 on the group set; 0.7 → 6/10, 0.8 → 5/10. */
export const DEFAULT_THRESHOLD = 0.6;
export const DEFAULT_BUDGET_MS = 8_000;
/** Examples per prompt, and how many group examples make the seed unnecessary. */
const WANT = 5;
const MIN_GROUP = 3;

const uncategorised = (id: string): ItemResult => ({ id, category: UNCATEGORISED, raw: null, groupExamples: 0, seedExamples: 0, neurons: null });

class BudgetExceeded extends Error {}

export async function categorise(
	deps: CategoriseDeps,
	secret: unknown,
	rawRequest: unknown,
	config: CategoriseConfig,
): Promise<CategoriseResponse> {
	// The secret first: an unauthenticated caller learns nothing, not even whether its request would parse.
	if (!secretAccepted(secret, config.acceptedSecrets)) {
		return { status: "refused" };
	}
	const parsed = categoriseRequestSchema.safeParse(rawRequest);
	if (!parsed.success) {
		return { status: "invalid", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
	}
	const { groupId, items, options } = parsed.data;
	const model = options?.model ?? DEFAULT_MODEL;
	const rag = options?.rag ?? true;
	const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
	const started = deps.now();

	const work = async (): Promise<ItemResult[]> => {
		const vectors = rag ? await deps.embed(items.map((i) => i.text)) : [];
		return Promise.all(
			items.map(async (item, index): Promise<ItemResult> => {
				let examples: Example[] = [];
				const vector = vectors[index];
				if (rag && vector !== undefined) {
					// One extra, because the item's own vector may already be indexed.
					const near = await deps.nearest(vector, groupId, WANT + 1);
					const fromGroup = await deps.resolve(
						near.filter((m) => m.id !== item.id && m.score >= threshold).slice(0, WANT),
						"group",
						groupId,
					);
					let fromSeed: Example[] = [];
					if (fromGroup.length < MIN_GROUP) {
						fromSeed = await deps.resolve(await deps.nearest(vector, "seed", WANT - fromGroup.length), "seed", "seed");
					}
					examples = [...fromGroup, ...fromSeed];
				}
				const reply = await deps.generate(model, buildMessages(item.text, examples));
				const category = parseCategory(reply.response);
				return {
					id: item.id,
					category: category ?? UNCATEGORISED,
					raw: typeof reply.response === "string" ? reply.response.slice(0, 60) : null,
					groupExamples: examples.filter((e) => e.source === "group").length,
					seedExamples: examples.filter((e) => e.source === "seed").length,
					neurons: reply.neurons,
				};
			}),
		);
	};

	// ADR-0025 §4: a budget, no retries. The losing promise keeps running and is
	// simply ignored; the nightly cron is the retry.
	let timer: ReturnType<typeof setTimeout> | undefined;
	const budget = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new BudgetExceeded()), config.budgetMs ?? DEFAULT_BUDGET_MS);
	});
	try {
		const results = await Promise.race([work(), budget]);
		return { status: "ok", model, ms: deps.now() - started, results };
	} catch (error) {
		const results = items.map((i) => uncategorised(i.id));
		if (error instanceof BudgetExceeded) {
			return { status: "timeout", ms: deps.now() - started, results };
		}
		return { status: "failed", error: String(error).slice(0, 200), results };
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}
