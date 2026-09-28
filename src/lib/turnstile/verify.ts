/**
 * Server-side Turnstile verification (REQ-F.2, ADR-0030): the token the
 * browser got from the widget is worth nothing until Cloudflare's `siteverify`
 * confirms it, so a forged or missing token is refused here.
 *
 * **Fails closed** (Raffaele's choice): no secret, a timeout, an outage or an
 * unreadable answer all refuse. A security control that fails open isn't one,
 * and joining is rare and retryable.
 *
 * Pure: `fetch` and the secret are injected, so `node --test` covers every
 * branch. The Server Action wires the real ones in.
 */
import { z } from "zod";

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5_000;

export type TurnstileResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: "missing-token" | "rejected" | "unavailable"; readonly codes: readonly string[] };

const answerSchema = z.object({
	success: z.boolean(),
	"error-codes": z.array(z.string()).optional(),
});

export interface VerifyDeps {
	readonly fetch: typeof fetch;
	/** `TURNSTILE_SECRET_KEY`, from `wrangler secret put`. */
	readonly secret: string | undefined;
	readonly timeoutMs?: number;
}

export async function verifyTurnstile(deps: VerifyDeps, token: unknown, remoteIp: string | null): Promise<TurnstileResult> {
	if (deps.secret === undefined || deps.secret === "") {
		return { ok: false, reason: "unavailable", codes: ["no-secret-configured"] };
	}
	// Turnstile tokens are at most 2048 characters (Cloudflare's docs).
	if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
		return { ok: false, reason: "missing-token", codes: [] };
	}
	const body = new URLSearchParams({ secret: deps.secret, response: token });
	if (remoteIp !== null) body.set("remoteip", remoteIp);
	let answer: unknown;
	try {
		const res = await deps.fetch(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(deps.timeoutMs ?? TIMEOUT_MS) });
		if (!res.ok) return { ok: false, reason: "unavailable", codes: [`http-${res.status}`] };
		answer = await res.json();
	} catch (error) {
		return { ok: false, reason: "unavailable", codes: [String(error).slice(0, 80)] };
	}
	const parsed = answerSchema.safeParse(answer);
	if (!parsed.success) return { ok: false, reason: "unavailable", codes: ["unreadable-answer"] };
	return parsed.data.success ? { ok: true } : { ok: false, reason: "rejected", codes: parsed.data["error-codes"] ?? [] };
}
