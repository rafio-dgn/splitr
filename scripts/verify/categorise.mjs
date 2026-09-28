// Categorisation on a live site (REQ-E.4, REQ-M.7, ADR-0025 step 4): the
// line items of a saved expense get real categories after the response, and
// saving an expense with items is no slower than saving one without.
//
//   node scripts/verify/categorise.mjs https://splitr.raffaele-digennaro.workers.dev
//
// Makes @example.test data and removes it, even when a check fails.
import { cleanup } from "./cleanup.mjs";
import { Client, d1, expect, insertGroup, runId, signUp, sleep, sqlId, target, testPassword, todayUtc } from "./lib.mjs";

const { baseUrl, local } = target();
const run = runId("cat");
const email = `alice.${run}@example.test`;
const groupIds = [];
let failed = false;

const ITEMS = [
	{ rawText: "SEMI SKMD MILK 2PT", description: "Semi-skimmed milk, 2 pints", amountMinorUnits: 180, expect: "groceries" },
	{ rawText: "HOUSE RED BTL", description: "Bottle of house red wine", amountMinorUnits: 1450, expect: "drinks" },
	{ rawText: "TRAIN BRIGHTON", description: "Train ticket to Brighton", amountMinorUnits: 2200, expect: "transport" },
];

console.log(`categorise ${run} → ${baseUrl}`);
try {
	const alice = new Client(baseUrl);
	const id = await signUp(alice, { name: "Alice Cat", email, password: testPassword() });
	const groupId = insertGroup({ name: `Cat ${run}`, createdBy: id, memberIds: [id], local });
	groupIds.push(groupId);

	const save = async (description, lineItems) => {
		const t0 = Date.now();
		const res = await alice.request("POST", `/api/groups/${groupId}/expenses`, {
			json: { description, amount: "38.30", currency: "GBP", spentAt: todayUtc(), paidById: id, participantIds: [id], ...(lineItems ? { amountConfirmed: "yes", lineItems } : {}) },
		});
		expect(res.status === 201, `save "${description}" → 201`, `${res.status} ${res.text.slice(0, 200)}`);
		return Date.now() - t0;
	};

	// Timing: alternate plain and itemised saves, three of each (REQ-M.7: the AI must not be on the response's path).
	const plain = [];
	const itemised = [];
	for (let n = 1; n <= 3; n++) {
		plain.push(await save(`Plain ${n}`));
		itemised.push(await save(`Receipt ${n}`, ITEMS.map((i) => ({ rawText: i.rawText, description: i.description, amountMinorUnits: i.amountMinorUnits }))));
	}

	// The labels arrive after the response.
	let rows = [];
	for (let attempt = 0; attempt < 15; attempt++) {
		await sleep(2_000);
		[rows] = d1(
			`SELECT li.description, li.category FROM line_item li JOIN expense e ON e.id = li.expense_id WHERE e.group_id = ${sqlId(groupId)}`,
			{ local },
		);
		if (rows.length > 0 && rows.every((r) => r.category !== "uncategorised")) break;
	}
	const done = rows.filter((r) => r.category !== "uncategorised").length;
	expect(done === rows.length && rows.length === 9, `all ${rows.length} line items categorised`, rows);
	const right = rows.filter((r) => ITEMS.find((i) => i.description === r.description)?.expect === r.category).length;
	console.log(`  · ${right}/${rows.length} match the expected category (reported, not asserted: accuracy is the eval's job)`);

	// Last, so a failure here doesn't hide the labels above. Under `next dev` this
	// fails by design: a service-binding call blocks there (README, 2026-09-25).
	// The deployed Worker must pass it.
	const median = (xs) => [...xs].sort((a, b) => a - b)[1];
	console.log(`  · median save: plain ${median(plain)} ms, with 3 items ${median(itemised)} ms`);
	expect(median(itemised) < median(plain) + 500, "saves with line items are not held up by the AI (within 500 ms of plain saves)", { plain, itemised });
} catch (error) {
	failed = true;
	console.error(`\n${error.message}\n`);
} finally {
	try {
		cleanup({ local, emails: [email], groupIds });
	} catch (error) {
		failed = true;
		console.error(`cleanup failed: ${error.message}`);
	}
}

console.log(failed ? "\nCATEGORISE CHECK FAILED" : "\ncategorise check passed");
process.exit(failed ? 1 : 0);
