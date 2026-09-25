// Shared plumbing for the verification scripts (ADR-0024): the target, an HTTP
// client that keeps one person's cookies, and D1 through `wrangler`.
//
// Every script takes the site as its first argument (or BASE_URL), so the same
// file runs from CI, from a laptop and on stage:
//
//   node scripts/verify/smoke.mjs https://splitr.raffaele-digennaro.workers.dev
//   node scripts/verify/smoke.mjs http://localhost:3100
//
// A localhost target switches D1 and KV to `--local` (the state `next dev` and
// the local ledger share). R2 and Vectorize are remote either way, as in dev.
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Every account these scripts make ends in this, and cleanup refuses anything else. */
export const TEST_EMAIL_DOMAIN = "@example.test";

/** `{ baseUrl, local, flags }` from argv[2] or BASE_URL. `flags` is the rest of argv. */
export function target() {
	const [first, ...rest] = process.argv.slice(2);
	const raw = first !== undefined && !first.startsWith("--") ? first : process.env.BASE_URL;
	const flags = first !== undefined && first.startsWith("--") ? [first, ...rest] : rest;
	if (raw === undefined || raw === "") {
		console.error("usage: node scripts/verify/<script>.mjs <BASE_URL> [flags]   (or set BASE_URL)");
		process.exit(2);
	}
	const url = new URL(raw);
	const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
	return { baseUrl: url.origin, local, flags };
}

/** A fresh id for this run, so parallel runs and leftovers never collide. */
export function runId(kind) {
	return `${kind}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

/** A throwaway password. Printed only when a script is asked to keep its data. */
export function testPassword() {
	return randomBytes(18).toString("base64url");
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Throws with a readable message. Scripts stop at the first failed expectation, then clean up. */
export function expect(condition, message, detail) {
	if (condition) {
		console.log(`  ✔ ${message}`);
		return;
	}
	const suffix = detail === undefined ? "" : `\n    got: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
	throw new Error(`✘ ${message}${suffix}`);
}

/**
 * One person's browser, minus the browser: it keeps its own cookies and always
 * sends `Origin`. Better Auth refuses a mutating request without a matching
 * one, and curl without it once hid broken browser auth (F-1, lesson one).
 */
export class Client {
	/** @param {string} baseUrl  @param {string} [origin] what to claim as Origin; defaults to the site */
	constructor(baseUrl, origin = baseUrl) {
		this.baseUrl = baseUrl;
		this.origin = origin;
		this.cookies = new Map();
	}

	async request(method, path, { json, headers = {} } = {}) {
		const all = { origin: this.origin, ...headers };
		if (this.cookies.size > 0) all.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
		if (json !== undefined) all["content-type"] = "application/json";
		const res = await fetch(new URL(path, this.baseUrl), {
			method,
			headers: all,
			body: json === undefined ? undefined : JSON.stringify(json),
			redirect: "manual",
		});
		for (const line of res.headers.getSetCookie()) {
			const [pair] = line.split(";");
			const eq = pair.indexOf("=");
			this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
		}
		const text = await res.text();
		let body = null;
		try {
			body = JSON.parse(text);
		} catch {
			// Not JSON (a page, or empty). `text` is still there.
		}
		return { status: res.status, headers: res.headers, text, body };
	}
}

/** Signs up and returns the new user's id. The client holds the session cookie afterwards. */
export async function signUp(client, { name, email, password }) {
	const res = await client.request("POST", "/api/auth/sign-up/email", { json: { name, email, password } });
	expect(res.status === 200 && typeof res.body?.user?.id === "string", `sign-up ${email} → 200`, `${res.status} ${res.text.slice(0, 200)}`);
	return res.body.user.id;
}

/**
 * Runs `wrangler` from the repo root and returns stdout. Throws with stderr on
 * failure, after up to two retries: on 2026-09-25 a Vectorize delete failed
 * once with "Authentication error [code: 10000]" (an OAuth refresh answered
 * 401) and the same call worked seconds later. Every call made here is safe to
 * repeat: reads, deletes, and inserts of fresh random ids.
 */
export function wrangler(args, attempts = 3) {
	for (let attempt = 1; ; attempt++) {
		try {
			return execFileSync("npx", ["wrangler", ...args], {
				cwd: REPO_ROOT,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "pipe"],
				maxBuffer: 16 * 1024 * 1024,
			});
		} catch (error) {
			const stderr = error.stderr ? String(error.stderr).trim() : "";
			const stdout = error.stdout ? String(error.stdout).trim() : "";
			const message = `wrangler ${args.slice(0, 3).join(" ")} failed:\n${stderr || stdout || error.message}`;
			if (attempt >= attempts) throw new Error(message);
			console.log(`  · wrangler ${args.slice(0, 3).join(" ")} failed (attempt ${attempt}), retrying`);
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3_000 * attempt);
		}
	}
}

/** Runs SQL against the `splitr` D1 database. Returns one array of rows per statement. */
export function d1(sql, { local }) {
	const out = wrangler(["d1", "execute", "splitr", local ? "--local" : "--remote", "--json", "--command", sql]);
	const parsed = JSON.parse(out);
	return parsed.map((statement) => statement.results ?? []);
}

/**
 * Ids and emails are interpolated into SQL. They're generated here or returned
 * by our own server, but they are still checked against a strict shape first.
 */
export function sqlId(value) {
	if (typeof value !== "string" || !/^[A-Za-z0-9_.@+-]{1,128}$/.test(value)) {
		throw new Error(`refusing to put ${JSON.stringify(value)} into SQL`);
	}
	return `'${value}'`;
}

/**
 * A group with both people already in it, inserted straight into D1. Creating
 * a group is a Server Action, whose id rotates (ADR-0010), so there's no
 * stable URL to call. Mirrors `createGroup`: the group and its members together.
 */
export function insertGroup({ name, createdBy, memberIds, local }) {
	const groupId = `grp_${randomUUID().replaceAll("-", "")}`;
	const inviteCode = randomBytes(8).toString("hex").slice(0, 10);
	const members = memberIds.map((id) => `(${sqlId(groupId)}, ${sqlId(id)})`).join(", ");
	d1(
		`INSERT INTO "group" (id, name, currency, invite_code, created_by) VALUES (${sqlId(groupId)}, '${name.replace(/'/g, "''")}', 'GBP', ${sqlId(inviteCode)}, ${sqlId(createdBy)});
		 INSERT INTO group_member (group_id, user_id) VALUES ${members};`,
		{ local },
	);
	return groupId;
}

/** Today in UTC, as the expense schema wants it. */
export const todayUtc = () => new Date().toISOString().slice(0, 10);

/** `payer` pays `amount` ("80.00"), split evenly between `participantIds`. Returns the expense id. */
export async function addExpense(client, groupId, { description, amount, paidById, participantIds }) {
	const res = await client.request("POST", `/api/groups/${groupId}/expenses`, {
		json: { description, amount, currency: "GBP", spentAt: todayUtc(), paidById, participantIds },
	});
	expect(res.status === 201, `expense "${description}" £${amount} → 201`, `${res.status} ${res.text.slice(0, 200)}`);
	return res.body.id;
}

/** "from paid to amount", through the settlements Route Handler. Returns the raw response. */
export function settle(client, groupId, { fromUserId, toUserId, amount, idempotencyKey }) {
	return client.request("POST", `/api/groups/${groupId}/settlements`, {
		json: { fromUserId, toUserId, amount },
		headers: idempotencyKey === undefined ? {} : { idempotencyKey },
	});
}

/** The group's settlements in D1: `{ n, total }` in minor units. */
export function settlementTotals(groupId, { local }) {
	const [[row]] = d1(`SELECT count(*) AS n, coalesce(sum(amount_cents), 0) AS total FROM settlement WHERE group_id = ${sqlId(groupId)}`, { local });
	return { n: row.n, total: row.total };
}
