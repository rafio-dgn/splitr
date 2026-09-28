/**
 * The `[AUDIT]` line (`REQ-M.5`, `REQ-F.3`): one parseable JSON line per
 * mutation, with **exactly** the five fields `REQ-F.3` names: `actor`,
 * `action`, `target`, `timestamp`, `outcome`.
 *
 * It was duplicated in every service in Cluster B. It's now shared, because
 * `wrangler tail | grep AUDIT` needs one shape it can rely on, and one shape is
 * worth more than several that are nearly the same.
 *
 * - `timestamp` is ISO 8601 UTC with milliseconds: readable in a tail, sortable
 *   as text, and unambiguous. It was a unix-seconds `ts` until F.4 (2026-09-28);
 *   `REQ-F.3` says to use its field names exactly.
 * - `persisted` says whether the durable write happened. An accepted mutation
 *   logs `persisted: true` only **after** D1 has confirmed the write, so the
 *   line never claims more than the database does.
 * - `detail` carries what changed (amounts, parties, labels), so a record's
 *   history can be rebuilt from logs alone. It never carries secrets, tokens,
 *   emails or passwords.
 *
 * Pure (no `server-only`, no path aliases): every Worker imports it, and
 * `node --test` covers `formatAudit`.
 */
export interface AuditEntry {
	actor: string;
	action: string;
	target: string;
	outcome: string;
	persisted: boolean;
	detail?: Record<string, string | number>;
}

/** The line, without printing it. The five required fields come first, in `REQ-F.3`'s order. */
export function formatAudit(entry: AuditEntry, now: Date = new Date()): string {
	const { actor, action, target, outcome, persisted, detail } = entry;
	return `[AUDIT] ${JSON.stringify({ actor, action, target, timestamp: now.toISOString(), outcome, persisted, ...(detail === undefined ? {} : { detail }) })}`;
}

export function audit(entry: AuditEntry): void {
	console.log(formatAudit(entry));
}
