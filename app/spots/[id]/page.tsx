import Link from "next/link";
import { notFound } from "next/navigation";
import { FishRecommendation } from "../../components/FishRecommendation";
import { HourlyScoreChart } from "../../components/HourlyScoreChart";
import { ScoreBreakdownCard } from "../../components/ScoreBreakdownCard";
import { SpotActions } from "../../components/SpotActions";
import { TideChart } from "../../components/TideChart";
import { WeatherTable } from "../../components/WeatherTable";
import { WeeklyCalendar } from "../../components/WeeklyCalendar";
import { getDailyScore, getWeeklyScores } from "../../../src/lib/db/scores";
import { getHourlyScores, getHourlyWeather, getSpotById } from "../../../src/lib/db/spot-detail";
import { getTodayJST } from "../../../src/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
	params: Promise<{ id: string }>;
}

export default async function SpotDetailPage({ params }: Props) {
	const { id } = await params;
	const spotId = Number(id);
	if (!Number.isInteger(spotId) || spotId <= 0) notFound();

	const spot = getSpotById(spotId);
	if (!spot) notFound();

	const today = getTodayJST();
	const dailyScore = getDailyScore(spotId, today);
	const hourlyScores = getHourlyScores(spotId, today);
	const weather = getHourlyWeather(spotId, today);
	const weeklyScores = getWeeklyScores(spotId, today, 7);

	const bestHour = dailyScore?.bestHour ?? null;
	const bestHourlyBreakdown =
		hourlyScores.find((s) => s.hour === bestHour)?.breakdown ?? hourlyScores[0]?.breakdown ?? null;

	const month = Number(today.slice(5, 7));

	return (
		<main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Link
					href="/"
					className="text-gray-400 hover:text-gray-600 text-sm"
					aria-label="ホームへ戻る"
				>
					← 戻る
				</Link>
				<div className="flex-1 min-w-0">
					<h1 className="text-xl font-bold truncate">{spot.name}</h1>
					<p className="text-xs text-gray-400">
						{spot.prefecture} · {spot.type} · {today}
					</p>
				</div>
			</div>

			<SpotActions
				spotId={spot.id}
				isFavorite={spot.is_favorite === 1}
				isPreset={spot.is_preset === 1}
			/>

			{dailyScore && bestHourlyBreakdown ? (
				<>
					{/* Score + breakdown */}
					<ScoreBreakdownCard
						score={dailyScore.score}
						breakdown={bestHourlyBreakdown}
						bestHour={bestHour}
					/>

					{/* Hourly score chart */}
					<section className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
						<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
							時間帯別スコア
						</p>
						<HourlyScoreChart scores={hourlyScores} bestHour={bestHour} />
					</section>
				</>
			) : (
				<div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 text-center text-gray-400 text-sm">
					スコアデータがありません。バッチを実行してください。
				</div>
			)}

			{/* Tide chart */}
			{weather.length > 0 && (
				<section className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
					<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
						タイドグラフ
					</p>
					<TideChart weather={weather} />
				</section>
			)}

			{/* Weekly calendar */}
			{weeklyScores.length > 0 && (
				<section className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
					<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
						週間予報
					</p>
					<WeeklyCalendar scores={weeklyScores} />
				</section>
			)}

			{/* Weather table */}
			{weather.length > 0 && (
				<section className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
					<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
						天気・海況
					</p>
					<WeatherTable weather={weather} />
				</section>
			)}

			{/* Fish recommendations */}
			<section className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
				<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
					今の時期に狙える魚
				</p>
				<FishRecommendation prefecture={spot.prefecture} month={month} />
			</section>
		</main>
	);
}
