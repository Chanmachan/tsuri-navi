import dynImport from "next/dynamic";
import { getAllSpots } from "../../src/lib/db/spots-crud";

export const dynamic = "force-dynamic";

// Load SpotMap with SSR disabled — Leaflet requires the DOM
const SpotMap = dynImport(() => import("../components/SpotMap").then((m) => m.SpotMap), {
	ssr: false,
	loading: () => (
		<div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
			地図を読み込み中…
		</div>
	),
});

export default function MapPage() {
	const spots = getAllSpots();
	return (
		<main className="flex flex-col h-dvh">
			<header className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
				<h1 className="text-lg font-bold text-sky-700">釣り場マップ</h1>
				<p className="text-xs text-gray-400">{spots.length} 件のスポット</p>
			</header>
			<div className="flex-1 min-h-0">
				<SpotMap spots={spots} />
			</div>
		</main>
	);
}
