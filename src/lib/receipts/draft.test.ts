/**
 * The draft parser handles untrusted model output (ADR-0021), so it's tested
 * like the money arithmetic (ADR-0012). `node --test`, no dependencies.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { moneyTextToCents, toReceiptDraft } from "./draft.ts";

describe("moneyTextToCents", () => {
	it("reads money the way receipts print it", () => {
		assert.equal(moneyTextToCents("38.35"), 3835);
		assert.equal(moneyTextToCents("RM 1,234.50"), 123450);
		assert.equal(moneyTextToCents("£7.5"), 750);
		assert.equal(moneyTextToCents(38.35), 3835);
		assert.equal(moneyTextToCents("193"), 19300);
	});
	it("refuses anything that isn't an amount", () => {
		for (const bad of ["", "abc", "1.234", "12.3.4", null, undefined, {}]) {
			assert.equal(moneyTextToCents(bad), null, String(bad));
		}
	});
});

describe("toReceiptDraft", () => {
	const good = {
		merchant: "99 SPEED MART S/B",
		date: "2017-02-07",
		total: "37.45",
		items: [
			{ raw: "INDOCAFE COFFEEMIX 3IN", description: "Indocafe coffee mix, 3-in-1", amount: "29.95" },
			{ raw: "CADBURY CHOCOLATE HAZEL", description: "Cadbury chocolate hazelnut", amount: "7.49" },
		],
	};

	it("turns a well-formed answer into a draft in minor units", () => {
		assert.deepEqual(toReceiptDraft(good), {
			merchant: "99 SPEED MART S/B",
			totalMinorUnits: 3745,
			items: [
				{ rawText: "INDOCAFE COFFEEMIX 3IN", description: "Indocafe coffee mix, 3-in-1", amountMinorUnits: 2995 },
				{ rawText: "CADBURY CHOCOLATE HAZEL", description: "Cadbury chocolate hazelnut", amountMinorUnits: 749 },
			],
		});
	});

	it("accepts the answer as a JSON string, even wrapped in prose", () => {
		assert.equal(toReceiptDraft(JSON.stringify(good))?.totalMinorUnits, 3745);
		assert.equal(toReceiptDraft(`Here you go: ${JSON.stringify(good)} Hope that helps!`)?.totalMinorUnits, 3745);
	});

	it("gives no draft at all without a usable total, because the total is the point", () => {
		assert.equal(toReceiptDraft({ ...good, total: "about forty" }), null);
		assert.equal(toReceiptDraft({ ...good, total: "0.00" }), null);
		assert.equal(toReceiptDraft("**Receipt Analysis** Total: 37.44"), null, "Markdown instead of JSON");
		assert.equal(toReceiptDraft(null), null);
	});

	it("drops unparseable items instead of failing the draft, since items are informational", () => {
		const draft = toReceiptDraft({ ...good, items: [...good.items, { raw: "???", amount: "n/a" }] });
		assert.equal(draft?.items.length, 2);
	});

	it("caps the merchant at the form's 80 characters", () => {
		assert.equal(toReceiptDraft({ ...good, merchant: "x".repeat(200) })?.merchant.length, 80);
	});
});
