/**
 * The Splitr mark and wordmark (ADR-0033).
 *
 * The mark is one receipt torn down the middle, the right half dropped a step:
 * "split" at 16px, a bill at 512px. The yellow block is the line that's yours.
 * The same drawing is `app/icon.svg`; keep the two in step.
 *
 * The mark's colours are fixed brand values, not theme tokens: a logo looks the
 * same on every background. The wordmark takes `currentColor`.
 */

export function LogoMark({ className = "size-8" }: { className?: string }) {
	return (
		<svg aria-hidden viewBox="0 0 48 48" className={`shrink-0 ${className}`}>
			<rect width="48" height="48" rx="13" fill="#0E6B4C" />
			<polygon
				points="12,9 22.5,9 22.5,35 19.9,37.6 17.3,35 14.6,37.6 12,35"
				fill="#FFFFFF"
			/>
			<polygon
				points="25.5,13 36,13 36,39 33.4,41.6 30.8,39 28.1,41.6 25.5,39"
				fill="#FFFFFF"
			/>
			<rect x="15" y="15" width="5" height="2.4" rx="1.2" fill="#0E6B4C" opacity=".55" />
			<rect x="15" y="20.5" width="5" height="2.4" rx="1.2" fill="#0E6B4C" opacity=".55" />
			<rect x="28.5" y="19" width="5" height="2.4" rx="1.2" fill="#0E6B4C" opacity=".55" />
			<rect x="27.5" y="25" width="7" height="5" rx="1.5" fill="#F5C542" />
		</svg>
	);
}

/** Mark plus lowercase wordmark, with the highlighter under the final "r". */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
	const mark = { sm: "size-7", md: "size-8", lg: "size-11" }[size];
	const text = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" }[size];
	return (
		<span className="inline-flex items-center gap-2.5">
			<LogoMark className={mark} />
			<span
				aria-hidden
				className={`font-display font-bold leading-none tracking-[-0.035em] ${text}`}
			>
				split<span className="highlighter">r</span>
			</span>
			<span className="sr-only">Splitr</span>
		</span>
	);
}
