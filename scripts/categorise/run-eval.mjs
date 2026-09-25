// The categorisation eval (ADR-0025 §1, ADR-0017's 2×2 grid).
//
// Start the AI Worker and the harness first (both dev-only, local; AI and
// Vectorize are remote):
//   npx wrangler dev -c workers/ai/wrangler.jsonc --port 8793
//   npx wrangler dev -c scripts/categorise/eval-worker/wrangler.jsonc --port 8797
//
//   node scripts/categorise/run-eval.mjs --load       load the seed corpus and eval histories into the index (idempotent)
//   node scripts/categorise/run-eval.mjs              the grid: {8b, 70b} × {no RAG, RAG} × 3 runs, then a threshold sweep
//   node scripts/categorise/run-eval.mjs --runs 1     fewer runs (cheaper)
//
// Clean and shorthand items run against "eval-empty", a group with no vectors,
// so their RAG examples come from the seed corpus only. Group items run against
// their own planted history. Results go to .data/categorise-eval-<time>.json.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const HARNESS = process.env.HARNESS ?? "http://localhost:8797";
const here = (name) => new URL(name, import.meta.url);
const seed = JSON.parse(readFileSync(here("./seed-corpus.json"), "utf8")).items;
const evalSet = JSON.parse(readFileSync(here("./eval-set.json"), "utf8"));
const flags = process.argv.slice(2);
const flag = (name, fallback) => {
	const at = flags.indexOf(name);
	return at === -1 ? fallback : flags[at + 1];
};

// 0. Guards: approved labels, and no eval item leaking into what RAG can retrieve.
if (evalSet.approved?.by !== "Raffaele") {
	console.error("eval-set.json isn't approved; refusing to run");
	process.exit(2);
}
const norm = (s) => s.toLowerCase().trim();
const retrievable = new Set([
	...seed.flatMap((s) => [norm(s.rawText), norm(s.description)]),
	...Object.values(evalSet.groups).flatMap((g) => g.history.map((h) => norm(h.description))),
]);
const leaks = evalSet.items.filter((i) => retrievable.has(norm(i.description)));
if (leaks.length > 0) {
	console.error(`leakage: ${leaks.map((l) => l.id).join(", ")} can be retrieved; refusing to run`);
	process.exit(2);
}

async function post(path, body) {
	const res = await fetch(`${HARNESS}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
	if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
	return res.json();
}

// 1. --load: the reference vectors, then wait until Vectorize answers for them.
if (flags.includes("--load")) {
	const vectors = [
		...seed.map((s) => ({ id: s.id, groupId: "seed", text: s.description, category: s.category })),
		...Object.entries(evalSet.groups).flatMap(([groupId, g]) => g.history.map((h) => ({ id: h.id, groupId, text: h.description, category: h.category }))),
	];
	console.log(`loading ${vectors.length} reference vectors…`, await post("/load", { vectors }));
	const probes = [
		{ text: seed[0].description, groupId: "seed", id: seed[0].id },
		...Object.entries(evalSet.groups).map(([groupId, g]) => ({ text: g.history[0].description, groupId, id: g.history[0].id })),
	];
	for (let attempt = 1; attempt <= 40; attempt++) {
		const found = await Promise.all(probes.map(async (p) => (await post("/probe", p)).some((m) => m.id === p.id)));
		if (found.every(Boolean)) {
			console.log(`queryable after ${attempt} check(s)`);
			process.exit(0);
		}
		await new Promise((r) => setTimeout(r, 15_000));
	}
	console.error("not queryable after 10 minutes");
	process.exit(1);
}

// 2. The grid.
const runs = Number(flag("--runs", "3"));
const groupFor = (item) => item.group ?? "eval-empty";

async function categoriseOne(item, options) {
	const res = await post("/categorise", { groupId: groupFor(item), items: [{ id: `eval_${item.id}`, text: item.description }], options });
	const r = res.results?.[0];
	return { status: res.status, category: r?.category ?? "uncategorised", raw: r?.raw ?? null, ms: res.ms ?? null, neurons: r?.neurons ?? null, groupExamples: r?.groupExamples ?? 0, seedExamples: r?.seedExamples ?? 0 };
}

/** Runs every item, 4 at a time. */
async function cell(options, label) {
	const out = [];
	for (let i = 0; i < evalSet.items.length; i += 4) {
		const batch = evalSet.items.slice(i, i + 4);
		const results = await Promise.all(batch.map((item) => categoriseOne(item, options)));
		batch.forEach((item, j) => out.push({ id: item.id, set: item.set, expected: item.expected, ...results[j], correct: results[j].category === item.expected }));
	}
	process.stdout.write(`  ${label}: ${out.filter((r) => r.correct).length}/${out.length}\n`);
	return out;
}

const median = (xs) => {
	const s = xs.filter((x) => x !== null).sort((a, b) => a - b);
	return s.length === 0 ? null : s[Math.floor((s.length - 1) / 2)];
};
const p95 = (xs) => {
	const s = xs.filter((x) => x !== null).sort((a, b) => a - b);
	return s.length === 0 ? null : s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)];
};

const grid = [];
for (const model of ["8b", "70b"]) {
	for (const rag of [false, true]) {
		const label = `${model} ${rag ? "RAG" : "no RAG"}`;
		const all = [];
		for (let r = 1; r <= runs; r++) all.push(await cell({ model, rag }, `${label} run ${r}`));
		grid.push({ model, rag, runs: all });
	}
}

// 3. The threshold sweep (ADR-0025 §2: measured, not guessed), on the group set, with 8B + RAG.
const sweep = [];
for (const threshold of [0.5, 0.6, 0.7, 0.8]) {
	const items = evalSet.items.filter((i) => i.set === "group");
	const results = await Promise.all(items.map((item) => categoriseOne(item, { model: "8b", rag: true, threshold })));
	sweep.push({ threshold, correct: results.filter((r, j) => r.category === items[j].expected).length, of: items.length, seedUsed: results.filter((r) => r.seedExamples > 0).length });
}

// 4. Report.
const sets = ["clean", "shorthand", "group"];
const acc = (rows, set) => rows.filter((r) => (!set || r.set === set) && r.correct).length;
console.log("\n| Model | RAG | Overall | Clean | Shorthand | Group | Median ms | p95 ms | Median neurons | Timeouts/failures |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const g of grid) {
	const rows = g.runs.flat();
	const perRun = g.runs.map((run) => acc(run)).join("/");
	console.log(
		`| ${g.model} | ${g.rag ? "yes" : "no"} | **${(acc(rows) / runs).toFixed(1)}/30** (runs: ${perRun}) | ` +
			sets.map((s) => `${(acc(rows, s) / runs).toFixed(1)}/10`).join(" | ") +
			` | ${median(rows.map((r) => r.ms))} | ${p95(rows.map((r) => r.ms))} | ${median(rows.map((r) => r.neurons))?.toFixed?.(2) ?? "?"} | ${rows.filter((r) => r.status !== "ok").length} |`,
	);
}
console.log("\nThreshold sweep (8B + RAG, group set, 1 run):");
for (const s of sweep) console.log(`  threshold ${s.threshold}: ${s.correct}/${s.of} correct, seed topped up for ${s.seedUsed}/${s.of}`);

console.log("\nMisses in the best RAG cell's first run:");
const best = [...grid].filter((g) => g.rag).sort((a, b) => acc(b.runs.flat()) - acc(a.runs.flat()))[0];
for (const r of best.runs[0].filter((x) => !x.correct)) console.log(`  ${best.model} ${r.id} (${r.set}): expected ${r.expected}, got ${r.category} (raw ${JSON.stringify(r.raw)})`);

mkdirSync(new URL("../../.data/", import.meta.url), { recursive: true });
const file = new URL(`../../.data/categorise-eval-${Date.now()}.json`, import.meta.url);
writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), runs, grid, sweep }, null, 1));
console.log(`\nraw results: ${file.pathname}`);
