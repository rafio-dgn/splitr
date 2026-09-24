/**
 * Receipt photos in R2, uploaded by the browser **directly** through a
 * presigned URL, so the bytes never pass through the Worker (`REQ-D.3`,
 * ADR-0020).
 *
 * Why it bypasses the Worker: a phone photo is several megabytes, a Worker has
 * 128 MB of memory shared by everything it does, and every byte streamed
 * through it would be billed as Worker time. A presigned URL makes R2 the
 * endpoint. The Worker only signs a narrow, short-lived capability, and it
 * stores just the object key.
 *
 * Signing uses `aws4fetch` (Cloudflare's documented R2 example). It's tiny,
 * and it's already in the bundle through OpenNext.
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AwsClient } from "aws4fetch";

/** The only types a receipt may be, and the extension its key gets. */
export const RECEIPT_TYPES = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
} as const;

export type ReceiptType = keyof typeof RECEIPT_TYPES;

export function isReceiptType(value: string): value is ReceiptType {
	return Object.hasOwn(RECEIPT_TYPES, value);
}

/** 10 MB. A presigned PUT can't pin the size, so it's enforced on attach instead. */
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/** A presigned URL lives this long: long enough to upload one photo on a slow phone. */
const URL_TTL_SECONDS = 5 * 60;

/** Server-chosen and group-scoped, so a client can never name, overwrite or escape a key. */
function newReceiptKey(groupId: string, type: ReceiptType): string {
	return `receipts/${groupId}/${crypto.randomUUID().replaceAll("-", "")}.${RECEIPT_TYPES[type]}`;
}

/** The exact shape a key for this group must have. Anything else is refused before R2 is asked. */
function isKeyForGroup(groupId: string, key: string): boolean {
	const escaped = groupId.replace(/[^A-Za-z0-9_]/g, "");
	return escaped === groupId && new RegExp(`^receipts/${escaped}/[0-9a-f]{32}\\.(jpg|png|webp)$`).test(key);
}

async function r2(): Promise<{ client: AwsClient; objectUrl: (key: string) => string; bucket: CloudflareEnv["RECEIPTS"] }> {
	const { env } = await getCloudflareContext({ async: true });
	// Typed `string` by the generated Env, but a secret that was never `put`
	// is simply absent. Better a clear configuration error than an R2 403.
	const accessKeyId: string | undefined = env.R2_ACCESS_KEY_ID;
	const secretAccessKey: string | undefined = env.R2_SECRET_ACCESS_KEY;
	if (!accessKeyId || !secretAccessKey) {
		throw new Error("R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not configured (wrangler secret put, .dev.vars locally)");
	}
	return {
		client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }),
		objectUrl: (key) => `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}`,
		bucket: env.RECEIPTS,
	};
}

/**
 * A presigned PUT for one new receipt: PUT only, `Content-Type` pinned (a
 * different type fails with `SignatureDoesNotMatch`, verified), five minutes. The
 * caller must already have checked group membership.
 */
export async function presignReceiptUpload(groupId: string, type: ReceiptType): Promise<{ key: string; url: string }> {
	const { client, objectUrl } = await r2();
	const key = newReceiptKey(groupId, type);
	const signed = await client.sign(
		new Request(`${objectUrl(key)}?X-Amz-Expires=${URL_TTL_SECONDS}`, {
			method: "PUT",
			headers: { "Content-Type": type },
		}),
		// `allHeaders` is what actually pins the Content-Type. By default
		// aws4fetch treats `content-type` as unsignable and signs only `host`,
		// so R2 accepted a `text/html` PUT on a URL "for" `image/png`. That was
		// measured, 2026-09-24. Cloudflare's own aws4fetch example has the same
		// gap, and R2's "the type is pinned" note is about the AWS SDKs.
		{ aws: { signQuery: true, allHeaders: true } },
	);
	return { key, url: signed.url };
}

/**
 * A presigned GET for showing a receipt, so viewing doesn't stream through the
 * Worker either. Five minutes, which is plenty for a page view.
 */
export async function presignReceiptView(key: string): Promise<string> {
	const { client, objectUrl } = await r2();
	const signed = await client.sign(new Request(`${objectUrl(key)}?X-Amz-Expires=${URL_TTL_SECONDS}`), {
		aws: { signQuery: true },
	});
	return signed.url;
}

export type ReceiptCheck =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: "wrong-group" | "missing" | "too-large" | "wrong-type" };

/**
 * Checked when an expense is saved with a receipt: before the key is stored,
 * through the R2 **binding** (no HTTP, no credentials). The key must be this
 * group's, the object must exist, and its size and type must be allowed. A
 * failing object is deleted, so a rejected upload doesn't linger.
 */
export async function checkUploadedReceipt(groupId: string, key: string): Promise<ReceiptCheck> {
	if (!isKeyForGroup(groupId, key)) {
		return { ok: false, reason: "wrong-group" };
	}
	const { bucket } = await r2();
	const head = await bucket.head(key);
	if (head === null) {
		return { ok: false, reason: "missing" };
	}
	const type = head.httpMetadata?.contentType ?? "";
	if (head.size > MAX_RECEIPT_BYTES || !isReceiptType(type)) {
		await bucket.delete(key);
		return { ok: false, reason: head.size > MAX_RECEIPT_BYTES ? "too-large" : "wrong-type" };
	}
	return { ok: true };
}
