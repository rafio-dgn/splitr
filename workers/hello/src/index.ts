/**
 * REQ-C.2 and REQ-C.3's throwaway Worker: the whole lifecycle in one small file.
 *
 * Scaffolded with `npm create cloudflare@latest`, and deleted at build-plan step
 * C.5. Routes:
 *
 *   GET  /            the var (`GREETING`), which is public configuration
 *   GET  /secret      the secret (`HELLO_KEY`), which only guards; it's never echoed
 *   POST /categorise  the first edge LLM call (REQ-C.3). Also guarded by HELLO_KEY
 *   anything else     404
 *
 * `/categorise` is a **spike**, not a feature (ADR-0016 §12). It's a no-RAG
 * line-item categoriser over Splitr's closed taxonomy, built to measure the 8B
 * model's latency, output format and failure modes before E.4 is designed. It
 * doubles as the eval's without-retrieval baseline.
 *
 * Every request logs one JSON line, so `wrangler tail` has something to show.
 */

/**
 * The course names `@cf/meta/llama-3.1-8b-instruct`. It was deprecated on
 * 2026-05-30 and every call fails with AiError 5028 (measured). This is the
 * same model, quantised to FP8 (ADR-0017). It's one constant, so the next
 * deprecation is a one-line change.
 */
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

/**
 * Splitr's closed taxonomy (ADR-0016 §4): the answers the model may give.
 * `uncategorised` is deliberately absent. It's a system state ("not yet
 * answered, or the answer was unusable") and never a model answer.
 */
const CATEGORIES = {
	groceries: "food and household consumables bought to take home",
	eating_out: "restaurants, cafes, takeaway and delivered meals",
	drinks: "bars, pubs, alcohol and drinks while out",
	transport: "taxis, fuel, parking, public transport, tolls",
	travel_lodging: "hotels, flights, rentals, holiday accommodation",
	household: "furniture, cleaning, repairs, things for the home",
	utilities_bills: "electricity, gas, water, internet, phone, subscriptions",
	entertainment: "cinema, events, tickets, games, activities",
	health_personal: "pharmacy, toiletries, haircuts, medical",
	gifts: "presents bought for someone",
	other: "anything that fits none of the above",
} as const;

type Category = keyof typeof CATEGORIES;
type Outcome = Category | "uncategorised";

function isCategory(value: string): value is Category {
	return Object.hasOwn(CATEGORIES, value);
}

const SYSTEM_PROMPT = [
	"You categorise one line item from a shared-expense receipt.",
	"Answer with exactly one category key from this list and nothing else:",
	...Object.entries(CATEGORIES).map(([key, meaning]) => `- ${key}: ${meaning}`),
	"No explanation, no punctuation, no quotes. Only the key.",
].join("\n");

/**
 * Turns the model's free text into a category, or admits it can't.
 *
 * `-fp8` has no JSON mode (AiError 5025, measured), so structure is enforced
 * here: normalise, take the first key-shaped token, and check it against the
 * closed list. Anything else is `uncategorised`, never a guess. Model output is
 * untrusted input, the same stance REQ-M.7 takes towards the whole AI Worker.
 */
function parseCategory(raw: string): Outcome {
	const token = raw.trim().toLowerCase().match(/[a-z_]+/)?.[0] ?? "";
	return isCategory(token) ? token : "uncategorised";
}

/** Constant-time comparison. See `/secret` below. */
function keysMatch(presented: string, expected: string): boolean {
	const encoder = new TextEncoder();
	const a = encoder.encode(presented);
	const b = encoder.encode(expected);
	if (a.byteLength !== b.byteLength) {
		return false;
	}
	return crypto.subtle.timingSafeEqual(a, b);
}

/**
 * Checks `x-hello-key` against `HELLO_KEY`. Returns an error response, or
 * `null` when the caller may proceed.
 *
 * `env.HELLO_KEY` is typed `string` by the generated Env, but a secret that
 * was never `put` is simply absent at runtime. Reporting that as a server
 * misconfiguration rather than a mismatch keeps the two failures
 * distinguishable in `wrangler tail`.
 */
function requireKey(request: Request, env: Env): Response | null {
	const expected: string | undefined = env.HELLO_KEY;
	if (expected === undefined || expected === "") {
		return json({ error: "HELLO_KEY is not configured" }, 500);
	}
	if (!keysMatch(request.headers.get("x-hello-key") ?? "", expected)) {
		return json({ ok: false, error: "wrong or missing x-hello-key" }, 401);
	}
	return null;
}

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status });
}

/** Reads `{ "item": "<receipt line>" }`, or returns why it can't. */
async function readItem(request: Request): Promise<string | Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "body must be JSON: {\"item\": \"...\"}" }, 400);
	}
	if (typeof body !== "object" || body === null || !("item" in body) || typeof body.item !== "string") {
		return json({ error: "body must be JSON: {\"item\": \"...\"}" }, 400);
	}
	const item = body.item.trim();
	if (item === "" || item.length > 200) {
		return json({ error: "item must be 1-200 characters" }, 400);
	}
	return item;
}

async function categorise(request: Request, env: Env): Promise<Response> {
	const denied = requireKey(request, env);
	if (denied !== null) {
		return denied;
	}
	const item = await readItem(request);
	if (item instanceof Response) {
		return item;
	}

	const started = Date.now();
	try {
		const result = await env.AI.run(MODEL, {
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{ role: "user", content: item },
			],
			// A key is at most a few tokens. A low cap also bounds the cost of
			// a model that decides to explain itself.
			max_tokens: 12,
			// Deterministic-ish, so repeated eval runs are comparable. It's not
			// a guarantee: the spike measures how stable it actually is.
			temperature: 0,
			seed: 42,
		});
		const raw = result.response ?? "";
		const category = parseCategory(raw);
		return json({
			item,
			category,
			valid: category !== "uncategorised",
			raw,
			model: MODEL,
			ms: Date.now() - started,
			usage: result.usage ?? null,
		});
	} catch (error) {
		// The AI failing is an expected state, not a crash. The caller gets
		// `uncategorised`, which is exactly what Splitr's write path will do.
		return json(
			{ item, category: "uncategorised", valid: false, error: String(error), model: MODEL, ms: Date.now() - started },
			502,
		);
	}
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		let response: Response;

		if (url.pathname === "/" && request.method === "GET") {
			response = json({ greeting: env.GREETING });
		} else if (url.pathname === "/secret" && request.method === "GET") {
			response =
				requireKey(request, env) ??
				json({ ok: true, message: "The secret matched. Its value is not in this response." });
		} else if (url.pathname === "/categorise" && request.method === "POST") {
			response = await categorise(request, env);
		} else {
			response = json({ error: "not found" }, 404);
		}

		// One structured line per request. The key itself is never logged.
		console.log(
			JSON.stringify({
				worker: "splitr-hello",
				method: request.method,
				path: url.pathname,
				status: response.status,
				colo: request.cf?.colo ?? null,
			}),
		);
		return response;
	},
} satisfies ExportedHandler<Env>;
