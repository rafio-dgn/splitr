// REQ-F.5's downtime monitor on its own (ADR-0032). The guided drill,
// rotation-drill.mjs, runs the same watch itself. This is for watching by hand.
//
//   node scripts/verify/rotation-monitor.mjs <BASE_URL>                 until Ctrl+C
//   EXPECT=clean node scripts/verify/rotation-monitor.mjs <BASE_URL>    exit 1 if any search fell back
import { target } from "./lib.mjs";
import { startSearchWatch, utc } from "./rotation-watch.mjs";

const { baseUrl, local } = target();
console.log(`rotation-monitor → ${baseUrl}`);
const watch = await startSearchWatch({
	baseUrl,
	local,
	onChange: (line) => console.log(`\n${line}`),
	onPoll: (kind) => process.stdout.write(kind === "meaning" ? "." : "x"),
});
console.log(`  · watching from ${utc()} UTC, one search every 2 s. Ctrl+C to stop.\n`);

let stopping = false;
process.on("SIGINT", async () => {
	if (stopping) return;
	stopping = true;
	const { counts, windows } = watch.snapshot();
	await watch.stop();
	console.log(`\n\nsummary: ${counts.meaning} by meaning, ${counts.fallback} keyword fallback, ${counts.error} errors`);
	for (const w of windows) console.log(`  ✘ ${w.kind} from ${w.from} to ${w.to} UTC (${w.count} searches)`);
	if (windows.length === 0) console.log("  ✔ no search fell back: the AI Worker answered throughout");
	const bad = process.env.EXPECT === "clean" && windows.length > 0;
	console.log(bad ? "\nROTATION-MONITOR: DOWNTIME SEEN" : "\nrotation-monitor done");
	process.exit(bad ? 1 : 0);
});
