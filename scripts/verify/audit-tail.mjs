// REQ-F.3's demonstration: `wrangler tail | grep AUDIT` yields parseable JSON,
// and a record's history can be rebuilt from the logs alone.
//
//   node scripts/verify/audit-tail.mjs https://splitr.raffaele-digennaro.workers.dev
//       tails `splitr` and `splitr-ledger`, runs smoke.mjs to make real
//       mutations, then checks what the tails printed
//   node scripts/verify/audit-tail.mjs --from-file <log> [--smoke-out <file>]
//       checks a saved log instead (e.g. `next dev`'s output), for local testing;
//       with smoke.mjs's saved output, it rebuilds that run's history too
//
// Every [AUDIT] line must parse as JSON and carry actor, action, target,
// timestamp and outcome (REQ-F.3's exact names). Then two histories are
// printed in time order, each rebuilt from logs alone:
// - the smoke run's group: expenses, the settle race's winner and refused
//   loser, the replay. Smoke creates its group straight in D1 (a script can't
//   get a second member past Turnstile on production), so this history
//   starts at its first expense, not at the group's creation;
// - a group created through the app's own form, in a browser (REQ-F.6 Q2's
//   "every change to a record"). Its history must start at `group.create`.
//
// AUDIT_LOCAL_LOGS=<file>,<file> reads what those local log files gain during
// the run instead of `wrangler tail`, to rehearse against `next dev`.
import { spawn } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { launchBrowser } from "./browser.mjs";
import { cleanup } from "./cleanup.mjs";
import { Client, runId, signUp, testPassword, todayUtc } from "./lib.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REQUIRED = ["actor", "action", "target", "timestamp", "outcome"];
const args = process.argv.slice(2);
const fromFile = args.includes("--from-file") ? args[args.indexOf("--from-file") + 1] : null;

/** `grep AUDIT`, then parse what follows the marker. */
function check(text) {
	const lines = text.split("\n").filter((l) => l.includes("AUDIT"));
	const parsed = [];
	const bad = [];
	for (const line of lines) {
		const at = line.indexOf("[AUDIT] ");
		try {
			const entry = JSON.parse(line.slice(at + "[AUDIT] ".length));
			const missing = REQUIRED.filter((f) => typeof entry[f] !== "string" || entry[f] === "");
			if (missing.length > 0) bad.push({ line, why: `missing ${missing.join(", ")}` });
			else parsed.push(entry);
		} catch (error) {
			bad.push({ line, why: `not JSON: ${error.message}` });
		}
	}
	return { lines, parsed, bad };
}

function tail(worker) {
	const child = spawn("npx", ["wrangler", "tail", worker, "--format", "pretty"], { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
	let out = "";
	child.stdout.on("data", (c) => (out += c));
	child.stderr.on("data", (c) => (out += c));
	return { child, output: () => out, stop: () => { try { process.kill(-child.pid, "SIGTERM"); } catch { /* gone */ } } };
}

/** What a local log file gains from now on: `wrangler tail`'s stand-in for a rehearsal. */
function fileTail(path) {
	const from = statSync(path).size;
	return { output: () => readFileSync(path).subarray(from).toString(), stop: () => {} };
}

/**
 * A group made the way a person makes one: the "New group" form, in a
 * browser. Then an expense with one item, through the API. Returns the group's
 * id and the user, for the history and the cleanup.
 */
async function groupThroughTheApp(baseUrl) {
	const run = runId("trace");
	const email = `trace.${run}@example.test`;
	const client = new Client(baseUrl);
	const userId = await signUp(client, { name: "Trace Demo", email, password: testPassword() });
	const browser = await launchBrowser();
	let groupId;
	try {
		const page = await browser.newPage();
		await page.setCookie(...[...client.cookies].map(([name, value]) => ({ name, value, url: baseUrl })));
		await page.goto(`${baseUrl}/groups/new`, { waitUntil: "networkidle2" });
		await page.locator("input#name").fill(`Trace ${run}`);
		await page.locator('button[type="submit"]').click();
		await page.waitForFunction(() => /^\/groups\/grp_[0-9a-f]{32}$/.test(location.pathname), { timeout: 30_000 });
		groupId = (await page.evaluate(() => location.pathname)).split("/").at(-1);
	} finally {
		await browser.close();
	}
	const res = await client.request("POST", `/api/groups/${groupId}/expenses`, {
		json: { description: "Trace demo lunch", amount: "6.00", currency: "GBP", spentAt: todayUtc(), paidById: userId, participantIds: [userId], amountConfirmed: "yes", lineItems: [{ rawText: "FLAT WHITE", description: "Flat white", amountMinorUnits: 600 }] },
	});
	console.log(`  trace │ a group created through the "New group" form (${groupId.slice(0, 12)}…), then an expense with one item → ${res.status}`);
	return { groupId, email };
}

function runSmoke(baseUrl) {
	return new Promise((resolve) => {
		const child = spawn("node", ["scripts/verify/smoke.mjs", baseUrl], { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		child.stdout.on("data", (c) => (out += c));
		child.stderr.on("data", (c) => (out += c));
		child.on("exit", (code) => resolve({ code, out }));
	});
}

let text;
let smokeIds = [];
let trace = null;
if (fromFile !== null) {
	text = readFileSync(fromFile, "utf8");
	const smokeOut = args.includes("--smoke-out") ? readFileSync(args[args.indexOf("--smoke-out") + 1], "utf8") : "";
	smokeIds = [...smokeOut.matchAll(/grp_[0-9a-f]{32}/g)].map((m) => m[0]);
} else {
	const baseUrl = args.find((a) => !a.startsWith("--"));
	if (!baseUrl) {
		console.error("usage: node scripts/verify/audit-tail.mjs <BASE_URL> | --from-file <log>");
		process.exit(2);
	}
	const localLogs = process.env.AUDIT_LOCAL_LOGS?.split(",").filter(Boolean) ?? [];
	console.log(`${localLogs.length > 0 ? `reading ${localLogs.join(", ")}` : "tailing splitr and splitr-ledger"}, then running smoke and the trace against ${baseUrl}…`);
	const tails = localLogs.length > 0 ? localLogs.map(fileTail) : [tail("splitr"), tail("splitr-ledger")];
	if (localLogs.length === 0) await new Promise((r) => setTimeout(r, 12_000)); // Let both tails connect first.
	const smoke = await runSmoke(baseUrl);
	console.log(smoke.out.split("\n").filter((l) => /✔|✘|passed|FAILED/.test(l)).map((l) => `  smoke │ ${l.trim()}`).join("\n"));
	try {
		trace = await groupThroughTheApp(baseUrl);
	} catch (error) {
		console.log(`  trace │ ✘ ${error.message}`);
	}
	// Tail delivers a few seconds late, and indexing and categorising run after the response.
	await new Promise((r) => setTimeout(r, 20_000));
	for (const t of tails) t.stop();
	text = tails.map((t) => t.output()).join("\n");
	if (trace !== null) {
		const url = new URL(baseUrl);
		cleanup({ local: url.hostname === "localhost" || url.hostname === "127.0.0.1", emails: [trace.email], groupIds: [trace.groupId] });
	}
	// The run's own ids: its group, from smoke's output.
	smokeIds = [...smoke.out.matchAll(/grp_[0-9a-f]{32}/g)].map((m) => m[0]);
}

const { lines, parsed, bad } = check(text);
console.log(`\n$ wrangler tail … | grep AUDIT   → ${lines.length} line(s)`);
for (const l of lines.slice(0, 4)) console.log(`  ${l.trim().slice(0, 200)}`);
if (lines.length > 4) console.log(`  … ${lines.length - 4} more`);
console.log(`\nparseable, with all five fields: ${parsed.length}/${lines.length}`);
for (const b of bad) console.log(`  ✘ ${b.why}: ${b.line.slice(0, 160)}`);

// Traceability: the smoke group's history, from logs alone.
const touches = (e) => smokeIds.some((id) => JSON.stringify(e).includes(id));
const history = smokeIds.length > 0 ? parsed.filter(touches) : [];
if (history.length > 0) {
	console.log(`\nthe smoke group's history, from the logs alone (${history.length} entries):`);
	for (const e of history.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1))) {
		console.log(`  ${e.timestamp}  ${e.action.padEnd(22)} ${e.outcome.padEnd(26)} target=${e.target.slice(0, 40)}${e.detail ? ` ${JSON.stringify(e.detail).slice(0, 110)}` : ""}`);
	}
}
// The group made through the app: its whole history, from its creation.
let traceOk = true;
if (fromFile === null) {
	const traced = trace === null ? [] : parsed.filter((e) => JSON.stringify(e).includes(trace.groupId)).sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
	traceOk = traced[0]?.action === "group.create";
	console.log(`\na group created through the app, its history from the logs alone (${traced.length} entries):`);
	for (const e of traced) {
		console.log(`  ${e.timestamp}  ${e.action.padEnd(22)} ${e.outcome.padEnd(26)} target=${e.target.slice(0, 40)}${e.detail ? ` ${JSON.stringify(e.detail).slice(0, 110)}` : ""}`);
	}
	console.log(traceOk ? "  ✔ it starts at group.create: every change, from the record's creation" : "  ✘ it doesn't start at group.create");
}

const actions = [...new Set(parsed.map((e) => e.action))].sort();
console.log(`\nactions seen: ${actions.join(", ")}`);

const ok = lines.length > 0 && bad.length === 0 && traceOk;
console.log(ok ? "\naudit-tail passed" : "\nAUDIT-TAIL FAILED");
process.exit(ok ? 0 : 1);
