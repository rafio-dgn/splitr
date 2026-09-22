import Link from "next/link";

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
		<div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
			<header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
				<span className="text-lg font-semibold tracking-tight">Splitr</span>
				<nav className="flex items-center gap-6 text-sm">
					<Link
						href="/login"
						className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
					>
						Log in
					</Link>
					<Link
						href="/register"
						className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
					>
						Get started
					</Link>
				</nav>
			</header>

			<main className="mx-auto w-full max-w-5xl flex-1 px-6">
				<section className="py-20 sm:py-28">
					<p className="mb-4 text-sm font-medium uppercase tracking-widest text-zinc-500">
						Shared expenses, settled
					</p>
					<h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
						Snap the bill.
						<br />
						Split it. Settle once.
					</h1>
					<p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
						For housemates, group trips and the regular dinner crowd — anyone
						still keeping a running tally in a chat thread and arguing about it
						later.
					</p>
					<div className="mt-10 flex flex-wrap items-center gap-4">
						<Link
							href="/register"
							className="rounded-full bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
						>
							Start a group
						</Link>
						<Link
							href="/login"
							className="rounded-full border border-zinc-300 px-6 py-3 font-medium hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
						>
							I already have one
						</Link>
					</div>
				</section>

				<section className="border-t border-zinc-200 py-16 dark:border-zinc-800">
					<div className="grid gap-10 sm:grid-cols-3">
						{steps.map((step) => (
							<div key={step.n}>
								<span className="font-mono text-sm text-zinc-400">
									{step.n}
								</span>
								<h2 className="mt-2 text-lg font-semibold">{step.title}</h2>
								<p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">
									{step.body}
								</p>
							</div>
						))}
					</div>
				</section>

				<section className="border-t border-zinc-200 py-16 dark:border-zinc-800">
					<div className="rounded-2xl bg-zinc-50 p-8 dark:bg-zinc-900 sm:p-12">
						<h2 className="text-2xl font-semibold tracking-tight">
							Two people. One payment. One entry.
						</h2>
						<p className="mt-4 max-w-2xl leading-8 text-zinc-600 dark:text-zinc-400">
							Alice hands Bob £40. She marks it settled on her phone; he marks
							it settled on his. Most apps record both, and the books are wrong
							by £40 with no way to tell which entry is the ghost.
						</p>
						<p className="mt-4 max-w-2xl leading-8 text-zinc-600 dark:text-zinc-400">
							Splitr refuses the second one, and says so.
						</p>
					</div>
				</section>
			</main>

			<footer className="mx-auto w-full max-w-5xl px-6 py-10 text-sm text-zinc-500">
				Splitr — built on Cloudflare Workers.
			</footer>
		</div>
	);
}
