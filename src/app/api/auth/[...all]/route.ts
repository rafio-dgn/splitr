/**
 * Better Auth's own endpoints — sign-up, sign-in, sign-out, session, callbacks.
 *
 * `REQ-B.5`: this is the black box. We mount it and never look inside. The
 * catch-all segment name `[...all]` is Better Auth's documented convention.
 */
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
