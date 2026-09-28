/**
 * Splitr's icon set: a few inline SVGs in one stroke style (24px grid, 1.8px
 * stroke, round caps), instead of an icon package (ADR-0033 §icons). Twenty
 * icons don't justify a dependency, and inline SVG inherits `currentColor`, so
 * every icon follows the theme with no extra work.
 *
 * Decorative by default (`aria-hidden`): an icon next to a visible label adds
 * nothing for a screen reader. An icon-only control must carry its own
 * `aria-label` on the button, not on the icon.
 *
 * Server-safe: no `"use client"`, no hooks.
 */

const PATHS = {
	users: (
		<>
			<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
		</>
	),
	search: (
		<>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
		</>
	),
	plus: <path d="M12 5v14M5 12h14" />,
	check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
	checkCircle: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="m8 12.5 2.8 2.8L16.5 9.5" />
		</>
	),
	x: <path d="M6 6l12 12M18 6 6 18" />,
	alert: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7.5v5.5M12 16.5v.01" />
		</>
	),
	info: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 11v5.5M12 7.5v.01" />
		</>
	),
	bell: (
		<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
	),
	receipt: (
		<>
			<path d="M5 3h14v18l-2.3-1.5L14.3 21 12 19.5 9.7 21l-2.4-1.5L5 21z" />
			<path d="M9 8h6M9 12h6" />
		</>
	),
	pen: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4" />,
	camera: (
		<>
			<path d="M4 8h3l2-3h6l2 3h3v11H4z" />
			<circle cx="12" cy="13" r="3.5" />
		</>
	),
	link: (
		<>
			<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
			<path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
		</>
	),
	arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
	arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
	swap: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
	sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
	logOut: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />,
	chevronDown: <path d="m6 9 6 6 6-6" />,
	upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
	eye: (
		<>
			<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
			<circle cx="12" cy="12" r="3" />
		</>
	),
	eyeOff: (
		<>
			<path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.6M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
			<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
		</>
	),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
	name,
	className = "size-5",
}: {
	name: IconName;
	className?: string;
}) {
	return (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={`shrink-0 ${className}`}
		>
			{PATHS[name]}
		</svg>
	);
}
