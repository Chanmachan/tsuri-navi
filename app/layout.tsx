import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "釣りナビ - 海釣り条件ナビゲーター",
	description:
		"天気・潮汐・波・風などの海況データを総合判断し、いつ・どこで・何を狙うかを結論ファーストで提示する海釣りナビアプリ",
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "釣りナビ",
	},
};

export const viewport: Viewport = {
	themeColor: "#0369a1",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="ja">
			<body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
		</html>
	);
}
