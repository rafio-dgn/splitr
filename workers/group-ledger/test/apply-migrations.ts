// Applies Splitr's real migrations (drizzle/0000, 0001) to the test D1 before
// the tests run, so the ledger is tested against the production schema.
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
