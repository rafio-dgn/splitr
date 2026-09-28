"use server";

/**
 * The join entry point. It's thin, like every other action: it authenticates
 * and delegates to `joinGroup()`, which holds the rules.
 *
 * `REQ-F.2` (ADR-0030): the Turnstile token is verified **here**, server-side,
 * before `joinGroup` runs. This is the one public form in Splitr, and a Server
 * Action is a public POST endpoint reachable without the page, so the widget
 * alone proves nothing: a forged or missing token is refused. It fails closed.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { joinGroup, type JoinGroupResult } from "@/lib/groups/join-group";
import { requireSession } from "@/lib/session";
import { verifyTurnstile } from "@/lib/turnstile/verify";

export type JoinOutcome =
	| Exclude<JoinGroupResult, { status: "joined" } | { status: "already-member" }>
	/** Turnstile refused the token: forged, missing, expired or reused. */
	| { readonly status: "not-verified" }
	/** Turnstile couldn't be reached or isn't configured, so the join fails closed. */
	| { readonly status: "verification-unavailable" };

/**
 * Called by the sign-up-then-join form, straight after `signUp` has set the
 * session cookie, and by the "Join" button for someone already signed in.
 * Success is a redirect; only the failures come back to the caller.
 */
export async function joinGroupAction(inviteCode: string, turnstileToken: unknown): Promise<JoinOutcome> {
	const session = await requireSession();

	const { env } = await getCloudflareContext({ async: true });
	// A secret, so read as possibly absent (see src/lib/ai/worker.ts on why `in`).
	const secret: unknown = "TURNSTILE_SECRET_KEY" in env ? env.TURNSTILE_SECRET_KEY : undefined;
	const check = await verifyTurnstile(
		{ fetch, secret: typeof secret === "string" ? secret : undefined },
		turnstileToken,
		(await headers()).get("cf-connecting-ip"),
	);
	if (!check.ok) {
		audit({
			actor: session.user.id,
			action: "group.join",
			target: "unknown",
			outcome: `refused:turnstile:${check.reason}`,
			persisted: false,
			detail: { codes: check.codes.join(",") },
		});
		return { status: check.reason === "unavailable" ? "verification-unavailable" : "not-verified" };
	}

	const result = await joinGroup(inviteCode, session.user.id);
	if (result.status === "joined") {
		redirect(`/groups/${result.groupId}?joined=1`);
	}
	if (result.status === "already-member") {
		redirect(`/groups/${result.groupId}`);
	}
	return result;
}
