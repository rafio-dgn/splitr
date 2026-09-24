/**
 * The group's balances, for the current request: the one place that combines
 * members, expenses and settlements (ADR-0018's formula).
 *
 * Three pages used to call `deriveBalances(members, expenses)` themselves. With
 * settlements the formula has three inputs, and a page that forgot one would
 * show a wrong balance while looking perfectly healthy. So they all call this.
 */
import "server-only";

import { cache } from "react";

import type { Group } from "@/lib/groups/membership";

import { deriveBalances, type MemberBalance } from "./balances";
import { listGroupExpenses, listGroupSettlements } from "./expense-feed";

export const getGroupBalances = cache(
	async (group: Group): Promise<readonly MemberBalance[]> => {
		const [expenses, settlements] = await Promise.all([
			listGroupExpenses(group.id),
			listGroupSettlements(group.id),
		]);
		return deriveBalances(group.members, expenses, settlements);
	},
);
