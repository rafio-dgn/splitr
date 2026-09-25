// The test-only binding carrying the D1 migrations (vitest.config.mts).
declare namespace Cloudflare {
	interface Env {
		TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
	}
}
