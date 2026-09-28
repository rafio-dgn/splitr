/**
 * Splitr's shared presentational vocabulary: the component kit of ADR-0033.
 *
 * **No `"use client"`, and no `server-only` either.** Every component here is
 * pure markup over its props, which means a Server Component page can render it
 * *and* a `"use client"` form or error boundary can import it. That is the
 * reason it is one separate module: `REQ-B.4` wants the empty state and the
 * error state to look like the same application, and they are rendered from
 * opposite sides of the boundary.
 *
 * Colours come only from the tokens in `app/globals.css`. Class strings that
 * several files need (`buttonClass`, `inputClass`) are exported as functions
 * or constants so a native `<button>` or `<input>` inside a client form can
 * wear them without a wrapper component that would have to forward refs.
 */
import Link from "next/link";

import { Icon, type IconName } from "./icons";

/* ------------------------------------------------------------------ buttons */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
	"inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-out-soft active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 aria-busy:cursor-progress";

const BUTTON_SIZE: Record<ButtonSize, string> = {
	sm: "h-9 px-3.5 text-sm",
	md: "h-11 px-5 text-[15px]",
	lg: "h-13 px-6 text-base",
};

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
	primary: "bg-primary text-on-primary shadow-rest hover:bg-primary-hover",
	secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
	ghost: "text-ink hover:bg-surface-2",
	danger: "border border-current bg-surface text-danger hover:bg-danger-soft",
};

/**
 * The one button style. Every control is at least 44px tall at `md`; `sm` (36px)
 * is for dense rows only, never the main action of a screen.
 */
export function buttonClass({
	variant = "primary",
	size = "md",
}: { variant?: ButtonVariant; size?: ButtonSize } = {}): string {
	return `${BUTTON_BASE} ${BUTTON_SIZE[size]} ${BUTTON_VARIANT[variant]}`;
}

/** A link that looks like a button. */
export function ButtonLink({
	href,
	children,
	variant = "primary",
	size = "md",
	icon,
}: {
	href: string;
	children: React.ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
	icon?: IconName;
}) {
	return (
		<Link href={href} className={buttonClass({ variant, size })}>
			{icon !== undefined ? <Icon name={icon} className="size-[18px]" /> : null}
			{children}
		</Link>
	);
}

/** The primary action style, as a link. */
export function ActionLink({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) {
	return <ButtonLink href={href}>{children}</ButtonLink>;
}

/** The secondary action style, as a link. */
export function SecondaryLink({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) {
	return (
		<ButtonLink href={href} variant="secondary">
			{children}
		</ButtonLink>
	);
}

/** A pending indicator for inside a button. The button's label says what's happening. */
export function Spinner({ className = "size-4" }: { className?: string }) {
	return (
		<span
			aria-hidden
			className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
		/>
	);
}

/* ------------------------------------------------------------------- fields */

/** Text inputs and selects: 48px tall, a 3:1 edge, and a visible focus ring. */
export const inputClass =
	"h-12 w-full min-w-0 rounded-field border border-line-strong bg-surface px-3.5 font-medium text-ink placeholder:font-normal placeholder:text-faint transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20 disabled:opacity-60";

/** A field's visible label. Placeholders are never the label. */
export const labelClass = "text-sm font-semibold";

/** Help text under a field. */
export const hintClass = "text-[13px] text-muted";

/** An inline error. `text-danger` is 6.2:1 (light) and 6.1:1 (dark). */
export const errorTextClass = "text-sm font-medium text-danger";

/* --------------------------------------------------------- surfaces & state */

/** A card: one separate object on the page. Use it by role, not everywhere. */
export const cardClass = "rounded-card border border-line bg-surface shadow-rest";

/** A section heading inside a screen: small caps, muted. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
			{children}
		</h2>
	);
}

/** A grey bar standing in for content that has not arrived. `loading.tsx` only. */
export function Skeleton({ className = "" }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={`animate-shimmer rounded-lg bg-[linear-gradient(90deg,var(--surface-2),var(--surface-3),var(--surface-2))] bg-size-[200%_100%] ${className}`}
		/>
	);
}

type BannerTone = "neutral" | "success" | "reminder" | "danger";

const BANNER_TONE: Record<BannerTone, { box: string; icon: string; glyph: IconName }> = {
	neutral: { box: "border-line bg-surface-2", icon: "text-muted", glyph: "info" },
	success: { box: "border-primary/30 bg-primary-soft", icon: "text-primary-ink", glyph: "checkCircle" },
	reminder: { box: "border-owe/30 bg-owe-soft", icon: "text-owe", glyph: "bell" },
	danger: { box: "border-danger/35 bg-danger-soft", icon: "text-danger", glyph: "alert" },
};

/**
 * An inline, persistent message: an outcome that must stay on screen (a
 * settle-up result, §6), a reminder, or a failure. Transient confirmations are
 * toasts instead (`toaster.tsx`).
 *
 * `danger` is only for something that failed. "Already settled" is `neutral`
 * (§6: it is not an error), and a reminder about money owed is `reminder`.
 */
export function Banner({
	tone = "neutral",
	title,
	children,
	action,
	icon,
	role,
	id,
}: {
	tone?: BannerTone;
	title?: string;
	children?: React.ReactNode;
	action?: React.ReactNode;
	icon?: IconName;
	role?: "status" | "alert";
	id?: string;
}) {
	const style = BANNER_TONE[tone];
	return (
		<div
			id={id}
			role={role}
			className={`flex items-start gap-3 rounded-tile border px-4 py-3.5 text-[15px] ${style.box}`}
		>
			<Icon name={icon ?? style.glyph} className={`mt-0.5 size-5 ${style.icon}`} />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{title !== undefined ? <p className="font-bold">{title}</p> : null}
				{children !== undefined ? <div className="leading-6">{children}</div> : null}
			</div>
			{action !== undefined ? <div className="shrink-0 self-center">{action}</div> : null}
		</div>
	);
}

/**
 * An empty state: a heading, an explanation, and usually a way out of it.
 *
 * Every empty state in `wiki/context/screens-cluster-b.md` §5 has all three,
 * which is what separates an empty state from a blank area.
 */
export function EmptyState({
	title,
	children,
	action,
	icon = "receipt",
}: {
	title: string;
	children?: React.ReactNode;
	action?: React.ReactNode;
	icon?: IconName;
}) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-card border-[1.5px] border-dashed border-line-strong bg-surface px-6 py-10 text-center">
			<span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-primary-ink">
				<Icon name={icon} className="size-7" />
			</span>
			<h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
			{children !== undefined ? (
				<div className="max-w-md text-[15px] leading-6 text-muted">{children}</div>
			) : null}
			{action !== undefined ? (
				<div className="mt-3 flex flex-wrap items-center justify-center gap-3">
					{action}
				</div>
			) : null}
		</div>
	);
}

/**
 * The shared shell for an `error.tsx`.
 *
 * `retry` is passed in rather than taken from context because this module has no
 * `"use client"` of its own — the boundary that owns the retry closure is the
 * client file above it.
 *
 * Note there is no red, no warning triangle and no "Something went wrong".
 * §5.5 is emphatic: Splitr's balance is derived, so a failure to derive it is a
 * display failure, and telling someone their money records might be gone is the
 * most damaging thing this app could say.
 */
export function ErrorState({
	title,
	children,
	onRetry,
	retryLabel = "Try again",
}: {
	title: string;
	children: React.ReactNode;
	onRetry: () => void;
	retryLabel?: string;
}) {
	return (
		<div
			role="alert"
			className="flex items-start gap-3 rounded-card border border-line bg-surface-2 px-5 py-6"
		>
			<Icon name="info" className="mt-0.5 size-5 text-muted" />
			<div className="flex flex-col gap-2">
				<h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
				<div className="max-w-md text-[15px] leading-6 text-muted">{children}</div>
				<button
					type="button"
					onClick={onRetry}
					className={`mt-2 self-start ${buttonClass({ variant: "secondary", size: "sm" })}`}
				>
					{retryLabel}
				</button>
			</div>
		</div>
	);
}

/** A page heading with the group name above it (§2: never a form floating in space). */
export function ScreenHeading({
	eyebrow,
	title,
	children,
}: {
	eyebrow?: string;
	title: string;
	children?: React.ReactNode;
}) {
	return (
		<div>
			{eyebrow !== undefined ? (
				<p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
					{eyebrow}
				</p>
			) : null}
			<h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight">
				{title}
			</h1>
			{children !== undefined ? (
				<div className="mt-2 text-muted">{children}</div>
			) : null}
		</div>
	);
}

/* ------------------------------------------------------- people and money */

const AVATAR_FILLS = [
	"bg-avatar-1",
	"bg-avatar-2",
	"bg-avatar-3",
	"bg-avatar-4",
	"bg-avatar-5",
] as const;

/** The same person gets the same colour on every screen: it's derived from their id. */
function avatarFill(id: string): string {
	let hash = 0;
	for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return AVATAR_FILLS[hash % AVATAR_FILLS.length] ?? AVATAR_FILLS[0];
}

/** An initial in a circle. Decorative: the name is always written next to it. */
export function Avatar({
	id,
	name,
	size = "md",
}: {
	id: string;
	name: string;
	size?: "sm" | "md" | "lg";
}) {
	const box = { sm: "size-7 text-[11px]", md: "size-8 text-xs", lg: "size-9 text-sm" }[size];
	return (
		<span
			aria-hidden
			className={`grid shrink-0 place-items-center rounded-full border-2 border-surface font-bold text-avatar-ink ${avatarFill(id)} ${box}`}
		>
			{name.trim().charAt(0).toUpperCase() || "?"}
		</span>
	);
}

/** Overlapping avatars for a group's members. Shows the first five, then "+n". */
export function AvatarStack({
	people,
	size = "md",
}: {
	people: readonly { id: string; name: string }[];
	size?: "sm" | "md";
}) {
	const shown = people.slice(0, 5);
	const rest = people.length - shown.length;
	return (
		<span className="flex items-center" aria-label={`${people.length} ${people.length === 1 ? "member" : "members"}`}>
			{shown.map((person, index) => (
				<span key={person.id} className={index > 0 ? "-ml-2" : undefined}>
					<Avatar id={person.id} name={person.name} size={size} />
				</span>
			))}
			{rest > 0 ? (
				<span className="-ml-2 grid size-8 place-items-center rounded-full border-2 border-surface bg-surface-2 text-xs font-bold text-muted">
					+{rest}
				</span>
			) : null}
		</span>
	);
}

/**
 * The owed / owe / square pill. The words carry the meaning and the colour only
 * decorates them (§3): a colour-blind reader loses nothing.
 */
export function PositionBadge({
	netMinorUnits,
	children,
}: {
	netMinorUnits: number;
	children: React.ReactNode;
}) {
	const tone =
		netMinorUnits > 0
			? "bg-primary-soft text-primary-ink"
			: netMinorUnits < 0
				? "bg-owe-soft text-owe"
				: "bg-surface-2 text-muted";
	return (
		<span
			className={`inline-flex h-6.5 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-bold ${tone}`}
		>
			<span aria-hidden className="size-1.5 rounded-full bg-current" />
			{children}
		</span>
	);
}

/** Text colour for an amount, by sign. Decoration on top of words (§3). */
export function positionTextClass(netMinorUnits: number): string {
	if (netMinorUnits > 0) return "text-primary-ink";
	if (netMinorUnits < 0) return "text-owe";
	return "text-muted";
}
