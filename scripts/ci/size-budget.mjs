// The Worker size budget (ADR-0024, ci.yml). Run after `opennextjs-cloudflare
// build`:
//
//   node scripts/ci/size-budget.mjs
//
// The free plan refuses a Worker above 3 MiB gzipped (3,072 KiB). This fails
// above 2,900 KiB and warns above 2,700, so a PR that adds a lot shows up
// before a deploy does. On 2026-09-25 one Route Handler added 192 KiB (a third
// copy of Better Auth); the app was at 2,543 KiB.
//
// The size is wrangler's own figure from `deploy --dry-run`, which uploads
// nothing and needs no Cloudflare credentials. In GitHub Actions the result
// also goes into the job summary, so the trend is visible PR by PR.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const FAIL_KIB = 2900;
const WARN_KIB = 2700;
const LIMIT_KIB = 3072;

let out;
try {
	out = execFileSync("npx", ["wrangler", "deploy", "--dry-run"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (error) {
	// Usually a missing build: `.open-next/worker.js` comes from the build step.
	console.log(`::error::size budget: wrangler deploy --dry-run failed:\n${String(error.stderr ?? error.message).trim()}`);
	process.exit(1);
}
const match = out.match(/Total Upload: ([\d.]+) KiB \/ gzip: ([\d.]+) KiB/);
if (match === null) {
	console.error(`::error::size budget: couldn't find the size in wrangler's output:\n${out}`);
	process.exit(1);
}
const gzip = Number(match[2]);
const percent = ((gzip / LIMIT_KIB) * 100).toFixed(1);
const line = `Worker size: **${gzip.toFixed(0)} KiB** gzipped, ${percent}% of the ${LIMIT_KIB} KiB limit (warn above ${WARN_KIB}, fail above ${FAIL_KIB}). Uncompressed: ${Number(match[1]).toFixed(0)} KiB.`;

console.log(line.replaceAll("**", ""));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Size budget\n\n${line}\n`);

if (gzip > FAIL_KIB) {
	console.log(`::error::The Worker is ${gzip.toFixed(0)} KiB gzipped, over the ${FAIL_KIB} KiB budget.`);
	process.exit(1);
}
if (gzip > WARN_KIB) console.log(`::warning::The Worker is ${gzip.toFixed(0)} KiB gzipped, over the ${WARN_KIB} KiB warning line.`);
