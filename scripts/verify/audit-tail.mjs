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
// timestamp and outcome (REQ-F.3's exact names). Then the smoke run's own
// lines are printed in time order: its history, rebuilt from logs alone.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
	console.log(`tailing splitr and splitr-ledger, then running smoke against ${baseUrl}…`);
	const tails = [tail("splitr"), tail("splitr-ledger")];
	await new Promise((r) => setTimeout(r, 12_000)); // Let both tails connect first.
	const smoke = await runSmoke(baseUrl);
	console.log(smoke.out.split("\n").filter((l) => /✔|✘|passed|FAILED/.test(l)).map((l) => `  smoke │ ${l.trim()}`).join("\n"));
	await new Promise((r) => setTimeout(r, 10_000)); // Tail delivers a few seconds late.
	for (const t of tails) t.stop();
	text = tails.map((t) => t.output()).join("\n");
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
const actions = [...new Set(parsed.map((e) => e.action))].sort();
console.log(`\nactions seen: ${actions.join(", ")}`);

const ok = lines.length > 0 && bad.length === 0;
console.log(ok ? "\naudit-tail passed" : "\nAUDIT-TAIL FAILED");
process.exit(ok ? 0 : 1);
