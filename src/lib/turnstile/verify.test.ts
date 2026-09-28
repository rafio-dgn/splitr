// Turnstile's server-side check (REQ-F.2): forged, missing and unverifiable tokens are all refused.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SITEVERIFY_URL, verifyTurnstile } from "./verify.ts";

/** A fake fetch that records the call and answers as given. */
function fakeFetch(answer: unknown, opts: { status?: number; throws?: boolean; delayMs?: number } = {}) {
	const calls: { url: string; body: string }[] = [];
	const fn: typeof fetch = async (input, init) => {
		calls.push({ url: String(input), body: String(init?.body) });
		if (opts.delayMs) {
			await new Promise((resolve, reject) => {
				const t = setTimeout(resolve, opts.delayMs);
				init?.signal?.addEventListener("abort", () => (clearTimeout(t), reject(new Error("TimeoutError"))));
			});
		}
		if (opts.throws) throw new Error("network down");
		return new Response(JSON.stringify(answer), { status: opts.status ?? 200 });
	};
	return { fn, calls };
}

describe("verifyTurnstile", () => {
	it("accepts a token siteverify confirms, sending the secret, the token and the visitor's IP", async () => {
		const f = fakeFetch({ success: true });
		assert.deepEqual(await verifyTurnstile({ fetch: f.fn, secret: "s3cret" }, "tok", "203.0.113.7"), { ok: true });
		assert.equal(f.calls[0]?.url, SITEVERIFY_URL);
		assert.equal(f.calls[0]?.body, "secret=s3cret&response=tok&remoteip=203.0.113.7");
	});

	it("refuses a forged token, with Cloudflare's error codes", async () => {
		const f = fakeFetch({ success: false, "error-codes": ["invalid-input-response"] });
		assert.deepEqual(await verifyTurnstile({ fetch: f.fn, secret: "s" }, "forged", null), { ok: false, reason: "rejected", codes: ["invalid-input-response"] });
	});

	it("refuses a missing, empty or oversized token without calling Cloudflare", async () => {
		const f = fakeFetch({ success: true });
		for (const token of [undefined, "", 42, "x".repeat(2049)]) {
			assert.equal((await verifyTurnstile({ fetch: f.fn, secret: "s" }, token, null)).ok, false);
		}
		assert.equal(f.calls.length, 0);
	});

	it("fails closed: no secret, an outage, a 5xx, an unreadable answer and a timeout all refuse", async () => {
		const reasons = await Promise.all([
			verifyTurnstile({ fetch: fakeFetch({ success: true }).fn, secret: undefined }, "tok", null),
			verifyTurnstile({ fetch: fakeFetch({}, { throws: true }).fn, secret: "s" }, "tok", null),
			verifyTurnstile({ fetch: fakeFetch({}, { status: 503 }).fn, secret: "s" }, "tok", null),
			verifyTurnstile({ fetch: fakeFetch({ nope: 1 }).fn, secret: "s" }, "tok", null),
			verifyTurnstile({ fetch: fakeFetch({ success: true }, { delayMs: 200 }).fn, secret: "s", timeoutMs: 20 }, "tok", null),
		]);
		assert.deepEqual(reasons.map((r) => (r.ok ? "ok" : r.reason)), ["unavailable", "unavailable", "unavailable", "unavailable", "unavailable"]);
	});
});
