/**
 * The browser half of Better Auth.
 *
 * Imported only by Client Components. `signUp.email`, `signIn.email` and
 * `signOut` post to the handler mounted at `/api/auth/[...all]`; the library
 * owns the request, the cookie and the session. We own neither.
 */
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
