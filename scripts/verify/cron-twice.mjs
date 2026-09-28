// REQ-E.6's proof: run the nightly sweep twice, and the result is identical.
//
//   node scripts/verify/cron-twice.mjs http://localhost:3100                        local (next dev, the ledger, splitr-ai)
//   node scripts/verify/cron-twice.mjs https://splitr.raffaele-digennaro.workers.dev  production (runs the cron with --remote)
//
// It sets up a real debt, then simulates the two failures the cron exists for:
// a line item left `uncategorised`, and an expense whose indexing was never
// recorded. After run 1 all three must be fixed (a reminder, the category, the
// index); after run 2 the snapshot must be byte-identical. It cleans up even on failure.
import { runCron } from "../cron-run.mjs";
import { cleanup } from "./cleanup.mjs";
import { addExpense, Client, d1, expect, insertGroup, runId, signUp, sleep, sqlId, target, testPassword, todayUtc } from "./lib.mjs";

const { baseUrl, local } = target();
const run = runId("cron");
const emails = [`alice.${run}@example.test`, `bob.${run}@example.test`];
const groupIds = [];
let failed = false;

console.log(`cron-twice ${run} → ${baseUrl}${local ? "" : " (the sweep runs on PRODUCTION)"}`);
try {
	const alice = new Client(baseUrl);
	const bob = new Client(baseUrl);
	const aliceId = await signUp(alice, { name: "Alice Cron", email: emails[0], password: testPassword() });
	const bobId = await signUp(bob, { name: "Bob Cron", email: emails[1], password: testPassword() });
	const groupId = insertGroup({ name: `Cron ${run}`, createdBy: aliceId, memberIds: [aliceId, bobId], local });
	groupIds.push(groupId);
	const g = sqlId(groupId);

	// A real debt: Bob pays £80 for both, so Alice owes him £40. The receipt carries one line item.
	const res = await bob.request("POST", `/api/groups/${groupId}/expenses`, {
		json: {
			description: "Cron dinner",
			amount: "80.00",
			currency: "GBP",
			spentAt: todayUtc(),
			paidById: bobId,
			participantIds: [aliceId, bobId],
			amountConfirmed: "yes",
			lineItems: [{ rawText: "SEMI SKMD MILK", description: "Semi-skimmed milk", amountMinorUnits: 180 }],
		},
	});
	expect(res.status === 201, "expense with a line item → 201", res.status);
	const expenseId = res.body.id;
	await addExpense(bob, groupId, { description: "Cron taxi", amount: "0.02", paidById: bobId, participantIds: [bobId] });
	await sleep(8_000); // Let the after-save work (categorise, index) finish, so the resets below aren't undone by it.

	// Simulate the failures: the category never arrived, and the index write was never recorded.
	d1(
		`UPDATE line_item SET category = 'uncategorised' WHERE expense_id = ${sqlId(expenseId)};
		 DELETE FROM expense_indexed WHERE expense_id = ${sqlId(expenseId)};`,
		{ local },
	);
	console.log("  · simulated: the item is uncategorised, and the expense is unindexed");

	const snapshot = () => {
		const [reminders, items, indexed] = d1(
			`SELECT debtor_id, creditor_id, amount_cents, currency, owed_since, checked_on FROM reminder WHERE group_id = ${g} ORDER BY debtor_id, creditor_id;
			 SELECT li.id, li.category FROM line_item li JOIN expense e ON e.id = li.expense_id WHERE e.group_id = ${g} ORDER BY li.id;
			 SELECT x.expense_id FROM expense_indexed x JOIN expense e ON e.id = x.expense_id WHERE e.group_id = ${g} ORDER BY x.expense_id;`,
			{ local },
		);
		return { reminders, items, indexed };
	};

	const first = await runCron({ remote: !local });
	console.log(`  · run 1: ${JSON.stringify(first)}`);
	const after1 = snapshot();
	expect(
		after1.reminders.length === 1 && after1.reminders[0].debtor_id === aliceId && after1.reminders[0].creditor_id === bobId && after1.reminders[0].amount_cents === 4000,
		"run 1 wrote the reminder: Alice owes Bob £40",
		after1.reminders,
	);
	expect(after1.items.every((i) => i.category !== "uncategorised"), `run 1 backfilled the category (${after1.items.map((i) => i.category).join(", ")})`, after1.items);
	expect(after1.indexed.some((x) => x.expense_id === expenseId), "run 1 re-indexed the expense", after1.indexed);

	const second = await runCron({ remote: !local });
	console.log(`  · run 2: ${JSON.stringify(second)}`);
	const after2 = snapshot();
	expect(JSON.stringify(after2) === JSON.stringify(after1), "run 2 left the group's data byte-identical", { after1, after2 });
	console.log(`  · the snapshot both times: ${JSON.stringify(after1)}`);
} catch (error) {
	failed = true;
	console.error(`\n${error.message}\n`);
} finally {
	try {
		cleanup({ local, emails, groupIds });
	} catch (error) {
		failed = true;
		console.error(`cleanup failed: ${error.message}`);
	}
}

console.log(failed ? "\nCRON-TWICE FAILED" : "\ncron-twice passed");
process.exit(failed ? 1 : 0);
