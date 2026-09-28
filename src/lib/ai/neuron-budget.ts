/**
 * REQ-F.4's spend cap on the LLM route (ADR-0031): at most `cap` neurons a
 * day (UTC), counted from what each Llama and Scout call reports
 * (`usage.neurons`). Embedding calls report no usage, so they aren't counted,
 * but once the day is over the cap they're refused too.
 *
 * Why our own counter: AI Gateway's Spend Limits are documented for requests
 * "for models with known pricing", and the docs don't say that includes
 * Workers AI's neurons. Counting ourselves works either way and can be tested.
 *
 * It's a soft cap by design: calls already in flight when the total crosses the
 * cap still finish. The next call is refused. Pure, so `node --test` covers it.
 *
 * A gateway cache hit still reports the original `usage.neurons`, although
 * Cloudflare bills it at 0 (measured 2026-09-28), so cache hits are counted
 * too. That over-counts: the cap trips early, never late (Raffaele's choice).
 */

/** 80% of the free plan's 10,000 neurons a day: headroom for what isn't counted (embeddings). */
export const DEFAULT_DAILY_NEURON_CAP = 8_000;

/** The budget's day, `YYYY-MM-DD` in UTC: the key of that day's counter. */
export const budgetDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** `AI_NEURON_CAP` from the config, or the default. A missing, non-numeric or negative value is the default. */
export function capFrom(configured: string | undefined): number {
	const n = Number(configured);
	return configured !== undefined && configured.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : DEFAULT_DAILY_NEURON_CAP;
}

/** May another model call run, given what's been spent today? */
export const withinCap = (spent: number, cap: number): boolean => spent < cap;

/** What to add after a call: the reported neurons, or 0 when the model reports none (embeddings). */
export function neuronsOf(result: unknown): number {
	if (typeof result !== "object" || result === null || !("usage" in result)) return 0;
	const usage = result.usage;
	return typeof usage === "object" && usage !== null && "neurons" in usage && typeof usage.neurons === "number" && usage.neurons > 0 ? usage.neurons : 0;
}
