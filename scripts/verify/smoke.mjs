// The smoke test run after every deploy (ADR-0024, deploy.yml step 6). No
// browser, about 30 seconds. It makes @example.test data on the target and
// removes it afterwards, even when a check fails.
//
//   node scripts/verify/smoke.mjs https://splitr.raffaele-digennaro.workers.dev
//
// Exit code 0 means every check passed and cleanup finished.
import { cleanup } from "./cleanup.mjs";
import { addExpense, Client, d1, expect, insertGroup, runId, settle, settlementTotals, signUp, sqlId, target, testPassword } from "./lib.mjs";

const { baseUrl, local } = target();
const run = runId("smoke");
const email = (who) => `${who}.${run}@example.test`;
const emails = [email("alice"), email("bob"), email("forged")];
const groupIds = [];
let failed = false;

console.log(`smoke ${run} → ${baseUrl}${local ? " (local D1/KV)" : ""}`);

try {
	// 1. The site answers, and the gate holds.
	const anon = new Client(baseUrl);
	const landing = await anon.request("GET", "/");
	expect(landing.status === 200, "landing page → 200", landing.status);
	const gated = await anon.request("GET", "/groups");
	expect(
		gated.status === 307 && (gated.headers.get("location") ?? "").endsWith("/login"),
		"signed-out /groups → 307 to /login",
		`${gated.status} ${gated.headers.get("location")}`,
	);

	// 2. Better Auth's origin check: a forged Origin is refused, and writes nothing.
	const forged = await new Client(baseUrl, "https://evil.example").request("POST", "/api/auth/sign-up/email", {
		json: { name: "Forged", email: email("forged"), password: testPassword() },
	});
	expect(forged.status === 403, "sign-up with a forged Origin → 403", `${forged.status} ${forged.text.slice(0, 200)}`);
	const [[forgedRow]] = d1(`SELECT count(*) AS n FROM user WHERE email = ${sqlId(email("forged"))}`, { local });
	expect(forgedRow.n === 0, "…and no user row was written", forgedRow);

	// 3. Two people, one group.
	const alice = new Client(baseUrl);
	const bob = new Client(baseUrl);
	const aliceId = await signUp(alice, { name: "Alice Smoke", email: email("alice"), password: testPassword() });
	const bobId = await signUp(bob, { name: "Bob Smoke", email: email("bob"), password: testPassword() });
	const groupId = insertGroup({ name: `Smoke ${run}`, createdBy: aliceId, memberIds: [aliceId, bobId], local });
	groupIds.push(groupId);
	console.log(`  · group ${groupId} (direct D1 insert)`);

	// 4. Bob pays £80 for both, so Alice owes him £40.
	await addExpense(bob, groupId, { description: "Smoke dinner", amount: "80.00", paidById: bobId, participantIds: [aliceId, bobId] });

	// 5. The contested write: both of them record "Alice paid Bob £40" at once.
	const debt = { fromUserId: aliceId, toUserId: bobId, amount: "40.00" };
	const [a, b] = await Promise.all([settle(alice, groupId, debt), settle(bob, groupId, debt)]);
	const statuses = [a.status, b.status].sort().join("+");
	expect(statuses === "201+409", "concurrent settle → exactly one 201 and one 409", `Alice ${a.status}, Bob ${b.status}`);
	const [winnerName, loser] = a.status === 201 ? ["Alice Smoke", b] : ["Bob Smoke", a];
	expect(
		loser.body?.status === "already-settled" && loser.body?.lastPayment?.recordedByName === winnerName,
		`the loser is told "${winnerName} recorded it"`,
		loser.text.slice(0, 300),
	);
	const afterRace = settlementTotals(groupId, { local });
	expect(afterRace.n === 1 && afterRace.total === 4000, "D1 holds one £40 settlement", afterRace);

	// 6. Idempotency (REQ-E.2): a fresh £10 debt, recorded twice with one key.
	await addExpense(bob, groupId, { description: "Smoke taxi", amount: "20.00", paidById: bobId, participantIds: [aliceId, bobId] });
	const key = `smoke-${run}`;
	const small = { fromUserId: aliceId, toUserId: bobId, amount: "10.00", idempotencyKey: key };
	const first = await settle(alice, groupId, small);
	const replay = await settle(alice, groupId, small);
	expect(first.status === 201 && first.headers.get("idempotency-replayed") === "false", "first request → 201, replayed=false", `${first.status} ${first.headers.get("idempotency-replayed")}`);
	expect(replay.status === 201 && replay.headers.get("idempotency-replayed") === "true", "same key again → 201, replayed=true", `${replay.status} ${replay.headers.get("idempotency-replayed")}`);
	expect(replay.text === first.text, "the replay's body is byte-identical", { first: first.text, replay: replay.text });
	const afterReplay = settlementTotals(groupId, { local });
	expect(afterReplay.n === 2 && afterReplay.total === 5000, "D1 gained exactly one row", afterReplay);
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

console.log(failed ? "\nSMOKE FAILED" : "\nsmoke passed");
process.exit(failed ? 1 : 0);
