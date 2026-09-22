/**
 * `/register` — §4.1. A **Server Component**; the form below it is the only
 * client code on the route.
 *
 * The backend agent shipped this as a whole-page `"use client"` entry point and
 * said so in its own comment. Splitting it is the frontend rule from
 * `.claude/agents/frontend.md`: push `"use client"` down to the leaf that owns
 * state, never onto a page. Nothing about the Better Auth call changed —
 * `REQ-B.5` is untouched.
 */
import Link from "next/link";

import { RegisterForm } from "./register-form";

export default function RegisterPage() {
	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Create your Splitr account
				</h1>
				<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
					Free, and you can start a group in about ten seconds.
				</p>
			</div>

			<RegisterForm />

			<p className="text-sm text-zinc-500">
				Already have an account?{" "}
				<Link href="/login" className="underline">
					Log in.
				</Link>
			</p>
		</div>
	);
}
