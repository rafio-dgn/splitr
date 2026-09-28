/**
 * `/login` — a **Server Component**, with the form as its only client leaf.
 * The mirror of `register/page.tsx`.
 */
import Link from "next/link";

import { LoginForm } from "./login-form";

export default function LoginPage() {
	return (
		<div className="flex flex-col gap-8">
			<h1 className="font-display text-3xl font-bold tracking-tight">Log in</h1>

			<LoginForm />

			<p className="text-center text-sm text-muted">
				No account yet?{" "}
				<Link href="/register" className="font-semibold text-primary-ink underline underline-offset-4">
					Sign up
				</Link>
			</p>
		</div>
	);
}
