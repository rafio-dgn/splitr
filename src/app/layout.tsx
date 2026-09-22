import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
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
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	);
}
