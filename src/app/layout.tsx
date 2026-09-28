import type { Metadata } from "next";
import { JetBrains_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// ADR-0033: Outfit for headings and the amounts people read aloud, Plus Jakarta
// Sans for everything you operate, JetBrains Mono only for machine-produced
// text (receipt lines as printed, invite links). All three are variable fonts,
// self-hosted by next/font, so there is no layout shift and no external request.
const outfit = Outfit({
	variable: "--font-outfit",
	subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
	variable: "--font-jakarta",
	subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
	variable: "--font-jetbrains",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Splitr — snap the bill",
	description:
		"Photograph a receipt, split it with your group, and settle up once. Never twice.",
};

// `LayoutProps<"/">` is a Next.js 16 generated global (see .next/types/), not the
// hand-written `{ children: React.ReactNode }` of earlier versions. It only
// resolves after a build has generated route types.
export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${outfit.variable} ${jakarta.variable} ${jetbrains.variable} h-full antialiased`}
		>
			<body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
				{children}
			</body>
		</html>
	);
}
