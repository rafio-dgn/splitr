// REQ-F.5's downtime monitor (ADR-0032): searches by meaning every 2 s for
// the whole secret rotation, and reports every moment search fell back to
// keyword, i.e. every moment the app couldn't use the AI Worker.
//
//   node scripts/verify/rotation-monitor.mjs <BASE_URL>                 until Ctrl+C
//   EXPECT=clean node scripts/verify/rotation-monitor.mjs <BASE_URL>    exit 1 if any poll fell back
//
// A test user with one group and one expense ("Rotation probe coffee") searches
// for "coffee". Search needs the AI Worker (the query is embedded there), and
// every call carries AI_SHARED_SECRET, so a refused secret shows here as the
// fallback note. The same query is a gateway cache hit after the first, but
// the secret is checked in splitr-ai BEFORE the gateway, so the cache can't
// hide a refusal.
//
// A fallback has two causes: a refused secret, or an embedding slower than
// the app's 3 s budget. The page can't tell them apart; splitr-ai's log can
// (`status=refused key=none/N`, against `status=ok`). Ctrl+C prints the
// summary and cleans up.
import { cleanup } from "./cleanup.mjs";
import { addExpense, Client, insertGroup, runId, signUp, sleep, target, testPassword } from "./lib.mjs";

const { baseUrl, local } = target();
const run = runId("rot");
const email = `watcher.${run}@example.test`;
const groupIds = [];
const FALLBACK_NOTE = "Search by meaning isn";
const INTERVAL_MS = 2_000;

const utc = (d = new Date()) => d.toISOString().slice(11, 19);
const polls = { meaning: 0, fallback: 0, error: 0 };
const windows = [];
let current = null;
let stopping = false;

console.log(`rotation-monitor ${run} → ${baseUrl}`);
const watcher = new Client(baseUrl);
const id = await signUp(watcher, { name: "Rotation Watcher", email, password: testPassword() });
groupIds.push(insertGroup({ name: `Rotation ${run}`, createdBy: id, memberIds: [id], local }));
await addExpense(watcher, groupIds[0], { description: "Rotation probe coffee", amount: "3.00", paidById: id, participantIds: [id] });
console.log(`  · watching from ${utc()} UTC, one search every ${INTERVAL_MS / 1000} s. Ctrl+C to stop.\n`);

async function finish() {
	if (stopping) return;
	stopping = true;
	if (current !== null) windows.push({ ...current, to: utc() });
	const total = polls.meaning + polls.fallback + polls.error;
	console.log(`\n\nsummary: ${total} searches: ${polls.meaning} by meaning, ${polls.fallback} keyword fallback, ${polls.error} errors`);
	for (const w of windows) console.log(`  ✘ ${w.kind} from ${w.from} to ${w.to} UTC (${w.count} searches)`);
	if (windows.length === 0) console.log("  ✔ no search fell back: the AI Worker answered throughout");
	try {
		cleanup({ local, emails: [email], groupIds });
	} catch (error) {
		console.error(`cleanup failed: ${error.message}`);
	}
	const bad = process.env.EXPECT === "clean" && windows.length > 0;
	console.log(bad ? "\nROTATION-MONITOR: DOWNTIME SEEN" : "\nrotation-monitor done");
	process.exit(bad ? 1 : 0);
}
process.on("SIGINT", finish);

while (!stopping) {
	const started = Date.now();
	let kind;
	try {
		const res = await watcher.request("GET", "/search?q=coffee");
		kind = res.status !== 200 ? `error ${res.status}` : res.text.includes(FALLBACK_NOTE) ? "fallback" : "meaning";
	} catch (error) {
		kind = `error ${String(error).slice(0, 40)}`;
	}
	polls[kind === "meaning" ? "meaning" : kind === "fallback" ? "fallback" : "error"]++;

	// One line per change of state, and a dot per unchanged poll.
	if (kind === "meaning") {
		if (current !== null) {
			windows.push({ ...current, to: utc() });
			console.log(`\n${utc()}  ✔ by meaning again`);
			current = null;
		} else process.stdout.write(".");
	} else if (current === null || current.kind !== kind) {
		if (current !== null) windows.push({ ...current, to: utc() });
		current = { kind, from: utc(), count: 1 };
		console.log(`\n${utc()}  ✘ ${kind === "fallback" ? "KEYWORD FALLBACK: the AI Worker didn't answer" : kind.toUpperCase()}`);
	} else {
		current.count++;
		process.stdout.write("x");
	}
	await sleep(Math.max(0, INTERVAL_MS - (Date.now() - started)));
}
