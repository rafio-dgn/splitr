// REQ-F.2's demonstration (ADR-0030): forge a join submit, and the server
// rejects it.
//
//   node scripts/verify/turnstile-forge.mjs <BASE_URL>
//   HEADFUL=1 node scripts/verify/turnstile-forge.mjs <BASE_URL>   watch it; click Turnstile's check if it asks
//
// Turnstile exists to tell people from scripts, and on production it never
// hands this automated browser a token: it probes for automation and fails
// every challenge (Error 600010, observed 2026-09-28, even with a human
// clicking). So the script does what a real forger does: it waits briefly for a
// token, and if none comes, it calls the Join button's React handler directly,
// skipping the client-side `disabled` gate. The Server Action is then called,
// and the intercepted request carries a forged token. The widget in the page
// protects nothing by itself; the server's check does. If even that fails, a
// screenshot, the console and the challenge requests are printed.
//
// A signed-in user opens a real invite page and the widget issues a token.
// When the page calls the join Server Action, the request is intercepted and
// its token replaced with a forged one. The server must refuse, and no
// membership may be written. The captured request is then replayed with curl
// (the recorded forged-submit command), with an empty token too.
//
// Locally, `.dev.vars` holds Cloudflare's always-pass TEST secret, which
// accepts ANY token, so only the empty-token case can be refused there. To
// rehearse production locally, use the always-block site key
// (2x00000000000000000000AB) and the always-fail secret
// (2x0000000000000000000000000000000AA) with EXPECT_REFUSAL=1. On production
// (the real secret), the forged token must be refused as well.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

import { launchBrowser } from "./browser.mjs";
import { cleanup } from "./cleanup.mjs";
import { Client, d1, expect, insertGroup, REPO_ROOT, runId, signUp, sqlId, target, testPassword } from "./lib.mjs";

const { baseUrl, local } = target();
const run = runId("ts");
const emails = [`owner.${run}@example.test`, `joiner.${run}@example.test`];
const groupIds = [];
let failed = false;
const FORGED = `forged-by-script-${run}`;

const localNote = !local ? "" : process.env.EXPECT_REFUSAL === "1" ? " (EXPECT_REFUSAL: the always-fail test secret)" : " (test keys: the always-pass secret accepts any token)";
console.log(`turnstile-forge ${run} → ${baseUrl}${localNote}`);
const browser = await launchBrowser();
try {
	const owner = new Client(baseUrl);
	const joiner = new Client(baseUrl);
	const ownerId = await signUp(owner, { name: "Owner TS", email: emails[0], password: testPassword() });
	const joinerId = await signUp(joiner, { name: "Joiner TS", email: emails[1], password: testPassword() });
	const groupId = insertGroup({ name: `TS ${run}`, createdBy: ownerId, memberIds: [ownerId], local });
	groupIds.push(groupId);
	const [[{ invite_code: code }]] = d1(`SELECT invite_code FROM "group" WHERE id = ${sqlId(groupId)}`, { local });
	const isMember = () => d1(`SELECT count(*) AS n FROM group_member WHERE group_id = ${sqlId(groupId)} AND user_id = ${sqlId(joinerId)}`, { local })[0][0].n === 1;

	// 1. The real page, signed in as the joiner; the widget issues a genuine token.
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 900 });
	const consoleLines = [];
	const challengeRequests = [];
	page.on("console", (m) => consoleLines.push(`${m.type()}: ${m.text().slice(0, 200)}`));
	page.on("pageerror", (e) => consoleLines.push(`pageerror: ${String(e).slice(0, 200)}`));
	page.on("response", (r) => {
		if (r.url().includes("challenges.cloudflare.com")) challengeRequests.push(`${r.status()} ${r.url().slice(0, 120)}`);
	});
	await page.setCookie(...[...joiner.cookies].map(([name, value]) => ({ name, value, url: baseUrl })));
	let captured = null;
	await page.setRequestInterception(true);
	page.on("request", (req) => {
		if (req.method() === "POST" && req.headers()["next-action"]) {
			// The Server Action call: [inviteCode, token]. Swap the token for a forgery.
			const args = JSON.parse(req.postData() ?? "[]");
			const realTokenLength = typeof args[1] === "string" ? args[1].length : 0;
			args[1] = FORGED;
			captured = { url: req.url(), headers: req.headers(), body: JSON.stringify(args), realTokenLength };
			req.continue({ postData: captured.body });
			return;
		}
		req.continue();
	});
	await page.goto(`${baseUrl}/join/${code}`, { waitUntil: "networkidle2" });
	const tokenReady = () =>
		page.waitForFunction(() => {
			const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.startsWith("Join "));
			return b !== undefined && !b.disabled;
		}, { timeout: 20_000 });
	let bypassed = false;
	try {
		await tokenReady();
	} catch {
		// No token: skip the client-side gate, as a forger in the console would.
		// A plain click is ignored: React drops mouse events on an element whose
		// PROPS say disabled, whatever the DOM says. So call the button's React
		// onClick directly (React keeps the props on the node under
		// `__reactProps$…`). It then calls the Server Action with no real token.
		const state = await page.$$eval("button", (buttons) => {
			const b = buttons.find((x) => x.textContent?.startsWith("Join "));
			if (b === undefined) return "no Join button";
			const key = Object.keys(b).find((k) => k.startsWith("__reactProps$"));
			const props = key === undefined ? undefined : b[key];
			if (typeof props?.onClick !== "function") return "no React onClick found";
			props.onClick({ preventDefault() {}, stopPropagation() {}, currentTarget: b, target: b });
			return "called the button's React onClick directly";
		});
		console.log(`  · bypass: ${state}`);
		bypassed = true;
		console.log("  · no Turnstile token (on production the automated browser is refused), so the client-side gate was bypassed");
	}
	try {
		if (!bypassed) {
			expect(true, "the widget issued a token (the Join button is enabled)");
			await page.locator("button::-p-text(Join )").click();
		}
	} catch (error) {
		mkdirSync(`${REPO_ROOT}.data`, { recursive: true });
		const shot = `${REPO_ROOT}.data/turnstile-forge.png`;
		await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
		console.log(`\n  no Turnstile token arrived. Diagnostics:\n  screenshot: ${shot}`);
		console.log(`  requests to challenges.cloudflare.com (${challengeRequests.length}):\n${challengeRequests.map((r) => `    ${r}`).join("\n") || "    (none: the script didn't load)"}`);
		console.log(`  browser console:\n${consoleLines.map((l) => `    ${l}`).join("\n") || "    (empty)"}`);
		throw error;
	}

	await page.waitForFunction(() => /confirm you.re human|couldn.t run the human check|already in|You.re in/.test(document.body.innerText), { timeout: 30_000 });
	const shown = await page.$eval("body", (b) => b.innerText);
	expect(captured !== null, `the Server Action request was intercepted (${bypassed ? "no real token existed" : `the real token was ${captured?.realTokenLength} chars`}; sent "${FORGED}")`);

	if (local && isMember()) {
		console.log("  · locally, the always-pass test secret accepted the forged token, as expected with those keys");
		d1(`DELETE FROM group_member WHERE group_id = ${sqlId(groupId)} AND user_id = ${sqlId(joinerId)}`, { local });
	} else {
		expect(/confirm you.re human/.test(shown), 'the page says "We couldn\'t confirm you\'re human"', shown.slice(0, 200));
		expect(!isMember(), "no membership was written", "a group_member row exists");
	}

	// 2. The recorded forged-submit command: the captured request, replayed with curl.
	const replay = (token) => {
		const body = JSON.stringify([code, token]);
		const args = ["-s", "-o", "-", "-w", "\n%{http_code}", "-X", "POST", captured.url,
			"-H", `Next-Action: ${captured.headers["next-action"]}`,
			"-H", `Next-Router-State-Tree: ${captured.headers["next-router-state-tree"] ?? ""}`,
			"-H", "Content-Type: text/plain;charset=UTF-8", "-H", "Accept: text/x-component",
			"-H", `Origin: ${baseUrl}`, "-H", `Cookie: ${[...joiner.cookies].map(([k, v]) => `${k}=${v}`).join("; ")}`,
			"--data", body];
		const out = execFileSync("curl", args, { encoding: "utf8" });
		const status = out.trim().split("\n").at(-1);
		console.log(`\n  $ curl -X POST ${captured.url} -H 'Next-Action: ${captured.headers["next-action"]}' -H 'Cookie: <the joiner's session>' --data '${body}'`);
		console.log(`    → HTTP ${status}, body: ${out.replace(/\n\d+$/, "").slice(0, 160)}`);
		return out;
	};
	const empty = replay("");
	expect(/not-verified/.test(empty), "curl with an EMPTY token → the server answers not-verified", empty.slice(0, 200));
	expect(!isMember(), "…and writes no membership", "a group_member row exists");
	if (!local || process.env.EXPECT_REFUSAL === "1") {
		const forged = replay(FORGED);
		expect(/not-verified/.test(forged), "curl with a FORGED token → the server answers not-verified", forged.slice(0, 200));
		expect(!isMember(), "…and writes no membership", "a group_member row exists");
	}
} catch (error) {
	failed = true;
	console.error(`\n${error.message}\n`);
} finally {
	await browser.close();
	try {
		cleanup({ local, emails, groupIds });
	} catch (error) {
		failed = true;
		console.error(`cleanup failed: ${error.message}`);
	}
}

console.log(failed ? "\nTURNSTILE-FORGE FAILED" : "\nturnstile-forge passed");
process.exit(failed ? 1 : 0);
