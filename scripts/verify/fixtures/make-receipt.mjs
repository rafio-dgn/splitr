// Renders receipt.png, the synthetic receipt e2e.mjs uploads for "Read receipt"
// (Raffaele's choice, 2026-09-25: generated, so nothing personal is in the repo).
//
//   node scripts/verify/fixtures/make-receipt.mjs
//
// The PNG is committed so CI doesn't depend on this script's rendering. Re-run
// it only to change the receipt, and keep EXPECTED below in step.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { launchBrowser } from "../browser.mjs";

/** What the image says. e2e.mjs compares the model's reading with this. */
export const EXPECTED = {
	merchant: "Corner Cafe",
	totalMinorUnits: 950,
	items: [
		["Flat white", "3.20"],
		["Almond croissant", "2.80"],
		["Orange juice", "3.50"],
	],
};

// Only run the render when called directly, so e2e.mjs can import EXPECTED.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const rows = EXPECTED.items.map(([name, price]) => `<tr><td>${name}</td><td>£${price}</td></tr>`).join("");
	const html = `<!doctype html><meta charset="utf-8">
<style>
	body { margin: 0; background: #fff; font: 22px/1.5 "Courier New", monospace; color: #111; }
	.r { width: 420px; padding: 32px; }
	h1 { font-size: 30px; text-align: center; margin: 0 0 4px; }
	p { text-align: center; margin: 0; }
	table { width: 100%; border-collapse: collapse; margin: 20px 0; }
	td:last-child { text-align: right; }
	.total td { border-top: 2px dashed #111; font-weight: bold; padding-top: 8px; }
</style>
<div class="r">
	<h1>CORNER CAFE</h1>
	<p>12 High Street, London</p>
	<p>2026-09-25 09:41</p>
	<table>${rows}
		<tr class="total"><td>TOTAL</td><td>£9.50</td></tr>
		<tr><td>Card</td><td>£9.50</td></tr>
	</table>
	<p>Thank you!</p>
</div>`;

	const browser = await launchBrowser();
	const page = await browser.newPage();
	await page.setViewport({ width: 484, height: 520, deviceScaleFactor: 2 });
	await page.setContent(html);
	const png = await (await page.$(".r")).screenshot({ type: "png" });
	await browser.close();
	const out = new URL("./receipt.png", import.meta.url);
	writeFileSync(out, png);
	console.log(`wrote ${out.pathname} (${png.length} bytes)`);
}
