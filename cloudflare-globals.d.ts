/**
 * Real types for the Cloudflare bindings, without the DOM clash.
 *
 * **Why this file exists.** `wrangler types` is run with `--include-runtime=false`
 * (ADR-0015 §4), because the workerd runtime types redefine `Element` and break
 * the DOM lib that the client components need. That left every binding type
 * named in the generated `worker-configuration.d.ts`, and in OpenNext's
 * `CloudflareEnv`, **undefined**: `D1Database`, `KVNamespace`, `R2Bucket`,
 * `Ai` and `VectorizeIndex`. And because both are declaration files,
 * `skipLibCheck` hid the errors. **Every binding was silently `any`** until
 * 2026-09-24, when a type probe at D.7 showed it. No Cloudflare call had been
 * type-checked.
 *
 * The fix defines only those *names*, as global aliases of the **importable**
 * `@cloudflare/workers-types` entry, which uses exports rather than globals.
 * So nothing else (no `Element`, no `Response`) enters the global scope, and the
 * DOM lib is untouched.
 *
 * One deliberate mapping: Wrangler labels a Vectorize binding `VectorizeIndex`,
 * which is the **v1** API, but `splitr-search` was created by Wrangler 4 as a
 * **v2** index. So `VectorizeIndex` is aliased to the v2 class `Vectorize`, whose
 * `query()` takes `returnMetadata: "all" | "indexed" | "none"`.
 */
import type * as CF from "@cloudflare/workers-types/index.ts";

declare global {
	type D1Database = CF.D1Database;
	type KVNamespace<Key extends string = string> = CF.KVNamespace<Key>;
	type R2Bucket = CF.R2Bucket;
	type Ai<AiModelList extends CF.AiModelListType = CF.AiModels> = CF.Ai<AiModelList>;
	type VectorizeIndex = CF.Vectorize;
	type Fetcher<T extends CF.Rpc.EntrypointBranded | undefined = undefined> = CF.Fetcher<T>;
	type ImagesBinding = CF.ImagesBinding;
	type Queue<Body = unknown> = CF.Queue<Body>;
	type DurableObjectNamespace<T extends CF.Rpc.DurableObjectBranded | undefined = undefined> =
		CF.DurableObjectNamespace<T>;
	type Service<
		T extends (new (...args: never[]) => CF.Rpc.WorkerEntrypointBranded) | CF.Rpc.WorkerEntrypointBranded | undefined = undefined,
	> = CF.Service<T>;
}

export {};
