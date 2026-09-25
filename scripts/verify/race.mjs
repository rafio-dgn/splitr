// The demo's live "after" (REQ-E.1, ADR-0023): the same double settlement,
// several rounds, one winner each time, printed like the evidence file.
//
//   node scripts/verify/race.mjs <BASE_URL> [--rounds 5] [--keep]
//
// --keep leaves the group in place and prints both logins, so the result can
// be shown in a browser. Remove it afterwards with `cleanup.mjs <BASE_URL>`.
import { cleanup } from "./cleanup.mjs";
import { addExpense, Client, insertGroup, runId, settle, settlementTotals, signUp, target, testPassword } from "./lib.mjs";

const { baseUrl, local, flags } = target();
const roundsAt = flags.indexOf("--rounds");
const rounds = roundsAt === -1 ? 5 : Number(flags[roundsAt + 1]);
const keep = flags.includes("--keep");
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20) {
	console.error("--rounds takes a whole number from 1 to 20");
	process.exit(2);
}

const run = runId("race");
const people = {
	alice: { name: "Alice", email: `alice.${run}@example.test`, password: testPassword() },
	bob: { name: "Bob", email: `bob.${run}@example.test`, password: testPassword() },
};
const groupIds = [];
let wrong = 0;
let failed = false;

console.log(`race ${run} → ${baseUrl}, ${rounds} round(s)\n`);

try {
	const alice = new Client(baseUrl);
	const bob = new Client(baseUrl);
	const aliceId = await signUp(alice, people.alice);
	const bobId = await signUp(bob, people.bob);
	const groupId = insertGroup({ name: `Race ${run}`, createdBy: aliceId, memberIds: [aliceId, bobId], local });
	groupIds.push(groupId);
	console.log("");

	for (let round = 1; round <= rounds; round++) {
		// Each round: Bob pays £80 for both, so Alice owes a fresh £40, and
		// both of them record her paying it at the same instant.
		await addExpense(bob, groupId, { description: `Round ${round}`, amount: "80.00", paidById: bobId, participantIds: [aliceId, bobId] });
		const debt = { fromUserId: aliceId, toUserId: bobId, amount: "40.00" };
		const [a, b] = await Promise.all([settle(alice, groupId, debt), settle(bob, groupId, debt)]);
		const { n, total } = settlementTotals(groupId, { local });

		const oneWinner = [a.status, b.status].sort().join("+") === "201+409";
		const [winner, loser] = a.status === 201 ? ["Alice", b] : ["Bob", a];
		const told = loser.body?.lastPayment?.recordedByName;
		const ok = oneWinner && told === winner && n === round && total === round * 4000;
		if (!ok) wrong++;
		console.log(
			`round ${round}: Alice→ ${a.status}  Bob→ ${b.status}  | D1 n:${n} t:${total}` +
				(oneWinner ? `  | loser told "${told} recorded it"` : "") +
				(ok ? " ✔" : " ✘"),
		);
	}

	const { n, total } = settlementTotals(groupId, { local });
	console.log(`\nD1 after ${rounds} × £40 debts: ${n} settlement(s), £${(total / 100).toFixed(2)} (expected ${rounds}, £${(rounds * 40).toFixed(2)})`);
	if (keep) {
		console.log(`\nKept. ${baseUrl}/groups/${groupId}`);
		for (const p of Object.values(people)) console.log(`  ${p.email}  ${p.password}`);
	}
} catch (error) {
	failed = true;
	console.error(`\n${error.message}\n`);
} finally {
	if (!keep || failed) {
		try {
			cleanup({ local, emails: Object.values(people).map((p) => p.email), groupIds });
		} catch (error) {
			failed = true;
			console.error(`cleanup failed: ${error.message}`);
		}
	}
}

process.exit(failed || wrong > 0 ? 1 : 0);
