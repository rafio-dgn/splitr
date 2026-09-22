/**
 * Money formatting — **the edge, and only the edge**.
 *
 * `wiki/context/screens-cluster-b.md` §3 is binding: integer minor units
 * underneath, never a float; always a currency symbol; always two decimals;
 * direction expressed in words, never a minus sign.
 *
 * This module imports nothing. It is safe on both sides of the boundary, which
 * matters because the add-expense form renders the live per-person figure in the
 * browser while the group dashboard renders balances on the server — and they
 * must agree to the penny.
 */

/** Splitr is single-currency for now (§3). The field exists so adding more is a migration. */
export type Currency = "GBP";

const GBP = new Intl.NumberFormat("en-GB", {
	style: "currency",
	currency: "GBP",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

/**
 * `4250` → `"£42.50"`, `0` → `"£0.00"`, `120400` → `"£1,204.00"`.
 *
 * The input is integer minor units. Dividing by 100 here is the *only* place
 * that division is allowed to happen, and the result goes straight into a
 * formatter rather than into another calculation.
 */
export function formatGbp(minorUnits: number): string {
	return GBP.format(minorUnits / 100);
}

/**
 * A net position rendered as a sentence, per §3: "Direction is words, not a
 * minus sign", and "Zero has its own sentence".
 *
 * @param netMinorUnits Positive when the group owes this person.
 */
export function describePosition(netMinorUnits: number): {
	tone: "owed" | "owes" | "square";
	sentence: string;
} {
	if (netMinorUnits > 0) {
		return { tone: "owed", sentence: `You're owed ${formatGbp(netMinorUnits)}` };
	}
	if (netMinorUnits < 0) {
		return { tone: "owes", sentence: `You owe ${formatGbp(-netMinorUnits)}` };
	}
	return { tone: "square", sentence: "You're square." };
}
