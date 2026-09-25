/**
 * "Read receipt" (D.6, ADR-0021): an uploaded photo → a draft the user confirms.
 *
 * - The photo is checked exactly as on attach (this group's prefix, exists, an
 *   image, ≤10 MB), and then read through the R2 **binding**. The model takes
 *   images only as a base64 `data:` URI, never a URL, so this one step passes
 *   the bytes through the Worker. That's allowed: ADR-0020's rule is about the
 *   *upload*, which still goes straight to R2.
 * - The model is **Llama 4 Scout** with **JSON mode**, Raffaele's choice from
 *   the spike: 5/6 totals and 12/12 valid JSON.
 * - **Any failure is a `null` draft**, never an error the page must handle:
 *   the form simply stays as it was, and the user types the expense (REQ-M.7).
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { RECEIPT_JSON_SCHEMA, toReceiptDraft, type ReceiptDraft } from "./draft";
import { checkUploadedReceipt } from "./receipts";

export const RECEIPT_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

/** Past this, the user is better off typing. A slow read must not feel like a hang. */
const TIMEOUT_MS = 30_000;

/**
 * Prompt v1 from the spike (`scripts/vision-spike/run.mjs`), which gave
 * Scout its best item score (14/14). v2's extra rules didn't improve Scout,
 * and they broke the smaller model. JSON mode now carries the shape.
 */
const PROMPT = `You are reading a photo of a shop or restaurant receipt.
Return ONLY a JSON object with "merchant", "date" (YYYY-MM-DD or null), "total" and "items".
Rules:
- "total" is the final amount paid, as printed, after tax, discounts and rounding.
- "items" are the purchased lines only. Do NOT include subtotal, tax, GST, rounding, cash, change, card or payment lines.
- Each item has "raw" (the line's text exactly as printed), "description" (the same item in plain English, with abbreviations expanded) and "amount" (the line's total price as printed).
- Use plain numbers without currency symbols.`;

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

	try {
		const answer = await Promise.race([
			env.AI.run(RECEIPT_MODEL, {
				messages: [
					{
						role: "user",
						content: [
							{ type: "text", text: PROMPT },
							{ type: "image_url", image_url: { url: image } },
						],
					},
				],
				response_format: { type: "json_schema", json_schema: RECEIPT_JSON_SCHEMA },
				max_tokens: 1024,
				temperature: 0,
			}),
			new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), TIMEOUT_MS)),
		]);
		if (answer === "timeout") {
			return { ok: false, reason: "timeout", ms: elapsed() };
		}
		const draft = toReceiptDraft(answer.response);
		return draft === null ? { ok: false, reason: "unreadable", ms: elapsed() } : { ok: true, draft, ms: elapsed() };
	} catch (error) {
		console.log(`[receipt] read-failed ${String(error).slice(0, 160)}`);
		return { ok: false, reason: "unavailable", ms: elapsed() };
	}
}
