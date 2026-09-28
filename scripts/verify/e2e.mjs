// The full two-browser run (ADR-0024, e2e-nightly.yml): what a person does,
// in a real browser, against the real site. It spends ~70 Workers AI neurons
// (Read receipt) and a few embedding calls, which is why it runs nightly and
// not on every deploy.
//
//   node scripts/verify/e2e.mjs <BASE_URL>          headless
//   HEADFUL=1 node scripts/verify/e2e.mjs <BASE_URL>  watch it
//
// Alice signs up, creates a group and copies the invite link. Bob joins through
// it (locally; on production via D1, because Turnstile refuses automated
// browsers there: see step 3). Alice adds a dinner, then a receipt she has read, which can't be saved
// until she confirms the amount. Both open "Settle up"; Bob records it, and
// Alice's stale form is refused, naming Bob. Then search finds the receipt by
// one of its items. Cleanup runs even if a step fails.
//
// On failure, each person's last screen is saved to .data/e2e-<name>.png.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { launchBrowser } from "./browser.mjs";
import { cleanup } from "./cleanup.mjs";
import { EXPECTED } from "./fixtures/make-receipt.mjs";
import { Client, d1, expect, REPO_ROOT, runId, signUp, sqlId, target, testPassword } from "./lib.mjs";

const { baseUrl, local } = target();
const run = runId("e2e");
const RECEIPT = fileURLToPath(new URL("./fixtures/receipt.png", import.meta.url));
const people = {
	alice: { name: "Alice E2E", email: `alice.${run}@example.test`, password: testPassword() },
	bob: { name: "Bob E2E", email: `bob.${run}@example.test`, password: testPassword() },
};
const uploadedReceipts = [];
let failed = false;

/** Waits for a client-side navigation: Server Action redirects don't fire a page load. */
const waitForPath = (page, pattern) => page.waitForFunction((source) => new RegExp(source).test(location.pathname + location.search), {}, pattern.source);
const bodyText = (page) => page.$eval("body", (b) => b.innerText);
/** Waits for text to appear: pages stream in behind a loading skeleton. */
const waitForText = (page, text, timeout) => page.waitForFunction((t) => document.body.innerText.includes(t), timeout ? { timeout } : {}, text);

/**
 * Navigates and waits for the network to go quiet, i.e. for React to hydrate.
 * A file chosen before hydration fires no onChange (seen on the first run), and
 * a person can't act that fast but a script can.
 */
const open = (page, url) => page.goto(url, { waitUntil: "networkidle2" });

async function fill(page, selector, value) {
	await page.locator(selector).fill(value);
}

console.log(`e2e ${run} → ${baseUrl}`);
const browser = await launchBrowser();
const pages = {};

try {
	// One browser context per person: separate cookies, like two phones.
	for (const who of ["alice", "bob"]) {
		const context = await browser.createBrowserContext();
		pages[who] = await context.newPage();
		pages[who].setDefaultTimeout(30_000);
		// Tall enough that no button sits under `next dev`'s fixed "N" badge,
		// which swallowed the Read receipt click at the default 800×600.
		await pages[who].setViewport({ width: 1280, height: 1200 });
	}
	const { alice, bob } = pages;

	// 1. Alice signs up and lands on her groups.
	await open(alice, `${baseUrl}/register`);
	await fill(alice, 'input[name="name"]', people.alice.name);
	await fill(alice, 'input[name="email"]', people.alice.email);
	await fill(alice, 'input[name="password"]', people.alice.password);
	await alice.locator('button[type="submit"]').click();
	await waitForPath(alice, /^\/groups$/);
	expect(true, "Alice signs up and lands on /groups");

	// 2. She creates a group and reads the invite link off the members page.
	await open(alice, `${baseUrl}/groups/new`);
	await fill(alice, "input#name", `E2E ${run}`);
	await alice.locator('button[type="submit"]').click();
	await waitForPath(alice, /^\/groups\/grp_[0-9a-f]{32}$/);
	const groupPath = await alice.evaluate(() => location.pathname);
	expect(true, `Alice creates a group (${groupPath})`);
	await open(alice, `${baseUrl}${groupPath}/members`);
	const invite = (await alice.$eval("code", (c) => c.textContent ?? "")).trim();
	expect(invite.includes("/join/"), "the members page shows an invite link", invite);

	// 3. Bob joins.
	//    Locally: through the real invite form (Cloudflare's test keys let an
	//    automated browser through Turnstile).
	//    On production: Turnstile refuses automated browsers by design (Error
	//    600010, ADR-0030), so Bob signs up through the API, his membership is
	//    inserted in D1, and his browser gets his session. The join form itself is
	//    covered there by turnstile-forge.mjs. E2E_JOIN=form|d1 overrides.
	const joinVia = process.env.E2E_JOIN ?? (local ? "form" : "d1");
	if (joinVia === "form") {
		await open(bob, invite);
		await fill(bob, 'input[name="name"]', people.bob.name);
		await fill(bob, 'input[name="email"]', people.bob.email);
		await fill(bob, 'input[name="password"]', people.bob.password);
		await bob.locator('button[type="submit"]').click();
		await waitForPath(bob, new RegExp(`^${groupPath}\\?joined=1$`));
		expect(true, "Bob joins through the invite link (the real form, past Turnstile)");
	} else {
		const bobApi = new Client(baseUrl);
		const bobId = await signUp(bobApi, people.bob);
		const groupId = groupPath.split("/").at(-1);
		d1(`INSERT INTO group_member (group_id, user_id) VALUES (${sqlId(groupId)}, ${sqlId(bobId)})`, { local });
		await bob.setCookie(...[...bobApi.cookies].map(([name, value]) => ({ name, value, url: baseUrl })));
		await open(bob, `${baseUrl}${groupPath}`);
		await waitForText(bob, `E2E ${run}`);
		expect(true, "Bob is in the group (signed up by API, membership via D1: production Turnstile refuses automated browsers)");
	}

	// 4. Alice pays £80 for both of them (payer and split default to her and everyone).
	await open(alice, `${baseUrl}${groupPath}/expenses/new`);
	await fill(alice, 'input[name="description"]', "E2E dinner");
	await fill(alice, 'input[name="amount"]', "80.00");
	await alice.locator('button[type="submit"]').click();
	await waitForPath(alice, new RegExp(`^${groupPath}$`));
	await waitForText(alice, "E2E dinner");
	expect(true, "Alice adds a £80 dinner, and it's in the feed");

	// 5. A receipt: upload, read, and the confirm gate.
	await open(alice, `${baseUrl}${groupPath}/expenses/new`);
	// Clicked like a person, through the file picker, never set directly. On
	// 2026-09-25 this first click was swallowed: the autofocused description's
	// blur showed an error that moved the input 24px between mousedown and
	// mouseup. Setting the file with uploadFile() had hidden that. It's fixed,
	// and this guards it: the first click must open the picker.
	const chooser = alice.waitForFileChooser({ timeout: 5_000 }).catch(() => null);
	await alice.locator("input#receipt").click();
	const picker = await chooser;
	expect(picker !== null, "the first click on the receipt input opens the file picker");
	expect(!(await bodyText(alice)).includes("Say what this was for"), "…and shows no error on the description nobody touched");
	await picker.accept([RECEIPT]);
	await waitForText(alice, "Attached: receipt.png");
	// Its R2 key, for cleanup, in case the run fails before the expense is saved.
	uploadedReceipts.push(await alice.$eval('input[name="receiptKey"]', (i) => i.value));
	expect(true, "the photo uploads straight to R2");
	await alice.locator("button::-p-text(Read receipt)").click();
	await alice.waitForSelector('input[name="amountConfirmed"]', { timeout: 90_000 });
	const read = await alice.evaluate(() => ({
		description: document.querySelector('input[name="description"]').value,
		amount: document.querySelector('input[name="amount"]').value,
		items: document.querySelectorAll('input[aria-label^="Item "]').length,
	}));
	const expectedAmount = (EXPECTED.totalMinorUnits / 100).toFixed(2);
	// The model's accuracy is the vision eval's job (D.6), not this test's. A
	// misread is reported, and the "human" corrects it, which is the design.
	console.log(`  · read: "${read.description}", £${read.amount}, ${read.items} item(s)${read.amount === expectedAmount ? "" : `  (⚠ expected £${expectedAmount})`}`);
	expect(read.items > 0, "Read receipt fills the form with line items", read);
	const submit = 'button[type="submit"]';
	expect(await alice.$eval(submit, (b) => b.disabled), "Add expense is disabled until the amount is confirmed");
	if (read.amount !== expectedAmount) await fill(alice, 'input[name="amount"]', expectedAmount);
	if (read.description.trim() === "") await fill(alice, 'input[name="description"]', EXPECTED.merchant);
	await alice.locator('input[name="amountConfirmed"]').click();
	expect(!(await alice.$eval(submit, (b) => b.disabled)), "…and enabled once it is");
	const receiptDescription = await alice.$eval('input[name="description"]', (i) => i.value);
	await alice.locator(submit).click();
	await waitForPath(alice, new RegExp(`^${groupPath}$`));
	expect(true, `the read receipt is saved as "${receiptDescription}" £${expectedAmount}`);

	// 6. Both open Settle up. Bob owes £40 + £4.75. He records it; Alice's form is now stale.
	await Promise.all([open(alice, `${baseUrl}${groupPath}/settle`), open(bob, `${baseUrl}${groupPath}/settle`)]);
	await Promise.all([alice.waitForSelector('input[name="amount"]'), bob.waitForSelector('input[name="amount"]')]);
	const owed = await bob.$eval('input[name="amount"]', (i) => i.value);
	expect(owed === "44.75", "Settle up suggests Bob pays Alice £44.75", owed);
	await bob.locator("button::-p-text(Record this settlement)").click();
	await waitForText(bob, "Settled: £44.75");
	expect(true, "Bob records it: \"Settled: £44.75\"");
	await alice.locator("button::-p-text(Record this settlement)").click();
	await waitForText(alice, "Already settled");
	const refusal = await bodyText(alice);
	expect(refusal.includes(`${people.bob.name} recorded`), "Alice's duplicate is refused, naming Bob", refusal.slice(0, 400));

	// 7. Search finds the receipt by one of its items. First, search is reached
	// the way a person reaches it: the "Search" link in the top bar, then the
	// form. Until 2026-09-28 no link existed, and every script had opened the
	// URL directly, so nobody noticed.
	const query = "croissant";
	await open(alice, `${baseUrl}/groups`);
	await alice.locator('header a[href="/search"]').click();
	await waitForPath(alice, /^\/search$/);
	await fill(alice, 'input[name="q"]', query);
	await alice.locator('form[role="search"] button[type="submit"]').click();
	await waitForPath(alice, /^\/search\?q=croissant$/);
	expect(true, "search is reached from the top bar, and its form submits the query");
	// Indexing runs after the save (waitUntil) and Vectorize is eventually
	// consistent, so poll.
	let found = false;
	// Up to 5 minutes: usually seconds, but on 2026-09-25 it took over 2
	// (the vector was indexed; Vectorize hadn't made it queryable yet). A slow
	// index shouldn't fail the nightly run; one that never answers should.
	for (let attempt = 0; attempt < 30 && !found; attempt++) {
		if (attempt > 0) await new Promise((r) => setTimeout(r, 10_000));
		await open(alice, `${baseUrl}/search?q=${query}`);
		// Wait until the page has answered (the mode links show on hits and on
		// "Nothing matches" alike), then look for the receipt among the hits.
		await waitForText(alice, "By keyword");
		found = (await bodyText(alice)).includes(receiptDescription);
	}
	expect(found, `search "${query}" finds "${receiptDescription}"`);
} catch (error) {
	failed = true;
	console.error(`\n${error.message}\n`);
	mkdirSync(`${REPO_ROOT}.data`, { recursive: true });
	for (const [who, page] of Object.entries(pages)) {
		await page.screenshot({ path: `${REPO_ROOT}.data/e2e-${who}.png`, fullPage: true }).catch(() => {});
	}
} finally {
	await browser.close();
	try {
		cleanup({ local, emails: Object.values(people).map((p) => p.email), receiptKeys: uploadedReceipts });
	} catch (error) {
		failed = true;
		console.error(`cleanup failed: ${error.message}`);
	}
}

console.log(failed ? "\nE2E FAILED" : "\ne2e passed");
process.exit(failed ? 1 : 0);
