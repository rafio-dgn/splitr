// Removes what the verification scripts made (ADR-0024), everywhere it lands:
// D1 rows, the KV autofill key, R2 receipt photos and search vectors.
//
//   node scripts/verify/cleanup.mjs <BASE_URL>            sweep: every @example.test account and its groups
//   node scripts/verify/cleanup.mjs <BASE_URL> --dry-run  list what the sweep would delete, delete nothing
//
// The other scripts import `cleanup()` and call it in a `finally`, so it runs
// even when an assertion failed.
//
// Order matters. Everything is **collected from D1 first**, the copies outside
// D1 (vectors, R2, KV) are deleted next, and **D1 goes last**. If a step fails
// halfway, the D1 rows are still there, so a sweep can find the rest again.
//
// Known gap: a sweep finds R2 photos through `expense.receipt_key`. A photo
// uploaded but never saved with an expense isn't in D1, and `wrangler` has no
// R2 listing, so a sweep can't see it. The E2E, the only script that uploads,
// passes its photo's key in `receiptKeys` as soon as it's uploaded, so its own
// failures leave nothing behind.
import { pathToFileURL } from "node:url";

import { d1, sqlId, target, TEST_EMAIL_DOMAIN, wrangler } from "./lib.mjs";

const list = (values) => values.map(sqlId).join(", ");

/**
 * @param {{ local: boolean, emails?: string[], groupIds?: string[], receiptKeys?: string[], sweep?: boolean, dryRun?: boolean }} opts
 *   `emails` and `groupIds` for one run; `sweep` for every test account.
 *   `receiptKeys`: photos uploaded but possibly never saved (see the gap above).
 */
export function cleanup({ local, emails = [], groupIds = [], receiptKeys: uploaded = [], sweep = false, dryRun = false }) {
	for (const email of emails) {
		if (!email.endsWith(TEST_EMAIL_DOMAIN)) throw new Error(`cleanup only touches ${TEST_EMAIL_DOMAIN} accounts, not ${email}`);
	}

	// 1. Collect. Users by email; groups given, plus every group a test user created.
	const userFilter = sweep ? `email LIKE '%${TEST_EMAIL_DOMAIN}'` : emails.length > 0 ? `email IN (${list(emails)})` : "0";
	const [users] = d1(`SELECT id, email FROM user WHERE ${userFilter}`, { local });
	const userIds = users.map((u) => u.id);

	const groupFilter = [groupIds.length > 0 ? `id IN (${list(groupIds)})` : null, userIds.length > 0 ? `created_by IN (${list(userIds)})` : null].filter(Boolean).join(" OR ") || "0";
	const [groups] = d1(`SELECT id FROM "group" WHERE ${groupFilter}`, { local });
	const gids = groups.map((g) => g.id);

	if (userIds.length === 0 && gids.length === 0 && uploaded.length === 0) {
		console.log("cleanup: nothing to remove");
		return;
	}

	const inGroups = gids.length > 0 ? `IN (${list(gids)})` : "IN ('')";
	const [outsiders, expenses, items] = d1(
		// A real person in a test group would lose their history. Refuse instead.
		`SELECT m.group_id, u.email FROM group_member m JOIN user u ON u.id = m.user_id WHERE m.group_id ${inGroups} AND u.email NOT LIKE '%${TEST_EMAIL_DOMAIN}';
		 SELECT id, receipt_key FROM expense WHERE group_id ${inGroups};
		 SELECT li.id FROM line_item li JOIN expense e ON e.id = li.expense_id WHERE e.group_id ${inGroups};`,
		{ local },
	);
	if (outsiders.length > 0) {
		throw new Error(`cleanup refused: ${outsiders.length} non-test member(s) in a test group, e.g. ${outsiders[0].email} in ${outsiders[0].group_id}`);
	}

	// Vector ids are the expense's own id and each line item's (ADR-0022).
	const vectorIds = [...expenses.map((e) => e.id), ...items.map((i) => i.id)];
	const saved = expenses.map((e) => e.receipt_key).filter((k) => typeof k === "string" && k !== "");
	const receiptKeys = [...new Set([...saved, ...uploaded])];
	for (const key of receiptKeys) {
		// Only photos of the groups being removed, whatever the caller passed.
		if (!gids.some((gid) => key.startsWith(`receipts/${gid}/`))) throw new Error(`cleanup refused: ${key} isn't in a group being removed`);
	}

	console.log(`cleanup: ${users.length} user(s), ${gids.length} group(s), ${expenses.length} expense(s), ${vectorIds.length} vector id(s), ${receiptKeys.length} receipt(s)`);
	if (dryRun) {
		for (const u of users) console.log(`  user  ${u.email}`);
		for (const g of gids) console.log(`  group ${g}`);
		return;
	}

	// 2. Outside D1. Vectorize has no local simulation, and dev uses the real
	// bucket, so these two are remote whatever the target (wrangler.jsonc).
	// Vectorize applies mutations in order, so a delete queued after the
	// expense's upsert removes it even if the upsert isn't visible yet.
	for (let i = 0; i < vectorIds.length; i += 100) {
		wrangler(["vectorize", "delete-vectors", "splitr-search", "--ids", ...vectorIds.slice(i, i + 100)]);
	}
	for (const key of receiptKeys) {
		wrangler(["r2", "object", "delete", `splitr-receipts/${key}`, "--remote"]);
	}
	for (const gid of gids) {
		wrangler(["kv", "key", "delete", `recent-descriptions:v1:${gid}`, "--binding", "KV", local ? "--local" : "--remote"]);
	}

	// 3. D1, children before parents (every foreign key is ON DELETE restrict,
	// except session and account, which cascade from user).
	const inUsers = userIds.length > 0 ? `IN (${list(userIds)})` : "IN ('')";
	d1(
		`DELETE FROM line_item WHERE expense_id IN (SELECT id FROM expense WHERE group_id ${inGroups});
		 DELETE FROM expense_share WHERE expense_id IN (SELECT id FROM expense WHERE group_id ${inGroups});
		 DELETE FROM expense WHERE group_id ${inGroups};
		 DELETE FROM settlement WHERE group_id ${inGroups};
		 DELETE FROM group_member WHERE group_id ${inGroups} OR user_id ${inUsers};
		 DELETE FROM "group" WHERE id ${inGroups};
		 DELETE FROM user WHERE id ${inUsers};`,
		{ local },
	);

	// 4. Check, rather than trust the deletes.
	const [[left]] = d1(`SELECT (SELECT count(*) FROM user WHERE id ${inUsers}) + (SELECT count(*) FROM "group" WHERE id ${inGroups}) AS n`, { local });
	if (left.n !== 0) throw new Error(`cleanup left ${left.n} user/group row(s) behind`);
	console.log("cleanup: done, D1 re-checked (0 rows left)");
	// Not removed: the GroupLedger's idempotency entries for these groups. The
	// DO's alarm evicts them after 24 hours (ADR-0023), and nothing reads them.
}

// Run directly: the sweep.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const { local, flags } = target();
	try {
		cleanup({ local, sweep: true, dryRun: flags.includes("--dry-run") });
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}
