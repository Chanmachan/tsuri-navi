import MapPageClient from "../components/MapPageClient";
import { getAllSpots } from "../../src/lib/db/spots-crud";

export const dynamic = "force-dynamic";

export default function MapPage() {
	const spots = getAllSpots();
	return (
		<main className="flex flex-col h-dvh">
			<header className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
				<h1 className="text-lg font-bold text-sky-700">釣り場マップ</h1>
				<p className="text-xs text-gray-400">{spots.length} 件のスポット</p>
			</header>
			<div className="flex-1 min-h-0">
				<MapPageClient spots={spots} />
			</div>
		</main>
	);
}
