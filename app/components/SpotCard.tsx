import Link from "next/link";
import { ScoreLabel } from "./ScoreLabel";
import type { SpotWithScore } from "../../src/lib/db/scores";

interface Props {
	spot: SpotWithScore;
}

export function SpotCard({ spot }: Props) {
	const { todayScore } = spot;

	return (
		<li>
			<Link
				href={`/spots/${spot.id}`}
				className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center gap-3 hover:border-sky-300 transition-colors"
			>
				<ScoreLabel label={todayScore?.label} size="md" />

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="font-semibold truncate">{spot.name}</span>
						{spot.is_favorite === 1 && <span className="text-yellow-400 text-sm">★</span>}
					</div>
					<div className="flex items-center gap-2 mt-0.5">
						<span className="text-xs text-gray-400">{spot.prefecture}</span>
						<span className="text-xs bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-full">
							{spot.type}
						</span>
						{todayScore?.bestHour != null && (
							<span className="text-xs text-gray-500">ベスト {todayScore.bestHour}:00</span>
						)}
					</div>
				</div>

				{todayScore ? (
					<span className="text-sm font-medium text-gray-600 tabular-nums">
						{todayScore.score}点
					</span>
				) : (
					<span className="text-xs text-gray-300">データなし</span>
				)}
			</Link>
		</li>
	);
}
