/**
 * The AI Worker's shared-secret check (ADR-0025 §3, `REQ-E.4`).
 *
 * The Worker accepts **any** secret in a comma-separated list, so `REQ-F.5`'s
 * dual-key rotation window is a configuration change: put `old,new` on the
 * consumer, move the producer to `new`, then retire `old`.
 *
 * Constant time: every candidate is compared in full, byte by byte, with no
 * early exit on the first difference or the first match, so the timing says
 * nothing about how much of a guess was right. Written by hand because
 * `crypto.subtle.timingSafeEqual` exists in workerd but not in Node, and this
 * file is tested with `node --test`.
 */

const encoder = new TextEncoder();

/** Byte-wise equality whose running time depends only on the lengths, never the content. */
function equalConstantTime(a: Uint8Array, b: Uint8Array): boolean {
	const length = Math.max(a.length, b.length);
	let difference = a.length ^ b.length;
	for (let i = 0; i < length; i++) {
		difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
	}
	return difference === 0;
}

/** The accepted secrets, from `AI_SHARED_SECRETS`. Blanks are dropped, so a stray comma can't accept "". */
export function parseSecretList(configured: string | undefined): string[] {
	return (configured ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/**
 * Which configured secret `given` matches: its 0-based position in the list, or
 * -1 for none. **An empty or missing list refuses everything**: a Worker
 * deployed without its secret must fail closed, not open.
 *
 * The position is what `REQ-F.5`'s drill logs (`key=2/2`, never the key), so
 * before the old key is retired, the logs show that nothing still sends it.
 */
export function matchedSecretIndex(given: unknown, configured: string | undefined): number {
	if (typeof given !== "string" || given.length === 0) return -1;
	const candidate = encoder.encode(given);
	let matched = -1;
	parseSecretList(configured).forEach((secret, index) => {
		// Every secret is compared in full, even after a match, so the time
		// taken depends on the list's lengths, not on which one matched.
		const equal = equalConstantTime(candidate, encoder.encode(secret));
		matched = equal && matched === -1 ? index : matched;
	});
	return matched;
}

/** True if `given` matches one of the configured secrets (see `matchedSecretIndex`). */
export function secretAccepted(given: unknown, configured: string | undefined): boolean {
	return matchedSecretIndex(given, configured) !== -1;
}

/** The log label for a call's key: `key=2/2`, or `key=none/2`. The position only, never the secret. */
export function keyLabel(given: unknown, configured: string | undefined): string {
	const index = matchedSecretIndex(given, configured);
	return `key=${index === -1 ? "none" : index + 1}/${parseSecretList(configured).length}`;
}
