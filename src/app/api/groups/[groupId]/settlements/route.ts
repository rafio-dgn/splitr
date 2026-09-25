/**
 * `POST /api/groups/[groupId]/settlements`: the stable curl target for
 * settlements, by the same reasoning as the expenses route (ADR-0010).
 *
 * A Server Action's id is build-generated and rotates, so it can't be the
 * target of a recorded command. E.2's evidence needs exactly that: **two
 * concurrent requests settling the same debt**, fired from a terminal. This
 * file holds no rule; it authenticates, hands the body to `recordSettlement`
 * (the same function the settle form reaches) and maps the result to a status.
 */
import { recordSettlement } from "@/lib/settlements/record-settlement";
import { getSession } from "@/lib/session";

export async function POST(
	request: Request,
	ctx: RouteContext<"/api/groups/[groupId]/settlements">,
): Promise<Response> {
	const session = await getSession();
	if (session === null) {
		return Response.json({ error: "unauthenticated" }, { status: 401, headers: { "cache-control": "no-store" } });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "invalid", formErrors: ["Body must be valid JSON."] }, { status: 400 });
	}

	const { groupId } = await ctx.params;
	// The URL is authoritative for `groupId`; a body field of that name is overwritten.
	const input = typeof body === "object" && body !== null ? { ...body, groupId } : { groupId };
	// REQ-E.2: the key arrives as a HEADER named `idempotencyKey`. Header
	// names are case-insensitive in HTTP, and `Headers.get` handles that.
	const idempotencyKey = request.headers.get("idempotencyKey");
	const { result, ledgerBody, replayed } = await recordSettlement(input, { id: session.user.id }, idempotencyKey);

	const status = (() => {
		switch (result.status) {
			case "settled":
				return 201;
			// A refusal is a *correct* outcome for the ledger, not a malformed
			// request: 409 Conflict, with the reason in the body.
			case "already-settled":
			case "exceeds":
			case "recipient-not-owed":
				return 409;
			case "invalid":
				return 400;
			case "not-found":
				return 404;
			case "failed":
				return 503;
		}
	})();

	const headers: Record<string, string> = { "content-type": "application/json", "cache-control": "no-store" };
	if (idempotencyKey !== null) {
		headers["idempotency-replayed"] = String(replayed);
	}
	// The ledger's exact body when there is one, so a replay is byte-for-byte
	// the original response (REQ-E.2), not a re-serialisation of it.
	return new Response(ledgerBody ?? JSON.stringify(result.status === "not-found" ? { error: "not-found" } : result.status === "failed" ? { error: "unavailable" } : result), { status, headers });
}
