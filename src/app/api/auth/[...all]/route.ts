/**
 * Better Auth's own endpoints — sign-up, sign-in, sign-out, session, callbacks.
 *
 * `REQ-B.5`: this is the black box. We mount it and never look inside. The
 * catch-all segment name `[...all]` is Better Auth's documented convention.
 */
import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

/**
 * `toNextJsHandler` takes either a configured instance or a bare request
 * handler. It gets the handler, because the instance cannot be built until a
 * request supplies the D1 binding (ADR-0015) — and resolving it inside the
 * lambda is exactly that.
 */
export const { GET, POST } = toNextJsHandler(async (request: Request) => {
	const auth = await getAuth();
	return auth.handler(request);
});
