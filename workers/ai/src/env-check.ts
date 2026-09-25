/**
 * Compile-time only, as in the ledger: Wrangler's generated `Env` (from this
 * Worker's wrangler.jsonc, plus the secret declared in `.dev.vars`) must
 * satisfy the hand-declared `AiEnv`. It's never imported, and emits nothing.
 */
import type { AiEnv } from "./index";

export type EnvMatchesConfig = Env extends AiEnv ? true : never;
export const envMatchesConfig: EnvMatchesConfig = true;
