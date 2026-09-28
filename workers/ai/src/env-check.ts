/**
 * Compile-time only, as in the ledger: Wrangler's generated `Env` (from this
 * Worker's wrangler.jsonc, plus the secret declared in `.dev.vars`) must
 * satisfy the hand-declared `AiEnv`. It's never imported, and emits nothing.
 */
import type { AiEnv } from "./index";

// Every binding must match, except VECTORIZE's label: Wrangler says v1
// `VectorizeIndex`, the index is v2 `Vectorize` (see AiEnv). Its presence is
// still checked.
export type EnvMatchesConfig = Omit<Env, "VECTORIZE"> extends Omit<AiEnv, "VECTORIZE"> ? ("VECTORIZE" extends keyof Env ? true : never) : never;
export const envMatchesConfig: EnvMatchesConfig = true;
