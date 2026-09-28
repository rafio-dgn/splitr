"use client";

/**
 * Toasts: short confirmations that leave on their own (ADR-0033 §toasts).
 *
 * **What is a toast, and what isn't.** A toast confirms something that already
 * happened: "Expense added", "Group created", "You're in". It never carries an
 * error you must act on (those stay inline, next to the field or section), and
 * never a settle-up outcome: `screens-cluster-b.md` §6 wants those in place,
 * and a toast that vanished after four seconds would hide the "Already
 * settled" proof.
 *
 * **Where they come from.** Either the server (`initial`, read from the flash
 * cookie by the `(app)` layout, see `lib/flash.ts`), or a `<ToastOnMount>` a
 * Server Component renders for a state it already knows (`?joined=1`). Neither
 * path fetches anything.
 *
 * Behaviour from the ui-ux-pro-max guidance: 4 seconds on screen, the timer
 * pauses while the pointer or focus is on the toast, at most three at once,
 * Esc dismisses the newest, and the region is a polite live region.
 */

import { useEffect, useRef, useState } from "react";

import { Icon } from "./icons";

export interface ToastMessage {
	readonly id: string;
	readonly title: string;
	readonly detail?: string;
}

const DURATION_MS = 4000;
const MAX_TOASTS = 3;

/* A tiny module-level queue, so a <ToastOnMount> whose effect runs before the
   Toaster has subscribed isn't lost. */
type Listener = (toast: ToastMessage) => void;
let listener: Listener | null = null;
const pending: ToastMessage[] = [];

function emit(toast: ToastMessage): void {
	if (listener !== null) listener(toast);
	else pending.push(toast);
}

/** Shows a toast once, when rendered. For confirmations the server already knows about. */
export function ToastOnMount({ id, title, detail }: ToastMessage) {
	useEffect(() => {
		emit({ id, title, detail });
	}, [id, title, detail]);
	return null;
}

export function Toaster({ initial }: { initial: ToastMessage | null }) {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);
	// Ids already shown: React's dev double-effect, and a re-render with the same
	// flash still in the props, must not show it twice.
	const seen = useRef(new Set<string>());

	useEffect(() => {
		const add: Listener = (toast) => {
			if (seen.current.has(toast.id)) return;
			seen.current.add(toast.id);
			setToasts((current) => [...current, toast].slice(-MAX_TOASTS));
		};
		listener = add;
		pending.splice(0).forEach(add);
		return () => {
			listener = null;
		};
	}, []);

	useEffect(() => {
		if (initial === null) return;
		emit(initial);
		// The server can't delete a cookie mid-render (lib/flash.ts), so it's
		// cleared here, once shown.
		document.cookie = "splitr_flash=; Max-Age=0; path=/; SameSite=Lax";
	}, [initial]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setToasts((current) => current.slice(0, -1));
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const dismiss = (id: string) => setToasts((current) => current.filter((t) => t.id !== id));

	return (
		<div
			role="status"
			aria-live="polite"
			className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2.5 md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
		>
			{toasts.map((toast) => (
				<ToastCard key={toast.id} toast={toast} onDone={() => dismiss(toast.id)} />
			))}
		</div>
	);
}

function ToastCard({ toast, onDone }: { toast: ToastMessage; onDone: () => void }) {
	const [paused, setPaused] = useState(false);
	const [leaving, setLeaving] = useState(false);
	const remaining = useRef(DURATION_MS);
	const startedAt = useRef(0);

	useEffect(() => {
		if (paused || leaving) return;
		startedAt.current = Date.now();
		const timer = window.setTimeout(() => setLeaving(true), remaining.current);
		return () => {
			window.clearTimeout(timer);
			remaining.current -= Date.now() - startedAt.current;
		};
	}, [paused, leaving]);

	useEffect(() => {
		if (!leaving) return;
		const timer = window.setTimeout(onDone, 160);
		return () => window.clearTimeout(timer);
	}, [leaving, onDone]);

	return (
		<div
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onBlur={() => setPaused(false)}
			className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-[14px] bg-ink py-3.5 pr-3.5 pl-4 text-[15px] text-canvas shadow-float ${leaving ? "animate-toast-out" : "animate-toast-in"}`}
		>
			<Icon name="checkCircle" className="mt-0.5 size-5 text-highlight" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<p className="font-bold">{toast.title}</p>
				{toast.detail !== undefined ? <p className="text-sm opacity-80">{toast.detail}</p> : null}
			</div>
			<button
				type="button"
				aria-label="Dismiss"
				onClick={() => setLeaving(true)}
				className="-mt-1.5 -mr-1.5 grid size-8 cursor-pointer place-items-center rounded-lg opacity-70 hover:bg-canvas/15 hover:opacity-100"
			>
				<Icon name="x" className="size-4" />
			</button>
			<span
				aria-hidden
				style={{ animationDuration: `${DURATION_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
				className="absolute inset-x-0 bottom-0 h-[3px] origin-left animate-toast-timer bg-highlight motion-reduce:hidden"
			/>
		</div>
	);
}
