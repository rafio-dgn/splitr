/**
 * The app's handle on `splitr-ai` (ADR-0016 §6, ADR-0025): the service binding
 * plus the shared secret every call carries. The app has no `ai` binding of its
 * own any more; every model call goes through here.
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface AiWorkerHandle {
	readonly worker: CloudflareEnv["AI_WORKER"];
	readonly secret: string;
	/** Only what callers use: work that runs after the response. */
	readonly ctx: { waitUntil(promise: Promise<unknown>): void };
}

/**
 * `null` when `AI_SHARED_SECRET` isn't set: a call that must be refused isn't
 * worth making, and every caller has a fallback for "no AI".
 *
 * The secret is read as possibly absent, which is the truth: it exists only
 * once `wrangler secret put` has run. It's also missing from the generated
 * types on a machine without `.dev.vars`, like the CI runner (found in PR #7).
 * The `in` check narrows correctly either way, without a cast.
 */
export async function aiWorker(): Promise<AiWorkerHandle | null> {
	const { env, ctx } = await getCloudflareContext({ async: true });
	const secret: unknown = "AI_SHARED_SECRET" in env ? env.AI_SHARED_SECRET : undefined;
	if (typeof secret !== "string" || secret === "") return null;
	return { worker: env.AI_WORKER, secret, ctx };
}
