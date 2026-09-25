/**
 * Compile-time only: Wrangler's generated `Env` (from this Worker's
 * wrangler.jsonc) must satisfy the hand-declared `LedgerEnv`. If a binding is
 * renamed or removed in the config, this file stops compiling in the ledger's
 * program. It's never imported, and it emits nothing.
 */
import type { LedgerEnv } from "./index";

export type EnvMatchesConfig = Env extends LedgerEnv ? true : never;
export const envMatchesConfig: EnvMatchesConfig = true;
