/**
 * "Read receipt" (D.6, ADR-0021): an uploaded photo → a draft the user confirms.
 *
 * - The photo is checked exactly as on attach (this group's prefix, exists, an
 *   image, ≤10 MB), and then read through the R2 **binding**. The model takes
 *   images only as a base64 `data:` URI, never a URL, so this one step passes
 *   the bytes through the Worker. That's allowed: ADR-0020's rule is about the
 *   *upload*, which still goes straight to R2.
 * - The model is **Llama 4 Scout** with **JSON mode**, Raffaele's choice from
 *   the spike: 5/6 totals and 12/12 valid JSON. Since ADR-0025 step 5 it runs
 *   in `splitr-ai`, which also validates the draft; the prompt is in
 *   `src/lib/ai/ops.ts`.
 * - **Any failure is a `null` draft**, never an error the page must handle:
 *   the form simply stays as it was, and the user types the expense (REQ-M.7).
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { withBudget } from "@/lib/ai/budget";
import type { ReadReceiptResponse } from "@/lib/ai/contract";
import { aiWorker } from "@/lib/ai/worker";

import type { ReceiptDraft } from "./draft";
import { checkUploadedReceipt } from "./receipts";

/** Past this, the user is better off typing. A slow read must not feel like a hang (ADR-0025 §4). */
const TIMEOUT_MS = 30_000;

export type ReadReceiptResult =
	| { readonly ok: true; readonly draft: ReceiptDraft; readonly ms: number }
	| { readonly ok: false; readonly reason: "bad-photo" | "unreadable" | "timeout" | "unavailable"; readonly ms: number };

export async function readReceipt(groupId: string, key: string): Promise<ReadReceiptResult> {
	const started = Date.now();
	const elapsed = (): number => Date.now() - started;

	const check = await checkUploadedReceipt(groupId, key);
	if (!check.ok) {
		return { ok: false, reason: "bad-photo", ms: elapsed() };
	}

	const { env } = await getCloudflareContext({ async: true });
	const object = await env.RECEIPTS.get(key);
	if (object === null) {
		return { ok: false, reason: "bad-photo", ms: elapsed() };
	}
	const type = object.httpMetadata?.contentType ?? "image/jpeg";
	const image = `data:${type};base64,${Buffer.from(await object.arrayBuffer()).toString("base64")}`;

	// The model runs in splitr-ai (ADR-0016 §6, ADR-0025 step 5); the budget stays
	// here, because it's what the person waiting experiences.
	const ai = await aiWorker();
	if (ai === null) {
		return { ok: false, reason: "unavailable", ms: elapsed() };
	}
	try {
		const call = async (): Promise<ReadReceiptResponse> => ai.worker.readReceipt(ai.secret, { image });
		const answer = await withBudget(call(), TIMEOUT_MS);
		if (!answer.ok) {
			return { ok: false, reason: "timeout", ms: elapsed() };
		}
		if (answer.value.status !== "ok") {
			console.log(`[receipt] read-${answer.value.status}`);
			return { ok: false, reason: "unavailable", ms: elapsed() };
		}
		const { draft } = answer.value;
		return draft === null ? { ok: false, reason: "unreadable", ms: elapsed() } : { ok: true, draft, ms: elapsed() };
	} catch (error) {
		console.log(`[receipt] read-failed ${String(error).slice(0, 160)}`);
		return { ok: false, reason: "unavailable", ms: elapsed() };
	}
}
