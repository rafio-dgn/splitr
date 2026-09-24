// D.6 spike worker (ADR-0021). POST { model, prompt, image: "data:image/…;base64,…" }
// and it returns { response, usage, ms } or { error, ms }. Dev-only; see wrangler.jsonc.
const spikeWorker = {
	async fetch(request, env) {
		if (request.method !== "POST") return new Response("POST only", { status: 405 });
		const { model, prompt, image } = await request.json();
		const started = Date.now();
		try {
			const result = await env.AI.run(model, {
				messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image } }] }],
				max_tokens: 1024,
				temperature: 0,
			});
			return Response.json({ response: result.response, usage: result.usage ?? null, ms: Date.now() - started });
		} catch (error) {
			return Response.json({ error: String(error).slice(0, 400), ms: Date.now() - started });
		}
	},
};

export default spikeWorker;
