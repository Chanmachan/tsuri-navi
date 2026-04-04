"use client";

import {
	Bar,
	BarChart,
	Cell,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { HourlyScoreRow } from "../../src/lib/db/spot-detail";

interface Props {
	scores: HourlyScoreRow[];
	bestHour: number | null;
}

function barFill(score: number, isBest: boolean): string {
	if (isBest) return "#0ea5e9"; // sky-500 highlight
	if (score >= 80) return "#4ade80"; // green-400
	if (score >= 60) return "#60a5fa"; // blue-400
	if (score >= 40) return "#facc15"; // yellow-400
	return "#f87171"; // red-400
}

export function HourlyScoreChart({ scores, bestHour }: Props) {
	if (scores.length === 0) {
		return (
			<div className="h-36 flex items-center justify-center text-sm text-gray-400">データなし</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={140}>
			<BarChart data={scores} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
				<XAxis
					dataKey="hour"
					tickFormatter={(h: number) => `${h}`}
					tick={{ fontSize: 10 }}
					interval={2}
				/>
				<YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
				<Tooltip
					formatter={(v: unknown) => [`${v}点`, "スコア"]}
					labelFormatter={(h: unknown) => `${h}:00`}
				/>
				{bestHour != null && <ReferenceLine x={bestHour} stroke="#0ea5e9" strokeDasharray="3 3" />}
				<Bar dataKey="score" radius={[2, 2, 0, 0]}>
					{scores.map((s) => (
						<Cell key={s.hour} fill={barFill(s.score, s.hour === bestHour)} />
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
