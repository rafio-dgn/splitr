// The categorisation eval harness (ADR-0025 §1). Dev-only; see wrangler.jsonc.
//
//   POST /load       { vectors: [{ id, groupId, text, category }] }  → embeds and upserts reference vectors
//   POST /probe      { text, groupId }                                → the top 3 matches with scores
//   POST /categorise <a CategoriseRequest>                            → splitr-ai's answer, over the service binding
const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";

async function embed(env, texts) {
	const result = await env.AI.run(EMBED_MODEL, { text: texts });
	return result.data;
}

const evalWorker = {
	async fetch(request, env) {
		if (request.method !== "POST") return new Response("POST only", { status: 405 });
		const path = new URL(request.url).pathname;
		const body = await request.json();

		if (path === "/load") {
			let upserted = 0;
			for (let i = 0; i < body.vectors.length; i += 50) {
				const batch = body.vectors.slice(i, i + 50);
				const values = await embed(env, batch.map((v) => v.text));
				// kind "reference": the AI Worker reads the label from here, not D1 (ADR-0025 §5).
				await env.VECTORIZE.upsert(
					batch.map((v, j) => ({ id: v.id, values: values[j], metadata: { groupId: v.groupId, kind: "reference", text: v.text, category: v.category } })),
				);
				upserted += batch.length;
			}
			return Response.json({ upserted });
		}

		if (path === "/probe") {
			const [vector] = await embed(env, [body.text]);
			const found = await env.VECTORIZE.query(vector, { topK: 3, filter: { groupId: body.groupId }, returnMetadata: "all" });
			return Response.json(found.matches.map((m) => ({ id: m.id, score: m.score, text: m.metadata?.text })));
		}

		if (path === "/categorise") {
			return Response.json(await env.AI_WORKER.categorise(env.AI_SHARED_SECRET, body));
		}
		return new Response("Not found", { status: 404 });
	},
};

export default evalWorker;
