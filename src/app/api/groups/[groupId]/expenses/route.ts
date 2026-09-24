/**
 * `POST /api/groups/[groupId]/expenses` — the stable entry point that makes
 * `REQ-B.2` demonstrable.
 *
 * Its whole reason to exist is ADR-0010: a Server Action is addressed by a
 * build-generated, encrypted action id that Next.js rotates at least every 14
 * days, so it cannot be the target of a recorded curl command. A Route Handler
 * has a stable URL.
 *
 * **This file contains no validation.** It authenticates, hands the untrusted
 * body to `addExpense`, and maps the result to a status code. Every rule lives
 * in the service, which is also what the form calls — if a rule ever appears
 * here, the curl stops being evidence of anything the form does.
 */
import { addExpense } from "@/lib/expenses/add-expense";
import { getSession } from "@/lib/session";

export async function POST(
	request: Request,
	ctx: RouteContext<"/api/groups/[groupId]/expenses">,
): Promise<Response> {
	const session = await getSession();
	if (session === null) {
		return Response.json(
			{ error: "unauthenticated" },
			{ status: 401, headers: { "cache-control": "no-store" } },
		);
	}

	// `request.json()` throws on a malformed body. A thrown parse error would
	// surface as a 500, which would say "the server broke" about a request that
	// was simply wrong.
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ error: "invalid", formErrors: ["Body must be valid JSON."] },
			{ status: 400 },
		);
	}

	const { groupId } = await ctx.params;

	// The URL is authoritative for `groupId`; a body field of the same name is
	// overwritten rather than trusted. `body` is still `unknown` here, so it is
	// spread only after being narrowed to a non-null object.
	const input =
		typeof body === "object" && body !== null
			? { ...body, groupId }
			: { groupId };

	const result = await addExpense(input, {
		id: session.user.id,
		email: session.user.email,
	});

	switch (result.status) {
		case "invalid":
			return Response.json(
				{
					error: "invalid",
					fieldErrors: result.fieldErrors,
					formErrors: result.formErrors,
				},
				{ status: 400 },
			);
		case "not-found":
			// 404, not 403 — see `addExpense`.
			return Response.json({ error: "not-found" }, { status: 404 });
		case "accepted":
			// 201: the expense exists in D1, and its id is in the body and in
			// `Location`. Until REQ-D.1 this was a 202 that said nothing was stored.
			return Response.json(
				{
					status: "accepted",
					persisted: result.persisted,
					id: result.expenseId,
					expense: result.expense,
					shares: result.shares,
				},
				{
					status: 201,
					headers: { location: `/groups/${groupId}/expenses/${result.expenseId}` },
				},
			);
		case "failed":
			// The only 5xx: the database, not the request. Nothing was written.
			return Response.json({ error: "unavailable" }, { status: 503 });
	}
}
