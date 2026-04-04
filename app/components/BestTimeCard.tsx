import { ScoreLabel } from "./ScoreLabel";
import type { SpotWithScore } from "../../src/lib/db/scores";

interface Props {
	spot: SpotWithScore;
}

export function BestTimeCard({ spot }: Props) {
	const { todayScore } = spot;

	return (
		<div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
			<p className="text-xs text-gray-400 mb-1">今日のベストタイム</p>
			<div className="flex items-center gap-3">
				<ScoreLabel label={todayScore?.label} size="lg" />
				<div>
					<p className="font-bold text-lg leading-tight">{spot.name}</p>
					{todayScore?.bestHour != null ? (
						<p className="text-sky-600 font-semibold text-base">
							{todayScore.bestHour}:00〜
						</p>
					) : (
						<p className="text-gray-400 text-sm">時間データなし</p>
					)}
					{todayScore && (
						<p className="text-xs text-gray-400 mt-0.5">
							スコア {todayScore.score}点
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
