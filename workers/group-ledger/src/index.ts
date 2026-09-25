/**
 * `splitr-ledger`: the Worker that arbitrates Splitr's contested write
 * (REQ-E.1, ADR-0023).
 *
 * - `GroupLedger` is one Durable Object per group (`idFromName(groupId)`). It
 *   **arbitrates**: it holds no balance, reads the balances fresh from D1,
 *   runs the same tested rule as everywhere else (`checkSettlement`), writes
 *   the settlement to D1 and returns its decision.
 * - `LedgerService` is the RPC entrypoint the app reaches through a **service
 *   binding** (REQ-E.5). There's no public URL (`workers_dev: false`).
 */
import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "../../../src/db/schema";
import { audit } from "../../../src/lib/audit";
import { loadBalanceInputs } from "../../../src/lib/expenses/balance-inputs";
import { deriveBalances } from "../../../src/lib/expenses/balances";
import { newId } from "../../../src/lib/ids";
import type { LedgerDecision, SettleRequest, SettleResponse } from "../../../src/lib/settlements/ledger-contract";
import { checkSettlement } from "../../../src/lib/settlements/rules";

/**
 * The ledger's bindings, declared here rather than taken from the generated
 * global `Env`, because the app's program also reads this file (to type its
 * service binding) and has no such global. `env-check.ts` proves, in this
 * Worker's own program, that Wrangler's generated `Env` still satisfies it.
 */
export interface LedgerEnv {
	readonly DB: D1Database;
	readonly GROUP_LEDGER: DurableObjectNamespace<GroupLedger>;
}

/**
 * REQ-E.2: a replay within 24 hours returns the cached response. Deliberately
 * NOT exported: a Worker's main module may export only handlers and classes,
 * and workerd refuses to start otherwise (measured, and invisible to tsc).
 */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedResponse {
	readonly decision: LedgerDecision;
	readonly body: string;
	readonly expiresAt: number;
}

const idemKey = (key: string): string => `idem:${key}`;

export class GroupLedger extends DurableObject<LedgerEnv> {
	/**
	 * Settles one payment, or refuses it.
	 *
	 * **The whole of it runs inside `blockConcurrencyWhile`.** A Durable Object
	 * handles one event at a time, *except* that awaiting outbound I/O (every D1
	 * query here) lets the next event in. Without this, two settlements could
	 * still interleave their read and their write, which is exactly the bug
	 * this object exists to prevent. With it, the second request is admitted
	 * only after the first has written, so its read sees the first's settlement.
	 */
	async settle(request: SettleRequest): Promise<SettleResponse> {
		return this.ctx.blockConcurrencyWhile(async () => {
			// Idempotency, checked INSIDE the critical section, so two
			// simultaneous requests with one key can't both miss the cache.
			if (request.idempotencyKey !== null) {
				const cached = await this.ctx.storage.get<CachedResponse>(idemKey(request.idempotencyKey));
				if (cached !== undefined && cached.expiresAt > Date.now()) {
					audit({ actor: request.recordedBy, action: "settlement.record", target: request.groupId, outcome: "replayed", persisted: false });
					return { decision: cached.decision, body: cached.body, replayed: true };
				}
			}

			const db = drizzle(this.env.DB, { schema });
			const inputs = await loadBalanceInputs(db, request.groupId);
			const net = new Map(deriveBalances(inputs.members, inputs.expenses, inputs.settlements).map((b) => [b.userId, b.netMinorUnits]));
			const nameOf = (id: string): string => inputs.members.find((m) => m.id === id)?.name ?? "Someone";
			const verdict = checkSettlement((id) => net.get(id) ?? 0, {
				fromUserId: request.fromUserId,
				toUserId: request.toUserId,
				amountMinorUnits: request.amountMinorUnits,
			});

			let decision: LedgerDecision;
			if (verdict.ok) {
				const settlementId = newId("stl");
				await db.insert(schema.settlement).values({
					id: settlementId,
					groupId: request.groupId,
					fromUser: request.fromUserId,
					toUser: request.toUserId,
					amountCents: request.amountMinorUnits,
					currency: request.currency,
					recordedBy: request.recordedBy,
				});
				// REQ-E.3: after D1 has confirmed the write.
				audit({
					actor: request.recordedBy,
					action: "settlement.record",
					target: settlementId,
					outcome: "accepted",
					persisted: true,
					detail: { group: request.groupId, from: request.fromUserId, to: request.toUserId, amountMinorUnits: request.amountMinorUnits, arbiter: "GroupLedger" },
				});
				decision = {
					status: "settled",
					settlementId,
					amountMinorUnits: request.amountMinorUnits,
					payerName: nameOf(request.fromUserId),
					payerNowOwes: -(net.get(request.fromUserId) ?? 0) - request.amountMinorUnits,
				};
			} else {
				audit({ actor: request.recordedBy, action: "settlement.record", target: request.groupId, outcome: `refused:${verdict.reason}`, persisted: false, detail: { arbiter: "GroupLedger" } });
				if (verdict.reason === "payer-not-owing") {
					const last = inputs.settlements.find((s) => s.fromUserId === request.fromUserId);
					decision = {
						status: "already-settled",
						payerName: nameOf(request.fromUserId),
						lastPayment:
							last === undefined
								? null
								: { recordedByName: last.recordedByName, toName: last.toName, amountMinorUnits: last.amountMinorUnits, createdAt: last.createdAt },
					};
				} else if (verdict.reason === "exceeds") {
					decision = { status: "exceeds", maxMinorUnits: verdict.maxMinorUnits, payerName: nameOf(request.fromUserId), toName: nameOf(request.toUserId) };
				} else {
					// "same-person" is refused by the app before it gets here; if it ever
					// arrives, "not owed" is the honest description of it.
					decision = { status: "recipient-not-owed", toName: nameOf(request.toUserId) };
				}
			}

			const body = JSON.stringify(decision);
			if (request.idempotencyKey !== null) {
				const expiresAt = Date.now() + IDEMPOTENCY_TTL_MS;
				await this.ctx.storage.put<CachedResponse>(idemKey(request.idempotencyKey), { decision, body, expiresAt });
				// REQ-E.2's cleanup: an alarm at the earliest expiry.
				const alarm = await this.ctx.storage.getAlarm();
				if (alarm === null || alarm > expiresAt) {
					await this.ctx.storage.setAlarm(expiresAt);
				}
			}
			return { decision, body, replayed: false };
		});
	}

	/** Evicts expired idempotency entries, then re-arms for the next one to expire (REQ-E.2). */
	async alarm(): Promise<void> {
		const now = Date.now();
		const entries = await this.ctx.storage.list<CachedResponse>({ prefix: "idem:" });
		let evicted = 0;
		let next = Number.POSITIVE_INFINITY;
		for (const [key, value] of entries) {
			if (value.expiresAt <= now) {
				await this.ctx.storage.delete(key);
				evicted += 1;
			} else {
				next = Math.min(next, value.expiresAt);
			}
		}
		if (Number.isFinite(next)) {
			await this.ctx.storage.setAlarm(next);
		}
		console.log(`[ledger] alarm evicted=${evicted} remaining=${entries.size - evicted}`);
	}
}

/** The RPC surface the app reaches through its service binding. */
export class LedgerService extends WorkerEntrypoint<LedgerEnv> {
	async settle(request: SettleRequest): Promise<SettleResponse> {
		// REQ-E.1: one instance per owning entity. The entity fought over is the group.
		const id = this.env.GROUP_LEDGER.idFromName(request.groupId);
		return this.env.GROUP_LEDGER.get(id).settle(request);
	}
}

/** No public HTTP surface: `workers_dev` is false, and anything that arrives here is refused. */
export default {
	async fetch(): Promise<Response> {
		return new Response("Not found", { status: 404 });
	},
};
