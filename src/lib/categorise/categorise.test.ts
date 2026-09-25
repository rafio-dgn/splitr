// The AI Worker's logic, with every binding faked (ADR-0012: pure logic gets
// node --test; the real bindings are exercised by the eval).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { categorise, type CategoriseDeps, type Match } from "./categorise.ts";
import { buildMessages, parseCategory, type Example } from "./prompt.ts";
import { parseSecretList, secretAccepted } from "./secret.ts";

const SECRET = "s3cret-current";

/** Fake bindings that record what was called. `groups` maps a groupId to its matches. */
function fakes(opts: {
	groups?: Record<string, Match[]>;
	answer?: unknown;
	generateDelayMs?: number;
	generateThrows?: boolean;
	resolveAll?: boolean;
} = {}) {
	const calls = { embed: 0, nearest: [] as { groupId: string; topK: number }[], generate: [] as string[], prompts: [] as string[] };
	const deps: CategoriseDeps = {
		async embed(texts) {
			calls.embed++;
			return texts.map(() => [0.1, 0.2]);
		},
		async nearest(_vector, groupId, topK) {
			calls.nearest.push({ groupId, topK });
			return (opts.groups?.[groupId] ?? []).slice(0, topK);
		},
		async resolve(matches, source) {
			// Every match resolves unless told otherwise; "unc_" ids stand for uncategorised rows D1 drops.
			return matches
				.filter((m) => opts.resolveAll !== false && !m.id.startsWith("unc_"))
				.map((m): Example => ({ text: `text of ${m.id}`, category: "groceries", source }));
		},
		async generate(model, messages) {
			calls.generate.push(model);
			calls.prompts.push(messages[1]?.content ?? "");
			if (opts.generateDelayMs) await new Promise((r) => setTimeout(r, opts.generateDelayMs));
			if (opts.generateThrows) throw new Error("AiError: 3040 capacity");
			return { response: opts.answer ?? "drinks", neurons: 2.9 };
		},
		now: () => Date.now(),
	};
	return { deps, calls };
}

const request = (extra: object = {}) => ({ groupId: "grp_a", items: [{ id: "li_1", text: "Peroni 4 pack" }], ...extra });
const match = (id: string, score: number): Match => ({ id, score });

describe("secret check (ADR-0025 §3)", () => {
	it("accepts any secret in the list: the F.5 dual-key window", () => {
		assert.equal(secretAccepted("old", "old,new"), true);
		assert.equal(secretAccepted("new", "old, new"), true);
	});
	it("refuses anything else, including prefixes, blanks and non-strings", () => {
		assert.equal(secretAccepted("ol", "old,new"), false);
		assert.equal(secretAccepted("", "old,new"), false);
		assert.equal(secretAccepted(undefined, "old"), false);
		assert.equal(secretAccepted(42, "42"), false);
	});
	it("fails closed: an empty or missing list refuses everything, and a stray comma can't accept ''", () => {
		assert.equal(secretAccepted("x", undefined), false);
		assert.equal(secretAccepted("x", ""), false);
		assert.deepEqual(parseSecretList(" a, ,b,"), ["a", "b"]);
	});
});

describe("parseCategory: the model's answer is untrusted", () => {
	it("tolerates case, quotes, a full stop and a 'Category:' prefix", () => {
		assert.equal(parseCategory("Drinks"), "drinks");
		assert.equal(parseCategory(' "eating_out". '), "eating_out");
		assert.equal(parseCategory("Category: travel_lodging"), "travel_lodging");
	});
	it("refuses sentences, two keys, unknown words and the system-only 'uncategorised'", () => {
		assert.equal(parseCategory("I think this is drinks"), null);
		assert.equal(parseCategory("drinks or groceries"), null);
		assert.equal(parseCategory("beverages"), null);
		assert.equal(parseCategory("uncategorised"), null);
		assert.equal(parseCategory(undefined), null);
	});
});

describe("buildMessages", () => {
	it("puts the group's habits before the general examples, and the item last", () => {
		const prompt = buildMessages("Peroni 4 pack", [
			{ text: "Beer for the fridge", category: "groceries", source: "group" },
			{ text: "Pint of lager at the pub", category: "drinks", source: "seed" },
		])[1]?.content ?? "";
		const group = prompt.indexOf("How this group");
		const seed = prompt.indexOf("General examples");
		assert.ok(group >= 0 && seed > group && prompt.indexOf('Item: "Peroni 4 pack"') > seed);
	});
	it("with no examples, it's the no-RAG baseline: no example sections at all", () => {
		const prompt = buildMessages("Gas bill", [])[1]?.content ?? "";
		assert.ok(!prompt.includes("How this group") && !prompt.includes("General examples"));
	});
});

describe("categorise (REQ-E.4)", () => {
	it("a wrong secret is refused before anything is called: no embedding, no retrieval, no model", async () => {
		const { deps, calls } = fakes();
		const res = await categorise(deps, "guess", request(), { acceptedSecrets: SECRET });
		assert.deepEqual(res, { status: "refused" });
		assert.equal(calls.embed + calls.nearest.length + calls.generate.length, 0);
	});

	it("an invalid request is refused after the secret, with the reasons, and calls nothing", async () => {
		const { deps, calls } = fakes();
		const res = await categorise(deps, SECRET, { groupId: "grp_a", items: [] }, { acceptedSecrets: SECRET });
		assert.equal(res.status, "invalid");
		assert.equal(calls.generate.length, 0);
	});

	it("with enough group history, the seed corpus is never queried", async () => {
		const { deps, calls } = fakes({ groups: { grp_a: [match("a", 0.9), match("b", 0.8), match("c", 0.7)] } });
		const res = await categorise(deps, SECRET, request(), { acceptedSecrets: SECRET });
		assert.equal(res.status, "ok");
		assert.deepEqual(calls.nearest.map((n) => n.groupId), ["grp_a"]);
		assert.equal(res.status === "ok" && res.results[0]?.groupExamples, 3);
	});

	it("tops up from the seed when too few group matches clear the threshold, and asks only for what's missing", async () => {
		const { deps, calls } = fakes({
			groups: { grp_a: [match("a", 0.9), match("low", 0.2)], seed: [match("s1", 0.8), match("s2", 0.7), match("s3", 0.6), match("s4", 0.5)] },
		});
		const res = await categorise(deps, SECRET, request(), { acceptedSecrets: SECRET });
		assert.deepEqual(calls.nearest, [{ groupId: "grp_a", topK: 6 }, { groupId: "seed", topK: 4 }]);
		assert.equal(res.status === "ok" && res.results[0]?.groupExamples, 1);
		assert.equal(res.status === "ok" && res.results[0]?.seedExamples, 4);
	});

	it("never uses the item itself, or an uncategorised neighbour, as an example", async () => {
		const { deps } = fakes({ groups: { grp_a: [match("li_1", 1), match("unc_x", 0.9), match("a", 0.9)] } });
		const res = await categorise(deps, SECRET, request(), { acceptedSecrets: SECRET });
		assert.equal(res.status === "ok" && res.results[0]?.groupExamples, 1);
	});

	it("rag: false is the baseline: no embedding, no retrieval, a prompt with no examples", async () => {
		const { deps, calls } = fakes();
		await categorise(deps, SECRET, request({ options: { rag: false, model: "70b" } }), { acceptedSecrets: SECRET });
		assert.equal(calls.embed, 0);
		assert.equal(calls.nearest.length, 0);
		assert.equal(calls.generate[0], "70b");
		assert.ok(!calls.prompts[0]?.includes("examples"));
	});

	it("an answer that isn't a key is stored as uncategorised, with the raw answer kept for the audit", async () => {
		const { deps } = fakes({ answer: "This looks like beer, so drinks." });
		const res = await categorise(deps, SECRET, request(), { acceptedSecrets: SECRET });
		assert.equal(res.status === "ok" && res.results[0]?.category, "uncategorised");
		assert.equal(res.status === "ok" && res.results[0]?.raw, "This looks like beer, so drinks.");
	});

	it("over budget, every item is uncategorised and the status says timeout (ADR-0025 §4)", async () => {
		const { deps } = fakes({ generateDelayMs: 200 });
		const res = await categorise(deps, SECRET, request(), { acceptedSecrets: SECRET, budgetMs: 20 });
		assert.equal(res.status, "timeout");
		assert.equal(res.status === "timeout" && res.results[0]?.category, "uncategorised");
	});

	it("a binding that throws gives failed, with every item uncategorised, never an exception", async () => {
		const { deps } = fakes({ generateThrows: true });
		const res = await categorise(deps, SECRET, request(), { acceptedSecrets: SECRET });
		assert.equal(res.status, "failed");
		assert.equal(res.status === "failed" && res.results[0]?.category, "uncategorised");
	});
});
