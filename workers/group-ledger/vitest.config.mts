// The ledger's invariant tests run INSIDE workerd, against a real Durable
// Object and a real (local) D1 carrying Splitr's actual migrations. ADR-0012:
// "mocking a Durable Object proves nothing about a Durable Object".
import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
	const migrations = await readD1Migrations(path.join(import.meta.dirname, "../../drizzle"));
	return {
		plugins: [
			cloudflareTest({
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
			}),
		],
		test: { setupFiles: ["./test/apply-migrations.ts"] },
	};
});
