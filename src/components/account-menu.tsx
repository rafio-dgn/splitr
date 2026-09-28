"use client";

/**
 * The account menu in the top bar: who you are, and Sign out.
 *
 * Still a native `<details>`, so it opens with no JavaScript. This component
 * only adds what `<details>` lacks: it closes on a tap or click outside, on
 * Esc (returning focus to its button), and when you navigate away. It fetches
 * nothing; the name and email come from the server-rendered layout.
 */

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { Icon } from "./icons";
import { SignOutButton } from "./sign-out-button";
import { Avatar } from "./ui";

export function AccountMenu({ id, name, email }: { id: string; name: string; email: string }) {
	const menu = useRef<HTMLDetailsElement | null>(null);
	const path = usePathname();

	useEffect(() => {
		const onPointer = (event: PointerEvent) => {
			const el = menu.current;
			if (el?.open && event.target instanceof Node && !el.contains(event.target)) el.open = false;
		};
		const onKey = (event: KeyboardEvent) => {
			const el = menu.current;
			if (event.key === "Escape" && el?.open) {
				el.open = false;
				el.querySelector("summary")?.focus();
			}
		};
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	}, []);

	// A client-side navigation keeps the layout mounted, so close it explicitly.
	useEffect(() => {
		if (menu.current !== null) menu.current.open = false;
	}, [path]);

	return (
		<details ref={menu} className="group relative">
			<summary className="flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-full pr-2 pl-1 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
				<Avatar id={id} name={name} size="lg" />
				<Icon name="chevronDown" className="size-4 text-muted transition-transform duration-150 group-open:rotate-180" />
				<span className="sr-only">Your account</span>
			</summary>
			<div className="absolute right-0 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-float">
				<div className="min-w-0">
					<p className="truncate font-semibold">{name}</p>
					<p className="truncate text-sm text-muted">{email}</p>
				</div>
				<SignOutButton />
			</div>
		</details>
	);
}
