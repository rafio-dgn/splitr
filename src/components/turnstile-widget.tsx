"use client";

/**
 * The Turnstile widget (REQ-F.2, ADR-0030), in Managed mode: most people see
 * nothing or a one-click checkbox, and suspicious traffic gets a challenge.
 *
 * It hands its token up through `onToken`, and `null` when the token expires or
 * errors. The token only proves anything once the Server Action has verified it
 * with Cloudflare. A token is single-use, so the parent bumps `resetKey` after
 * each attempt to get a fresh one.
 *
 * Loaded with `next/script`, whose `onReady` runs after the script loads *and*
 * on every remount (`node_modules/next/dist/docs/01-app/02-guides/scripts.md`),
 * so the widget renders whether or not the script was already on the page.
 */
import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

interface TurnstileApi {
	render(el: HTMLElement, options: {
		sitekey: string;
		callback: (token: string) => void;
		"expired-callback": () => void;
		"error-callback": () => void;
		appearance?: "always" | "execute" | "interaction-only";
	}): string;
	reset(widgetId: string): void;
	remove(widgetId: string): void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

export function TurnstileWidget({ siteKey, onToken, resetKey }: { siteKey: string; onToken: (token: string | null) => void; resetKey: number }) {
	const el = useRef<HTMLDivElement>(null);
	const widgetId = useRef<string | null>(null);
	const latestOnToken = useRef(onToken);
	useEffect(() => {
		latestOnToken.current = onToken;
	}, [onToken]);

	const render = useCallback(() => {
		if (el.current === null || window.turnstile === undefined || widgetId.current !== null) return;
		widgetId.current = window.turnstile.render(el.current, {
			sitekey: siteKey,
			callback: (token) => latestOnToken.current(token),
			"expired-callback": () => latestOnToken.current(null),
			"error-callback": () => latestOnToken.current(null),
		});
	}, [siteKey]);

	// A fresh token after each attempt: tokens are single-use.
	useEffect(() => {
		if (resetKey > 0 && widgetId.current !== null && window.turnstile !== undefined) {
			latestOnToken.current(null);
			window.turnstile.reset(widgetId.current);
		}
	}, [resetKey]);

	useEffect(
		() => () => {
			if (widgetId.current !== null && window.turnstile !== undefined) window.turnstile.remove(widgetId.current);
			widgetId.current = null;
		},
		[],
	);

	return (
		<>
			<Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} />
			<div ref={el} />
		</>
	);
}
