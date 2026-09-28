import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";

/**
 * A one-shot confirmation carried across a redirect (ADR-0033 §toasts).
 *
 * A Server Action sets it just before `redirect()`. The `(app)` layout reads it
 * during the next server render and hands it to `<Toaster>` as a prop, so the
 * toast arrives inside the HTML: no client fetch, and `REQ-B.3` still holds.
 *
 * Next.js 16 can't delete a cookie during a Server Component render (only in a
 * Server Function or Route Handler; see the `cookies` docs under
 * `node_modules/next/dist/docs/`). So the cookie is **not** `httpOnly`: the
 * Toaster clears it in the browser once shown, and a 30-second `maxAge` covers
 * the case where it never renders. It holds UI copy only, never anything
 * private.
 *
 * The redirect targets stay exactly as they were: the E2E waits for
 * `/groups/<id>` with no query string.
 */
export const FLASH_COOKIE = "splitr_flash";

const flashSchema = z.object({
	id: z.string().min(1).max(64),
	title: z.string().min(1).max(80),
	detail: z.string().max(160).optional(),
});

export type Flash = z.infer<typeof flashSchema>;

/** Call from a Server Action, before `redirect()`. */
export async function setFlash(title: string, detail?: string): Promise<void> {
	// Trimmed to the schema's limits, so a long expense description can't make
	// `readFlash` refuse its own cookie.
	const flash: Flash = { id: crypto.randomUUID(), title: title.slice(0, 80), detail: detail?.slice(0, 160) };
	(await cookies()).set(FLASH_COOKIE, JSON.stringify(flash), {
		path: "/",
		maxAge: 30,
		sameSite: "lax",
		httpOnly: false,
	});
}

/** Read during a server render. A malformed cookie is ignored, never an error. */
export async function readFlash(): Promise<Flash | null> {
	const raw = (await cookies()).get(FLASH_COOKIE)?.value;
	if (raw === undefined) return null;
	try {
		const parsed = flashSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
