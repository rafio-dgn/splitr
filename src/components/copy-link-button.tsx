"use client";

/**
 * "Copy link" → "Copied." (`wiki/context/screens-cluster-b.md` §4.3).
 *
 * A Client Component for two reasons, both unavoidable: `navigator.clipboard`
 * exists only in a browser, and the button owns a transient piece of state — the
 * word "Copied." — that no server render can hold.
 *
 * It is a **leaf**. The invite panel around it, the link text it copies and the
 * members list beside it are all server-rendered; only the button ships.
 */

import { useEffect, useState } from "react";

import { Icon } from "./icons";
import { buttonClass } from "./ui";

export function CopyLinkButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);

	// The confirmation is transient; without this it would sit there for ever and
	// stop meaning "just now".
	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), 2000);
		return () => window.clearTimeout(timer);
	}, [copied]);

	return (
		<button
			type="button"
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(value);
					setCopied(true);
				} catch {
					// Clipboard access can be refused (insecure origin, permissions).
					// The link is rendered as selectable text beside this button, so
					// there is always a manual path; silently doing nothing is better
					// than an error box for something the user can just select.
					setCopied(false);
				}
			}}
			className={`shrink-0 ${buttonClass({ variant: copied ? "secondary" : "primary" })}`}
		>
			<Icon name={copied ? "check" : "link"} className="size-[18px]" />
			{/* The live region announces the change; the label alone would be missed. */}
			<span aria-live="polite">{copied ? "Copied." : "Copy link"}</span>
		</button>
	);
}
