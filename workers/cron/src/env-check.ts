/**
 * Compile-time only, as in the other Workers: Wrangler's generated `Env` must
 * satisfy the hand-declared `CronEnv`. It's never imported, and emits nothing.
 */
import type { CronEnv } from "./index";

export type EnvMatchesConfig = Env extends CronEnv ? true : never;
export const envMatchesConfig: EnvMatchesConfig = true;
