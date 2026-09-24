// D.6 spike runner (ADR-0021). Usage: start `npx wrangler dev --port 8796` in this
// folder, then `node run.mjs`. Reads every .data/receipts/*/labels.json, sends each
// image to each model with the SAME prompt, and scores the answers in ADR-0016 §10's
// order: total first, then items, then validity, then latency and neurons.
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("../../.data/receipts/", import.meta.url).pathname;
const MODELS = ["@cf/meta/llama-3.2-11b-vision-instruct", "@cf/meta/llama-4-scout-17b-16e-instruct"];
const ENDPOINT = "http://localhost:8796";

// One prompt for both models, so the comparison is fair.
const PROMPT_V1 = `You are reading a photo of a shop or restaurant receipt.
Return ONLY a JSON object, with no prose and no code fences, in exactly this shape:
{"merchant": string, "date": "YYYY-MM-DD" or null, "total": "12.34", "items": [{"raw": string, "description": string, "amount": "1.23"}]}
Rules:
- "total" is the final amount paid, as printed, after tax, discounts and rounding.
- "items" are the purchased lines only. Do NOT include subtotal, tax, GST, rounding, cash, change, card or payment lines.
- "raw" is the line's text exactly as printed. "description" is the same item in plain English, with abbreviations expanded.
- "amount" is the line's total price as printed. Use plain numbers without currency symbols.`;

// v2 targets the four failure modes v1 showed on 2026-09-24: a tax-summary
// "Total" taken as the bill total (both models, AEON), the pre-rounding figure
// taken as the total (Llama 3.2, 99 Speed Mart), product codes or whole printed
// lines put in "raw", and non-item lines counted as items.
const PROMPT_V2 = `You are reading a photo of a shop or restaurant receipt.
Return ONLY a JSON object, with no prose and no code fences, in exactly this shape:
{"merchant": string, "date": "YYYY-MM-DD" or null, "total": "12.34", "items": [{"raw": string, "description": string, "amount": "1.23"}]}
Rules for "total":
- It is the amount the customer actually paid: the figure after tax, discounts AND rounding. If a rounding line is printed, use the rounded figure.
- Ignore any "GST summary" or "tax summary" table at the bottom, even if one of its lines says "Total". Those are tax breakdowns, not the bill total.
- It must equal the cash, card or payment amount, less any change given.
Rules for "items":
- Only the purchased products or dishes. Never subtotal, tax, GST, service, rounding, cash, change, card, payment or summary lines.
- A priced add-on line counts as an item. An unpriced modifier line (for example "*G. Coleslaw" with no price) does not.
- "raw" is the product NAME exactly as printed, without product codes, barcodes, quantities or prices.
- "description" is that product in plain English, with abbreviations and shorthand expanded (for example "COFFEEMIX 3IN" becomes "Coffee mix, 3-in-1").
- "amount" is the line's total price (quantity times unit price), as a plain number without a currency symbol.`;

const PROMPT = process.env.PROMPT === "v1" ? PROMPT_V1 : PROMPT_V2;

/** "RM 1,234.50" / "38.35" / 38.35 → 3835, or null when it isn't money. */
function toCents(value) {
	const cleaned = String(value ?? "").replace(/[^0-9.\-]/g, "");
	if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
	const [whole, fraction = ""] = cleaned.replace("-", "").split(".");
	return (cleaned.startsWith("-") ? -1 : 1) * (Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}

/** The first {...} block in the text, parsed. Reports whether it needed extracting from surrounding prose. */
function parse(text) {
	if (typeof text === "object" && text !== null) return { json: text, clean: true };
	const s = String(text ?? "");
	try { return { json: JSON.parse(s), clean: true }; } catch {}
	const start = s.indexOf("{"), end = s.lastIndexOf("}");
	if (start >= 0 && end > start) { try { return { json: JSON.parse(s.slice(start, end + 1)), clean: false }; } catch {} }
	return { json: null, clean: false };
}

const receipts = [];
for (const dir of readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory())) {
	const labelsFile = join(ROOT, dir.name, "labels.json");
	if (!existsSync(labelsFile)) continue;
	for (const label of JSON.parse(readFileSync(labelsFile, "utf8"))) receipts.push({ ...label, path: join(ROOT, dir.name, label.file) });
}

const results = [];
for (const receipt of receipts) {
	const mime = extname(receipt.path).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
	const image = `data:${mime};base64,${readFileSync(receipt.path).toString("base64")}`;
	for (const model of MODELS) {
		const reply = await (await fetch(ENDPOINT, { method: "POST", body: JSON.stringify({ model, prompt: PROMPT, image }) })).json();
		const { json, clean } = reply.error ? { json: null, clean: false } : parse(reply.response);
		const items = Array.isArray(json?.items) ? json.items : [];
		const itemCents = items.map((i) => toCents(i.amount));
		const expectedTotal = toCents(receipt.total);
		const gotTotal = toCents(json?.total);
		results.push({
			file: receipt.file,
			model: model.split("/").pop(),
			error: reply.error ?? null,
			totalOk: gotTotal !== null && gotTotal === expectedTotal,
			expectedTotal, gotTotal,
			itemsExpected: receipt.items?.length ?? null,
			itemsFound: items.length,
			itemsMatched: (receipt.items ?? []).filter((want) => itemCents.includes(want.amountCents)).length,
			validJson: json !== null, cleanJson: clean,
			ms: reply.ms,
			neurons: reply.usage?.neurons ?? null,
			sample: items.slice(0, 2).map((i) => `${i.raw} → ${i.description}`),
		});
		const r = results.at(-1);
		console.log(`${r.file.padEnd(26)} ${r.model.padEnd(32)} total ${r.totalOk ? "✔" : "✖"} (${r.gotTotal}/${r.expectedTotal})  items ${r.itemsMatched}/${r.itemsExpected} (found ${r.itemsFound})  json ${r.validJson ? (r.cleanJson ? "clean" : "extracted") : "✖"}  ${r.ms} ms  ${r.neurons?.toFixed?.(1) ?? "?"} n${r.error ? "  ERROR " + r.error.slice(0, 80) : ""}`);
	}
}

console.log("\n=== summary ===");
for (const model of MODELS.map((m) => m.split("/").pop())) {
	const rs = results.filter((r) => r.model === model);
	const sum = (f) => rs.reduce((a, r) => a + (f(r) || 0), 0);
	const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
	console.log(`${model.padEnd(32)} totals ${sum((r) => r.totalOk)}/${rs.length}  items ${sum((r) => r.itemsMatched)}/${sum((r) => r.itemsExpected)}  valid JSON ${sum((r) => r.validJson)}/${rs.length} (clean ${sum((r) => r.cleanJson)})  median ${median(rs.map((r) => r.ms))} ms  median ${median(rs.map((r) => r.neurons ?? 0)).toFixed(1)} neurons  errors ${rs.filter((r) => r.error).length}`);
}
const out = join(ROOT, `spike-results-${new Date().toISOString().slice(0, 10)}-${process.env.PROMPT === "v1" ? "v1" : "v2"}.json`);
writeFileSync(out, JSON.stringify({ promptVersion: process.env.PROMPT === "v1" ? "v1" : "v2", prompt: PROMPT, models: MODELS, results }, null, 2));
console.log(`\nfull results → ${out}`);
