import Link from "next/link";

import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ButtonLink, cardClass } from "@/components/ui";

// Marketing landing page (REQ-A.3). Public — no auth, no data.
// The CTAs point at routes that do not exist yet; they are wired up in Cluster B
// when the route tree lands (REQ-B.1).

const steps = [
	{
		n: "01",
		title: "Snap the receipt",
		body: "Photograph the bill. It uploads straight from your phone — it never passes through our servers.",
	},
	{
		n: "02",
		title: "We read the lines",
		body: "A vision model itemises it: every line, every price, categorised. No typing.",
	},
	{
		n: "03",
		title: "Settle once",
		body: "The group balance updates. When someone pays up, exactly one settlement lands — never two.",
	},
];

export default function Home() {
	return (
		<div className="flex flex-1 flex-col">
			<header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 md:px-6">
				<Logo size="sm" />
				<nav className="flex items-center gap-2 text-sm">
					<Link
						href="/login"
						className="flex h-10 items-center rounded-full px-3.5 font-semibold text-muted hover:bg-surface-2 hover:text-ink"
					>
						Log in
					</Link>
					<ButtonLink href="/register" size="sm">
						Get started
					</ButtonLink>
				</nav>
			</header>

			<main className="mx-auto w-full max-w-5xl flex-1 px-4 md:px-6">
				<section className="grid items-center gap-12 py-14 md:grid-cols-[1.2fr_1fr] md:py-24">
					<div>
						<p className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-muted">
							Shared expenses, settled
						</p>
						<h1 className="max-w-2xl font-display text-[40px] leading-[1.05] font-bold tracking-tight sm:text-6xl">
							Snap the bill.
							<br />
							Split it. <span className="highlighter">Settle once.</span>
						</h1>
						<p className="mt-6 max-w-xl text-lg leading-8 text-muted">
							For housemates, group trips and the regular dinner crowd — anyone
							still keeping a running tally in a chat thread and arguing about it
							later.
						</p>
						<div className="mt-10 flex flex-wrap items-center gap-3">
							<ButtonLink href="/register" size="lg">
								Start a group
							</ButtonLink>
							<ButtonLink href="/login" size="lg" variant="ghost">
								I already have one
							</ButtonLink>
						</div>
					</div>

					{/* An illustration of the product, with made-up figures. aria-hidden:
					    it repeats nothing the copy doesn't already say. */}
					<div aria-hidden className={`flex flex-col gap-4 p-6 md:rotate-1 ${cardClass} shadow-float`}>
						<p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Flat 12b · where you stand</p>
						<p className="font-display text-4xl font-bold tracking-tight tabular-nums">
							You owe <span className="highlighter">£16.50</span>
						</p>
						<ul className="flex flex-col text-[15px]">
							{[
								["Marta", "owed £39.95", "text-primary-ink"],
								["Jonah", "owes £23.45", "text-owe"],
							].map(([who, what, tone]) => (
								<li key={who} className="flex justify-between border-t border-line py-2.5 font-semibold">
									<span>{who}</span>
									<span className={`tabular-nums ${tone}`}>{what}</span>
								</li>
							))}
						</ul>
						<p className="font-mono text-xs text-muted">Printed as &ldquo;2X PERONI 330ML  £9.80&rdquo;</p>
					</div>
				</section>

				<section className="border-t border-line py-16">
					{/* Numbered because it is a sequence: the order is the point. */}
					<ol className="grid gap-10 sm:grid-cols-3">
						{steps.map((step) => (
							<li key={step.n} className="flex flex-col gap-2">
								<span className="font-mono text-sm font-medium text-primary-ink">
									{step.n}
								</span>
								<h2 className="font-display text-xl font-semibold">{step.title}</h2>
								<p className="leading-7 text-muted">{step.body}</p>
							</li>
						))}
					</ol>
				</section>

				<section className="border-t border-line py-16">
					<div className="flex flex-col gap-4 rounded-card bg-surface-2 p-8 sm:p-12">
						<span className="grid size-11 place-items-center rounded-tile bg-surface text-primary-ink">
							<Icon name="checkCircle" />
						</span>
						<h2 className="font-display text-2xl font-bold tracking-tight">
							Two people. One payment. One entry.
						</h2>
						<p className="max-w-2xl leading-8 text-muted">
							Alice hands Bob £40. She marks it settled on her phone; he marks
							it settled on his. Most apps record both, and the books are wrong
							by £40 with no way to tell which entry is the ghost.
						</p>
						<p className="max-w-2xl leading-8 font-semibold">
							Splitr refuses the second one, and says so.
						</p>
					</div>
				</section>
			</main>

			<footer className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-10 text-sm text-muted md:px-6">
				<Logo size="sm" />
				<span>Built on Cloudflare Workers.</span>
			</footer>
		</div>
	);
}
