"use client";

/**
 * A **section-scoped** error boundary — the one `wiki/context/screens-cluster-b.md`
 * §5.6 asks for: "Scoped to the feed, with the balance above it still on screen."
 *
 * Why it exists when `error.tsx` already does: `error.tsx` replaces the whole
 * route segment. If the expense feed fails, a route-level boundary would take
 * the balance down with it — and the balance is what the user came for.
 *
 * **Why it is a Client Component:** React has no hook form of an error boundary.
 * `getDerivedStateFromError` is a class lifecycle and only runs in the browser.
 * There is no way to write this on the server.
 *
 * It is also the clearest example on the project of the rule in
 * `.claude/agents/frontend.md`: **its `children` stay Server Components.** The
 * expense feed it wraps renders on the server and streams in; only this shell
 * ships to the browser.
 *
 * Note the props are `title` and `description` **strings**, not a render
 * function. Functions do not cross the server/client boundary — a Server
 * Component cannot hand a callback to a Client Component, so the fallback is
 * built here from serializable props.
 */

import { Component, type ReactNode } from "react";

import { ErrorState } from "./ui";

interface Props {
	title: string;
	description: string;
	children: ReactNode;
}

interface State {
	hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
	override state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	private readonly retry = (): void => {
		this.setState({ hasError: false });
	};

	override render(): ReactNode {
		if (this.state.hasError) {
			return (
				<ErrorState title={this.props.title} onRetry={this.retry}>
					{this.props.description}
				</ErrorState>
			);
		}
		return this.props.children;
	}
}
