/**
 * The `[AUDIT]` line (`REQ-M.5`): one parseable JSON line per mutation, with
 * actor, action, target, timestamp and outcome.
 *
 * It was duplicated in every service in Cluster B. It's now shared, because
 * `REQ-F.4` greps these lines, and one shape that `wrangler tail | grep AUDIT`
 * can rely on is worth more than several that are nearly the same.
 *
 * `persisted` says whether the durable write happened. From Cluster D, an
 * accepted mutation logs `persisted: true` only **after** D1 has confirmed the
 * write, so the line never claims more than the database does.
 */
export function audit(entry: {
	actor: string;
	action: string;
	target: string;
	outcome: string;
	persisted: boolean;
	detail?: Record<string, string | number>;
}): void {
	console.log(`[AUDIT] ${JSON.stringify({ ts: Math.floor(Date.now() / 1000), ...entry })}`);
}
