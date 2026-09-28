/**
 * The exact settle-up limit (REQ-F.1, ADR-0029 amendment): at most `limit`
 * accepted requests in any `windowMs`, per user. It's a sliding window: the
 * times of the recent accepted requests are kept, and a new one is allowed
 * only while fewer than `limit` are still inside the window.
 *
 * Why exact counting on top of the binding: Cloudflare's rate-limit binding is
 * "permissive, eventually consistent" (its counters are cached per machine and
 * updated asynchronously), so on production a tight burst of 6 all passed
 * (2026-09-28). The `SettleRateLimiter` Durable Object runs this function one
 * request at a time per user, so it can't be outrun.
 *
 * **Refused requests don't count**, so a flood doesn't extend its own lockout.
 * Pure, so `node --test` covers it (ADR-0012).
 */

/** The production setting: 5 per 60 s (ADR-0029). Also the binding's setting, in `wrangler.jsonc`. */
export const SETTLE_LIMIT = 5;
export const SETTLE_WINDOW_MS = 60_000;

export interface Slot {
	readonly allowed: boolean;
	/** The accepted times still inside the window, including this one if allowed. What to store. */
	readonly hits: number[];
	/** When the next slot frees up, rounded up to whole seconds; 0 if allowed. */
	readonly retryAfterSeconds: number;
}

export function takeSlot(hits: readonly number[], now: number, limit = SETTLE_LIMIT, windowMs = SETTLE_WINDOW_MS): Slot {
	const recent = hits.filter((t) => t > now - windowMs).sort((a, b) => a - b);
	if (recent.length >= limit) {
		const oldest = recent[0] ?? now;
		return { allowed: false, hits: recent, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
	}
	return { allowed: true, hits: [...recent, now], retryAfterSeconds: 0 };
}
