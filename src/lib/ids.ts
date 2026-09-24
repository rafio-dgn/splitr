/**
 * Identifiers for Splitr's own rows.
 *
 * `schema.ts`'s convention is text ids. They're prefixed (`grp_`, `exp_`, `stl_`,
 * `li_`) so that a log line or a URL says what it points at, and `crypto`
 * comes from Web Crypto, available unchanged in the Workers runtime and in Node.
 */

/** A new row id, e.g. `grp_3f2b…`. Random UUIDv4, so it's unguessable. */
export function newId(prefix: "grp" | "exp" | "stl" | "li"): string {
	return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

const INVITE_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * A group's invite code: 10 characters from an alphabet without look-alikes
 * (no `0/O`, `1/l/I`), so it survives being read aloud or retyped.
 *
 * About 58 bits of entropy. The code is the only secret an invite link has,
 * and the public join page is rate-limited and Turnstile-protected later
 * (`REQ-F.2`). Rejection sampling avoids the modulo bias that `byte % 56`
 * would introduce.
 */
export function newInviteCode(): string {
	const limit = 256 - (256 % INVITE_ALPHABET.length);
	let code = "";
	while (code.length < 10) {
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		for (const byte of bytes) {
			if (byte < limit && code.length < 10) {
				code += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
			}
		}
	}
	return code;
}
