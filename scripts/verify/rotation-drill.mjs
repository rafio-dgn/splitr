// REQ-F.5's secret-rotation drill, guided (ADR-0032). It runs every command
// itself and pauses before each step, saying what it's about to do and what
// you should see.
//
//   node scripts/verify/rotation-drill.mjs day1      the wrong way, then K1 → K2 with the window open (~10 min)
//   node scripts/verify/rotation-drill.mjs day2      after the 02:30 UTC cron: check, then retire K1 (~3 min)
//   node scripts/verify/rotation-drill.mjs repair    only if something went wrong: one fresh key on all three Workers
//
// The secret is AI_SHARED_SECRET: the app (`splitr`) and the nightly cron
// (`splitr-cron`) send it, and `splitr-ai` checks it against its list,
// AI_SHARED_SECRETS.
//
// Keys are made here, in memory, and piped into `wrangler secret put`. They
// are never printed or written to a file. The one that stays live, K2, goes
// into your macOS Keychain ("splitr AI_SHARED_SECRET"). Day 2 needs it, and
// so does the next rotation, since a dual-key window needs the old value.
// (`security` takes it as an argument, so it's visible to `ps` on this Mac
// for a moment. That's accepted on a single-user machine.)
//
// While it runs, two watchers report: a test user searching every 2 s
// (a keyword fallback = the AI Worker refused or didn't answer), and
// `wrangler tail splitr-ai`, showing which key each call used (`key=2/2`,
// never the key). Everything shown is also written to
// .data/rotation-drill-<part>-<time>.log, which contains no secrets.
//
// ROTATION_WRANGLER=<script> and ROTATION_KEYCHAIN_SERVICE=<name> exist for a
// local rehearsal with a stand-in wrangler.
import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

import { cleanup } from "./cleanup.mjs";
import { Client, d1, insertGroup, REPO_ROOT, runId, signUp, sleep, sqlId, testPassword, todayUtc } from "./lib.mjs";
import { startKeyWatch, startSearchWatch, utc } from "./rotation-watch.mjs";

const PRODUCTION = "https://splitr.raffaele-digennaro.workers.dev";
const [part, rawUrl] = process.argv.slice(2);
if (!["day1", "day2", "repair"].includes(part)) {
	console.error("usage: node scripts/verify/rotation-drill.mjs day1 | day2 | repair   [BASE_URL, default production]");
	process.exit(2);
}
const baseUrl = new URL(rawUrl ?? PRODUCTION).origin;
const local = /^http:\/\/(localhost|127\.0\.0\.1)/.test(baseUrl);
const WRANGLER = process.env.ROTATION_WRANGLER ? [process.execPath, process.env.ROTATION_WRANGLER] : ["npx", "wrangler"];
const KEYCHAIN = process.env.ROTATION_KEYCHAIN_SERVICE ?? "splitr AI_SHARED_SECRET";
const STATE = `${REPO_ROOT}.data/rotation-drill.json`;

const WORKERS = {
	ai: { name: "splitr-ai", secret: "AI_SHARED_SECRETS", config: "workers/ai/wrangler.jsonc" },
	app: { name: "splitr", secret: "AI_SHARED_SECRET", config: "wrangler.jsonc" },
	cron: { name: "splitr-cron", secret: "AI_SHARED_SECRET", config: "workers/cron/wrangler.jsonc" },
};

mkdirSync(`${REPO_ROOT}.data`, { recursive: true });
const logFile = `${REPO_ROOT}.data/rotation-drill-${part}-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.log`;
/** Prints a line and writes it to the log. Never pass a secret. */
function say(line = "") {
	console.log(line);
	appendFileSync(logFile, `${line}\n`);
}

const lines = createInterface({ input: process.stdin })[Symbol.asyncIterator]();
async function pause(title, doing, expect) {
	say(`\n━━ ${title}`);
	say(`   What I'll do:     ${doing}`);
	say(`   What you should see: ${expect}`);
	process.stdout.write("   Press Enter to go ahead (Ctrl+C to stop) ");
	await lines.next();
	say(`   ${utc()} UTC: going ahead`);
}
async function ask(question) {
	process.stdout.write(`   ${question} `);
	const { value } = await lines.next();
	appendFileSync(logFile, `   ${question} → ${value ?? ""}\n`);
	return (value ?? "").trim().toLowerCase();
}

const newKey = () => randomBytes(32).toString("hex");

/** `wrangler secret put`, with the value on stdin. That deploys a new version of the Worker. */
async function putSecret(which, value) {
	const w = WORKERS[which];
	const [bin, ...pre] = WRANGLER;
	const child = spawn(bin, [...pre, "secret", "put", w.secret, "-c", w.config], { cwd: REPO_ROOT, stdio: ["pipe", "pipe", "pipe"] });
	let out = "";
	child.stdout.on("data", (c) => (out += c));
	child.stderr.on("data", (c) => (out += c));
	child.stdin.end(value);
	const code = await new Promise((resolve) => child.on("close", resolve));
	if (code !== 0) throw new Error(`wrangler secret put ${w.secret} on ${w.name} failed (exit ${code}):\n${out.slice(-600)}`);
	say(`   ${utc()} UTC  ✔ ${w.name}: ${w.secret} updated, a new version is live`);
}

function keychainStore(value) {
	execFileSync("security", ["add-generic-password", "-U", "-a", "splitr", "-s", KEYCHAIN, "-l", KEYCHAIN, "-w", value]);
	say(`   ✔ the new key is in your Keychain, as "${KEYCHAIN}"`);
}
function keychainRead() {
	try {
		return execFileSync("security", ["find-generic-password", "-a", "splitr", "-s", KEYCHAIN, "-w"], { encoding: "utf8" }).trim();
	} catch {
		throw new Error(`no "${KEYCHAIN}" in your Keychain: day 1 stores it there`);
	}
}

/** Prints what both watchers saw since the last report, then resets the key watch. */
function report(search, keys) {
	const { counts } = search.snapshot();
	say(`   searches so far in this part: ${counts.meaning} by meaning, ${counts.fallback} fell back, ${counts.error} errors`);
	const seen = keys.snapshot();
	if (seen.size === 0) say("   splitr-ai: no calls logged in this step");
	for (const [label, n] of seen) say(`   splitr-ai: ${n} × ${label}`);
	keys.reset();
}
function partSummary(search, name, expectClean) {
	const { counts, windows } = search.snapshot();
	say(`\n   ${name}: ${counts.meaning} searches by meaning, ${counts.fallback} fell back, ${counts.error} errors`);
	for (const w of windows) say(`   ✘ ${w.kind} from ${w.from} to ${w.to} UTC (${w.count} searches)`);
	if (expectClean) say(windows.length === 0 ? "   ✔ NO DOWNTIME: every search was answered by meaning" : "   ✘ DOWNTIME SEEN: see the windows above");
	return windows.length === 0;
}

async function startWatchers() {
	say(`${utc()} UTC  starting the watchers (a test user searching every 2 s, and wrangler tail splitr-ai)…`);
	const keys = await startKeyWatch({ command: WRANGLER, onLine: (l) => appendFileSync(logFile, `${l}\n`) });
	const search = await startSearchWatch({ baseUrl, local, onChange: (l) => say(`   ${l}`) });
	await sleep(12_000);
	say(`${utc()} UTC  watching. Before anything changes:`);
	report(search, keys);
	return { search, keys };
}

/** A user with an expense whose item can't be categorised during the breakage: the cron's work for 02:30. */
async function makeCronProbe() {
	const run = runId("cronprobe");
	const email = `cronprobe.${run}@example.test`;
	const client = new Client(baseUrl);
	const id = await signUp(client, { name: "Cron Probe", email, password: testPassword() });
	const groupId = insertGroup({ name: `Cron probe ${run}`, createdBy: id, memberIds: [id], local });
	const res = await client.request("POST", `/api/groups/${groupId}/expenses`, {
		json: { description: "Rotation drill lunch", amount: "5.00", currency: "GBP", spentAt: todayUtc(), paidById: id, participantIds: [id], amountConfirmed: "yes", lineItems: [{ rawText: "SANDWICH", description: "Sandwich", amountMinorUnits: 500 }] },
	});
	await sleep(5_000);
	const category = probeCategory(groupId);
	say(`   the drill's lunch expense: saved → ${res.status} (saves never need the AI Worker), its item → ${category}`);
	return { email, groupId };
}
function probeCategory(groupId) {
	const rows = d1(`SELECT li.category FROM line_item li JOIN expense e ON e.id = li.expense_id WHERE e.group_id = ${sqlId(groupId)}`, { local })[0];
	return rows[0]?.category ?? "(no item)";
}

say(`rotation-drill ${part} → ${baseUrl}   (log: ${logFile.replace(REPO_ROOT, "")})`);
let watchers = null;
let inBreakage = false;
try {
	if (part === "day1") {
		if (existsSync(STATE)) throw new Error("day 1 already ran (.data/rotation-drill.json exists). Next is day2; use repair if something went wrong.");
		say("Today: Part 1, the wrong way (it breaks on purpose, then we recover), and Part 2, the right way (it must not break).");
		watchers = await startWatchers();
		const { search, keys } = watchers;

		// ── Part 1: the wrong way.
		await pause(
			"PART 1, step 1 of 5: THE WRONG WAY",
			"give splitr-ai a new key, K1, IN PLACE OF the old one: no window",
			"within a minute, search falls back to keyword, and splitr-ai logs key=none/1 (the app still sends the old key)",
		);
		const k1 = newKey();
		inBreakage = true;
		await putSecret("ai", k1);
		say((await search.waitUntil(true, 90_000)) ? "   ✘ broken, as expected" : "   ⚠ no fallback within 90 s: tell Claude");
		const probe = await makeCronProbe();
		writeFileSync(STATE, JSON.stringify({ day1: new Date().toISOString(), probe }, null, 2));
		await sleep(5_000);
		report(search, keys);

		await pause(
			"PART 1, step 2 of 5: RECOVER",
			"move the app, then the cron, to K1 (the fix people reach for under pressure)",
			"search by meaning works again, and splitr-ai logs key=1/1",
		);
		await putSecret("app", k1);
		await putSecret("cron", k1);
		say((await search.waitUntil(false, 120_000)) ? "   ✔ recovered" : "   ⚠ still falling back after 2 min: tell Claude");
		inBreakage = false;
		await sleep(10_000);
		report(search, keys);
		partSummary(search, "PART 1 (the wrong way)", false);

		// ── Part 2: the right way. K2 goes to the Keychain before anything uses it.
		search.reset();
		keys.reset();
		const k2 = newKey();
		say("\n━━ PART 2: THE RIGHT WAY. From here on, no search may fall back.");
		keychainStore(k2);
		await pause("PART 2, step 3 of 5: OPEN THE WINDOW", "let splitr-ai accept K1 AND K2 (the receiver first)", "no fallback; splitr-ai logs key=1/2 (the app still sends K1, which is fine)");
		await putSecret("ai", `${k1},${k2}`);
		await sleep(20_000);
		report(search, keys);
		await pause("PART 2, step 4 of 5: MOVE THE APP", "give the app K2", "no fallback; splitr-ai logs key=2/2");
		await putSecret("app", k2);
		await sleep(20_000);
		report(search, keys);
		await pause("PART 2, step 5 of 5: MOVE THE CRON", "give the cron K2", "nothing new: the cron only calls at 02:30 UTC. Tomorrow proves it used K2");
		await putSecret("cron", k2);
		await sleep(10_000);
		report(search, keys);
		partSummary(search, "PART 2 (the right way, so far)", true);
		say("\nThe window stays open overnight: splitr-ai accepts K1 and K2 until the cron is seen on K2.");
		say("NEXT: tomorrow, after 02:30 UTC (03:30 on your clock, WEST), run:  node scripts/verify/rotation-drill.mjs day2");
	} else if (part === "day2") {
		if (!existsSync(STATE)) throw new Error("no .data/rotation-drill.json: run day1 first");
		const state = JSON.parse(readFileSync(STATE, "utf8"));
		const k2 = keychainRead();
		say("Today: Part 3, proof that nothing still sends K1, then retire K1. Nothing may break.");
		const category = probeCategory(state.probe.groupId);
		say(`   the drill's lunch item, left uncategorised yesterday, is now: ${category}`);
		say(category === "uncategorised" ? "   ⚠ the cron hasn't categorised it: it may not have run, or its key was refused" : "   ✔ the 02:30 cron categorised it, so its key was accepted");
		say("\n━━ PART 3, step 6 of 7: CHECK THE CRON'S KEY (in the dashboard; I can't see it from here)");
		say("   Workers & Pages → splitr-ai → Observability. Look at the lines around 02:30 UTC (03:30 WEST).");
		say("   They should say key=2/2, and none should say key=1/2.");
		const ok = await ask("Did every 02:30 line say key=2/2? Type yes or no:");
		if (ok !== "yes") {
			say("   STOP: something may still send K1, so K1 stays. Nothing was changed. Tell Claude what the log shows.");
		} else {
			watchers = await startWatchers();
			const { search, keys } = watchers;
			await pause("PART 3, step 7 of 7: RETIRE K1", "let splitr-ai accept K2 only", "no fallback; splitr-ai logs key=1/1");
			await putSecret("ai", k2);
			await sleep(30_000);
			report(search, keys);
			partSummary(search, "PART 3 (retiring K1)", true);
			cleanup({ local, emails: [state.probe.email], groupIds: [state.probe.groupId] });
			renameSync(STATE, STATE.replace(".json", `.done-${Date.now()}.json`));
			say(`\nDone. The live key is K2, kept in your Keychain as "${KEYCHAIN}" for the next rotation's window.`);
		}
	} else {
		say("REPAIR: not part of the drill. It puts one fresh key on all three Workers: the receiver first, then the app and the cron.");
		say("There may be a short break between the first command and the last. Saving expenses is never affected.");
		await pause("REPAIR", "one fresh key on splitr-ai, then the app, then the cron", "AI features work again within a minute");
		const k = newKey();
		keychainStore(k);
		await putSecret("ai", k);
		await putSecret("app", k);
		await putSecret("cron", k);
		say("Repaired. Tell Claude, so the evidence records it.");
	}
} catch (error) {
	say(`\n✘ ${error.message}`);
	if (inBreakage) say("  The app is in the broken state: AI features are refused. Run:  node scripts/verify/rotation-drill.mjs repair");
	process.exitCode = 1;
} finally {
	if (watchers !== null) {
		watchers.keys.stop();
		await watchers.search.stop();
	}
	say(`\nlog: ${logFile.replace(REPO_ROOT, "")}`);
	process.exit();
}
