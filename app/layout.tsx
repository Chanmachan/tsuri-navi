import type { Metadata, Viewport } from "next";
import Link from "next/link";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ja">
			<body className="bg-gray-50 text-gray-900 min-h-screen pb-16">
				{children}

				{/* Bottom navigation */}
				<nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-50">
					<Link
						href="/"
						className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 hover:text-sky-600 transition-colors"
					>
						<span className="text-xl">🏠</span>
						<span className="text-[10px]">ホーム</span>
					</Link>
					<Link
						href="/map"
						className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 hover:text-sky-600 transition-colors"
					>
						<span className="text-xl">🗺️</span>
						<span className="text-[10px]">マップ</span>
					</Link>
					<Link
						href="/search"
						className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 hover:text-sky-600 transition-colors"
					>
						<span className="text-xl">🔍</span>
						<span className="text-[10px]">検索</span>
					</Link>
					<Link
						href="/settings"
						className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 hover:text-sky-600 transition-colors"
					>
						<span className="text-xl">⚙️</span>
						<span className="text-[10px]">設定</span>
					</Link>
				</nav>
			</body>
		</html>
	);
}
