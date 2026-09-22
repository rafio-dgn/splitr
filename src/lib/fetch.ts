/**
 * Typed JSON fetch helper.
 *
 * ⚠️ Read this before using it.
 *
 * `T` is an **assertion**, not a validation. TypeScript's types are erased at
 * compile time — nothing at runtime checks that the server actually returned a
 * `T`. `fetchJson<User>(url)` will happily hand you `{ nonsense: true }` typed
 * as `User`, and the first property access will be `undefined`.
 *
 * That is the whole point of the exercise: the compiler checks your code, but it
 * never runs it, so it cannot check someone else's server.
 *
 * Where the shape genuinely matters, validate at runtime — Cluster B introduces
 * a shared zod schema for exactly this. Use `fetchJson` for responses you
 * control or where a wrong shape is harmless.
 */

/** Thrown when the server responds with a non-2xx status. */
export class HttpError extends Error {
	constructor(
		readonly status: number,
		readonly statusText: string,
		readonly body: string,
	) {
		super(`HTTP ${status} ${statusText}`);
		this.name = "HttpError";
	}
}

/** Thrown when a 2xx response body is not valid JSON. */
export class JsonParseError extends Error {
	constructor(readonly body: string, readonly cause: unknown) {
		super("Response was not valid JSON");
		this.name = "JsonParseError";
	}
}

export async function fetchJson<T>(
	url: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(url, {
		...init,
		headers: { accept: "application/json", ...init?.headers },
	});

	// Read the body once, as text. `response.json()` on an error response would
	// throw a parse error that masks the real problem — the status code.
	const body = await response.text();

	if (!response.ok) {
		throw new HttpError(response.status, response.statusText, body);
	}

	// 204 No Content and an empty body have nothing to parse. The caller asked
	// for a T, so this is their problem to type correctly — but throwing a clear
	// error beats `JSON.parse("")` blowing up with "Unexpected end of input".
	if (body === "") {
		throw new JsonParseError(body, new Error("Empty response body"));
	}

	try {
		// The one unchecked cast in this file, and the reason for the warning above.
		return JSON.parse(body) as T;
	} catch (cause) {
		throw new JsonParseError(body, cause);
	}
}
