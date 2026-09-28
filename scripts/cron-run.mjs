// The cron's manual trigger (REQ-E.6, ADR-0026 §4). No public endpoint: it
// starts `splitr-cron` under `wrangler dev --test-scheduled`, calls its local
// `/__scheduled` route, waits for the sweep's summary line, and stops it.
//
//   npm run cron:run              local: the local D1, and the local splitr-ai if it's running
//   npm run cron:run -- --remote  production: the real code on Cloudflare, with the real bindings
//
// Also imported by scripts/verify/cron-twice.mjs.
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const PORT = 8794;

/** Runs the sweep once. Resolves with its summary (the `[cron] sweep {…}` JSON). */
export function runCron({ remote = false } = {}) {
	const args = ["wrangler", "dev", "-c", "workers/cron/wrangler.jsonc", "--test-scheduled", "--port", String(PORT), "--inspector-port", "9234"];
	args.push(...(remote ? ["--remote"] : ["--persist-to", ".wrangler/state"]));
	const child = spawn("npx", args, { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
	let log = "";
	return new Promise((resolve, reject) => {
		const stop = (fn) => {
			clearTimeout(timer);
			// The whole process group: killing only the port's listener leaves wrangler behind (HANDOVER, 2026-09-25).
			try {
				process.kill(-child.pid, "SIGTERM");
			} catch {
				// Already gone.
			}
			fn();
		};
		const timer = setTimeout(() => stop(() => reject(new Error(`no sweep summary within 3 minutes. Log tail:\n${log.slice(-1500)}`))), 180_000);
		let triggered = false;
		const onData = (chunk) => {
			log += chunk;
			if (!triggered && /Ready on/.test(log)) {
				triggered = true;
				fetch(`http://localhost:${PORT}/__scheduled?cron=${encodeURIComponent("30 2 * * *")}`).catch((error) => stop(() => reject(error)));
			}
			const match = log.match(/\[cron\] sweep (\{.*\})/);
			if (match) stop(() => resolve(JSON.parse(match[1])));
		};
		child.stdout.on("data", onData);
		child.stderr.on("data", onData);
		child.on("exit", (code) => stop(() => reject(new Error(`wrangler exited (${code}) before the sweep finished. Log tail:\n${log.slice(-1500)}`))));
	});
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const remote = process.argv.includes("--remote");
	console.log(`running the sweep ${remote ? "on PRODUCTION (remote bindings)" : "locally"}…`);
	try {
		console.log(JSON.stringify(await runCron({ remote }), null, 2));
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}
