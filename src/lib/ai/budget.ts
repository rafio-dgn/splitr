/**
 * A time budget around a promise (ADR-0025 §4: a budget per call, no retries).
 * The losing promise isn't cancelled, just ignored. Pure, so `node --test`
 * covers it, and shared by the app (the 3 s search and the 30 s receipt read)
 * and the AI Worker (the 5 s index).
 */
export type Budgeted<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: "timeout" };

export async function withBudget<T>(work: Promise<T>, ms: number): Promise<Budgeted<T>> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<Budgeted<T>>((resolve) => {
		timer = setTimeout(() => resolve({ ok: false, reason: "timeout" }), ms);
	});
	try {
		return await Promise.race([work.then((value): Budgeted<T> => ({ ok: true, value })), timeout]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}
