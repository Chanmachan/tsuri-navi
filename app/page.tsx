import { getAllSpotsWithTodayScore, getWeeklyScores } from "../src/lib/db/scores";
import { getTodayJST } from "../src/lib/utils";
import { BestTimeCard } from "./components/BestTimeCard";
import { SpotCard } from "./components/SpotCard";
import { WeeklyCalendar } from "./components/WeeklyCalendar";

export const dynamic = "force-dynamic";

export default function HomePage() {
	const today = getTodayJST();
	const spots = getAllSpotsWithTodayScore(today);

	// Pick the spot with the highest today score for the highlight section
	// Require bestHour != null so the BestTimeCard always has a time to display
	const bestSpot = spots
		.filter((s) => s.todayScore?.bestHour != null)
		.sort((a, b) => (b.todayScore?.score ?? 0) - (a.todayScore?.score ?? 0))[0];

	const weeklyScores = bestSpot ? getWeeklyScores(bestSpot.id, today, 7) : [];

	return (
		<main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
			<header>
				<h1 className="text-2xl font-bold text-sky-700">釣りナビ</h1>
				<p className="text-gray-400 text-sm">{today}</p>
			</header>

			{bestSpot ? (
				<section className="space-y-3">
					<BestTimeCard spot={bestSpot} />
					<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
						<p className="text-xs text-gray-400 mb-3">
							週間予報（{bestSpot.name}）
						</p>
						<WeeklyCalendar scores={weeklyScores} />
					</div>
				</section>
			) : (
				<div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 text-center text-gray-400 text-sm">
					スコアデータがありません。バッチを実行してください。
				</div>
			)}

			<section>
				<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
					釣り場一覧
				</h2>
				<ul className="space-y-2">
					{spots.map((spot) => (
						<SpotCard key={spot.id} spot={spot} />
					))}
				</ul>
			</section>
		</main>
	);
}
