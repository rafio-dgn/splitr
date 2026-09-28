// The two watchers of REQ-F.5's drill (ADR-0032), used by rotation-drill.mjs
// and rotation-monitor.mjs:
//
// - `startSearchWatch`: a test user searches by meaning every 2 s. A keyword
//   fallback means the app couldn't use the AI Worker at that moment. Search
//   needs the AI Worker (the query is embedded there), and every call carries
//   AI_SHARED_SECRET. The same query is a gateway cache hit after the first,
//   but the secret is checked in splitr-ai BEFORE the gateway, so the cache
//   can't hide a refusal.
// - `startKeyWatch`: `wrangler tail splitr-ai`, keeping only the `[ai] …
//   key=i/n` lines, i.e. which key each call used (the position, never the key).
//
// A fallback has two causes: a refused secret, or an embedding slower than the
// app's 3 s budget. The key watch tells them apart (`key=none/n`).
import { spawn } from "node:child_process";

import { cleanup } from "./cleanup.mjs";
import { addExpense, Client, insertGroup, runId, signUp, sleep, testPassword } from "./lib.mjs";

const FALLBACK_NOTE = "Search by meaning isn";
export const utc = (d = new Date()) => d.toISOString().slice(11, 19);

/**
 * @param {{ baseUrl: string, local: boolean, onChange?: (line: string) => void, onPoll?: (kind: string) => void, intervalMs?: number }} opts
 */
export async function startSearchWatch({ baseUrl, local, onChange = () => {}, onPoll = () => {}, intervalMs = 2_000 }) {
	const run = runId("rot");
	const email = `watcher.${run}@example.test`;
	const watcher = new Client(baseUrl);
	const id = await signUp(watcher, { name: "Rotation Watcher", email, password: testPassword() });
	const groupId = insertGroup({ name: `Rotation ${run}`, createdBy: id, memberIds: [id], local });
	await addExpense(watcher, groupId, { description: "Rotation probe coffee", amount: "3.00", paidById: id, participantIds: [id] });

	let counts = { meaning: 0, fallback: 0, error: 0 };
	let windows = [];
	let current = null;
	let running = true;

	const loop = (async () => {
		while (running) {
			const started = Date.now();
			let kind;
			try {
				const res = await watcher.request("GET", "/search?q=coffee");
				kind = res.status !== 200 ? `error ${res.status}` : res.text.includes(FALLBACK_NOTE) ? "fallback" : "meaning";
			} catch (error) {
				kind = `error ${String(error).slice(0, 40)}`;
			}
			if (!running) break;
			counts[kind === "meaning" ? "meaning" : kind === "fallback" ? "fallback" : "error"]++;
			onPoll(kind);
			if (kind === "meaning") {
				if (current !== null) {
					windows.push({ ...current, to: utc() });
					onChange(`${utc()}  ✔ search by meaning works again`);
					current = null;
				}
			} else if (current === null || current.kind !== kind) {
				if (current !== null) windows.push({ ...current, to: utc() });
				current = { kind, from: utc(), count: 1 };
				onChange(`${utc()}  ✘ ${kind === "fallback" ? "search fell back to keyword: the AI Worker didn't answer" : kind.toUpperCase()}`);
			} else {
				current.count++;
			}
			await sleep(Math.max(0, intervalMs - (Date.now() - started)));
		}
	})();

	return {
		/** What happened since the last `reset()`: counts, and each non-meaning window. */
		snapshot() {
			return { counts: { ...counts }, windows: current === null ? [...windows] : [...windows, { ...current, to: "(ongoing)" }], failing: current !== null };
		},
		reset() {
			counts = { meaning: 0, fallback: 0, error: 0 };
			windows = [];
			if (current !== null) current = { ...current, from: utc(), count: 0 };
		},
		/** Resolves true once the watch is in the wanted state (`failing` or not), false on timeout. */
		async waitUntil(failing, timeoutMs) {
			const end = Date.now() + timeoutMs;
			while (Date.now() < end) {
				if ((current !== null) === failing) return true;
				await sleep(500);
			}
			return false;
		},
		async stop() {
			running = false;
			await loop;
			cleanup({ local, emails: [email], groupIds: [groupId] });
		},
	};
}

/**
 * `wrangler tail splitr-ai`, keeping each call's key label. Resolves once the
 * tail is connected. `command` is the wrangler to run (overridable for a
 * local rehearsal).
 * @param {{ command: string[], onLine?: (line: string) => void }} opts
 */
export async function startKeyWatch({ command, onLine = () => {} }) {
	const [bin, ...pre] = command;
	const child = spawn(bin, [...pre, "tail", "splitr-ai", "--format", "pretty"], { stdio: ["ignore", "pipe", "pipe"] });
	let seen = new Map();
	let connected = false;
	let buffer = "";
	const onData = (chunk) => {
		buffer += chunk.toString();
		let nl;
		while ((nl = buffer.indexOf("\n")) !== -1) {
			const line = buffer.slice(0, nl);
			buffer = buffer.slice(nl + 1);
			if (/Connected to|waiting for logs/i.test(line)) connected = true;
			const m = line.match(/\[ai\] (\w+) status=(\w+) (key=\S+)/);
			if (m === null) continue;
			const label = `${m[1]} status=${m[2]} ${m[3]}`;
			seen.set(label, (seen.get(label) ?? 0) + 1);
			onLine(`${utc()}  splitr-ai: ${label}`);
		}
	};
	child.stdout.on("data", onData);
	child.stderr.on("data", onData);
	const end = Date.now() + 60_000;
	while (!connected && Date.now() < end && child.exitCode === null) await sleep(500);
	if (!connected) {
		child.kill();
		throw new Error("wrangler tail splitr-ai didn't connect within 60 s");
	}
	return {
		/** Each distinct `op status=… key=…` seen since the last `reset()`, with its count. */
		snapshot: () => new Map(seen),
		reset: () => {
			seen = new Map();
		},
		stop: () => child.kill(),
	};
}
