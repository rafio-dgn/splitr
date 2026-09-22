/**
 * `/login` — a **Server Component**, with the form as its only client leaf.
 * The mirror of `register/page.tsx`.
 */
import Link from "next/link";

import { LoginForm } from "./login-form";

export default function LoginPage() {
	return (
		<div className="flex flex-col gap-8">
			<h1 className="text-2xl font-semibold tracking-tight">Log in</h1>

			<LoginForm />

			<p className="text-sm text-zinc-500">
				No account yet?{" "}
				<Link href="/register" className="underline">
					Sign up
				</Link>
			</p>
		</div>
	);
}
