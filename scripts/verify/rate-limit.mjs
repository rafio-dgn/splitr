// REQ-F.1's demonstration (ADR-0029): six rapid settle-up requests, and the
// sixth returns 429. Settle-up allows 5 per 60 s per signed-in user.
//
//   node scripts/verify/rate-limit.mjs <BASE_URL>
//
// Alice owes Bob £40, and sends six £1 settlements back to back. 1–5 must be
// 201, the 6th 429 with Retry-After, and D1 must hold exactly 5 settlements
// (the refused one wrote nothing). Then Bob's own request must still work: the
// limit is per user, not per group or per IP. It cleans up even on failure.
// Don't run it within a minute of another script that settles as Alice.
import { cleanup } from "./cleanup.mjs";
import { addExpense, Client, expect, insertGroup, runId, settle, settlementTotals, signUp, target, testPassword } from "./lib.mjs";

const { baseUrl, local } = target();
const run = runId("rl");
const emails = [`alice.${run}@example.test`, `bob.${run}@example.test`];
const groupIds = [];
let failed = false;

console.log(`rate-limit ${run} → ${baseUrl}`);
try {
	const alice = new Client(baseUrl);
	const bob = new Client(baseUrl);
	const aliceId = await signUp(alice, { name: "Alice RL", email: emails[0], password: testPassword() });
	const bobId = await signUp(bob, { name: "Bob RL", email: emails[1], password: testPassword() });
	const groupId = insertGroup({ name: `RL ${run}`, createdBy: aliceId, memberIds: [aliceId, bobId], local });
	groupIds.push(groupId);
	await addExpense(bob, groupId, { description: "RL dinner", amount: "80.00", paidById: bobId, participantIds: [aliceId, bobId] });

	const statuses = [];
	let sixth = null;
	for (let n = 1; n <= 6; n++) {
		const res = await settle(alice, groupId, { fromUserId: aliceId, toUserId: bobId, amount: "1.00" });
		statuses.push(res.status);
		if (n === 6) sixth = res;
	}
	console.log(`  · Alice's six rapid requests → ${statuses.join(", ")}`);
	expect(statuses.slice(0, 5).every((s) => s === 201), "requests 1–5 are accepted (201)", statuses);
	expect(statuses[5] === 429, "the 6th returns 429", statuses);
	expect(sixth.headers.get("retry-after") === "60", "…with Retry-After: 60", sixth.headers.get("retry-after"));
	const { n } = settlementTotals(groupId, { local });
	expect(n === 5, "D1 holds exactly 5 settlements: the refused request wrote nothing", n);

	// Per user: Bob has his own budget. (Bob records Alice paying him another £1.)
	const bobs = await settle(bob, groupId, { fromUserId: aliceId, toUserId: bobId, amount: "1.00" });
	expect(bobs.status === 201, "Bob's request in the same minute is accepted: the limit is per user", bobs.status);
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

console.log(failed ? "\nRATE-LIMIT FAILED" : "\nrate-limit passed");
process.exit(failed ? 1 : 0);
