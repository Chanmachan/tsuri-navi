import { ScoreLabel } from "./ScoreLabel";
import { scoreToLabel } from "../../src/types/score";
import type { ScoreBreakdown } from "../../src/types/score";
import { DEFAULT_WEIGHTS } from "../../src/types/score";

interface Props {
	score: number;
	breakdown: ScoreBreakdown;
	bestHour: number | null;
}

const FACTOR_LABELS: { key: keyof ScoreBreakdown; label: string; maxWeight: number }[] = [
	{ key: "tideCycle", label: "潮回り", maxWeight: DEFAULT_WEIGHTS.tideCycle },
	{ key: "tideMovement", label: "潮の動き", maxWeight: DEFAULT_WEIGHTS.tideMovement },
	{ key: "weather", label: "天気", maxWeight: DEFAULT_WEIGHTS.weather },
	{ key: "wind", label: "風速", maxWeight: DEFAULT_WEIGHTS.wind },
	{ key: "wave", label: "波高", maxWeight: DEFAULT_WEIGHTS.wave },
	{ key: "mazume", label: "マズメ", maxWeight: DEFAULT_WEIGHTS.mazume },
	{ key: "pressure", label: "気圧", maxWeight: DEFAULT_WEIGHTS.pressure },
	{ key: "moon", label: "月齢", maxWeight: DEFAULT_WEIGHTS.moon },
];

function barColor(pct: number): string {
	if (pct >= 0.75) return "bg-green-400";
	if (pct >= 0.5) return "bg-blue-400";
	if (pct >= 0.25) return "bg-yellow-400";
	return "bg-red-400";
}

export function ScoreBreakdownCard({ score, breakdown, bestHour }: Props) {
	const label = scoreToLabel(score);

	return (
		<div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
			<div className="flex items-center gap-4 mb-5">
				<ScoreLabel label={label} size="lg" />
				<div>
					<p className="text-4xl font-bold tabular-nums text-gray-800">
						{score}
						<span className="text-lg font-normal text-gray-400 ml-1">点</span>
					</p>
					{bestHour != null && (
						<p className="text-sky-600 font-semibold">ベストタイム {bestHour}:00〜</p>
					)}
				</div>
			</div>

			<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">スコア内訳</p>
			<ul className="space-y-2">
				{FACTOR_LABELS.map(({ key, label: factorLabel, maxWeight }) => {
					const val = breakdown[key] ?? 0;
					const pct = Math.min(1, Math.max(0, maxWeight > 0 ? val / maxWeight : 0));
					return (
						<li key={key} className="flex items-center gap-2">
							<span className="text-xs text-gray-500 w-20 shrink-0">{factorLabel}</span>
							<div className="flex-1 bg-gray-100 rounded-full h-2">
								<div
									className={`h-2 rounded-full ${barColor(pct)}`}
									style={{ width: `${Math.round(pct * 100)}%` }}
								/>
							</div>
							<span className="text-xs tabular-nums text-gray-500 w-10 text-right">
								{val}/{maxWeight}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
