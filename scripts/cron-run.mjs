// The cron's manual trigger (REQ-E.6, ADR-0026 §4). No public endpoint: it
// starts `splitr-cron` under `wrangler dev --test-scheduled`, calls its local
// `/__scheduled` route, waits for the sweep's summary line, and stops it.
//
//   npm run cron:run              local: the local D1, and the local splitr-ai if it's running
//   npm run cron:run -- --remote  production: the real code on Cloudflare, with the real bindings
//
// **The secret in remote mode.** `wrangler dev` loads the `.dev.vars` beside the
// config even with `--remote`, and a remote session doesn't get the deployed
// secrets. The first production run (2026-09-28) therefore sent the LOCAL dev
// secret, and splitr-ai refused both AI jobs. So `--remote` takes the production
// `AI_SHARED_SECRET` from `CRON_AI_SHARED_SECRET`, or asks for it (hidden). It
// writes it to a temporary 0600 file, passed with `--env-file` (which also stops
// `.dev.vars` loading), and deletes it afterwards. The secret never touches the
// repo or the command line.
//
// Also imported by scripts/verify/cron-twice.mjs.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const PORT = 8794;

/** The production secret, from the environment or a hidden prompt. Never echoed. */
export async function productionSecret() {
	const fromEnv = process.env.CRON_AI_SHARED_SECRET;
	if (fromEnv) return fromEnv;
	if (!process.stdin.isTTY) throw new Error("--remote needs the production AI_SHARED_SECRET: set CRON_AI_SHARED_SECRET, or run it in a terminal to be asked");
	process.stdout.write("Production AI_SHARED_SECRET (hidden, the same value as the app's): ");
	process.stdin.setRawMode(true);
	process.stdin.resume();
	let value = "";
	return new Promise((resolve, reject) => {
		const onData = (buf) => {
			for (const ch of buf.toString("utf8")) {
				if (ch === "\r" || ch === "\n") {
					process.stdin.setRawMode(false);
					process.stdin.pause();
					process.stdin.off("data", onData);
					process.stdout.write("\n");
					return value ? resolve(value) : reject(new Error("no secret given"));
				}
				if (ch === "\u0003") return reject(new Error("cancelled"));
				value = ch === "\u007f" ? value.slice(0, -1) : value + ch;
			}
		};
		process.stdin.on("data", onData);
	});
}

/** Runs the sweep once. Resolves with its summary (the `[cron] sweep {…}` JSON). `secret` is required with `remote`. */
export async function runCron({ remote = false, secret } = {}) {
	const args = ["wrangler", "dev", "-c", "workers/cron/wrangler.jsonc", "--test-scheduled", "--port", String(PORT), "--inspector-port", "9234"];
	let secretDir = null;
	if (remote) {
		if (!secret) throw new Error("runCron({ remote: true }) needs the production secret");
		secretDir = mkdtempSync(join(tmpdir(), "splitr-cron-"));
		const envFile = join(secretDir, "prod.env");
		writeFileSync(envFile, `AI_SHARED_SECRET=${secret}\n`, { mode: 0o600 });
		args.push("--remote", "--env-file", envFile);
	} else {
		args.push("--persist-to", ".wrangler/state");
	}
	try {
		return await sweepOnce(args);
	} finally {
		if (secretDir !== null) rmSync(secretDir, { recursive: true, force: true });
	}
}

function sweepOnce(args) {
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
	try {
		const secret = remote ? await productionSecret() : undefined;
		console.log(`running the sweep ${remote ? "on PRODUCTION (remote bindings)" : "locally"}…`);
		console.log(JSON.stringify(await runCron({ remote, secret }), null, 2));
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}
