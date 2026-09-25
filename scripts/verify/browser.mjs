// Launching a browser for e2e.mjs and the receipt fixture. Kept apart from
// lib.mjs so the smoke test never loads Puppeteer.
//
// puppeteer-core downloads no browser (Raffaele's choice, 2026-09-25): it
// drives the Chrome already installed, /Applications on a Mac and
// google-chrome on GitHub's ubuntu runners. CHROME_PATH overrides that.
import puppeteer from "puppeteer-core";

export function launchBrowser({ headless = process.env.HEADFUL !== "1" } = {}) {
	const executablePath = process.env.CHROME_PATH;
	return puppeteer.launch({
		headless,
		...(executablePath ? { executablePath } : { channel: "chrome" }),
	});
}
