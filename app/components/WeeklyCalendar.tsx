"use client";

import { ScoreLabel } from "./ScoreLabel";
import type { SpotDailyScore } from "../../src/lib/db/scores";

interface Props {
	scores: SpotDailyScore[];
}

const DAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

function formatDay(dateStr: string): { md: string; day: string } {
	const d = new Date(`${dateStr}T00:00:00`);
	const m = d.getMonth() + 1;
	const day = d.getDate();
	return { md: `${m}/${day}`, day: DAY_JA[d.getDay()] ?? "" };
}

export function WeeklyCalendar({ scores }: Props) {
	if (scores.length === 0) {
		return (
			<p className="text-sm text-gray-400 py-2">週間データがありません</p>
		);
	}

	return (
		<div className="overflow-x-auto -mx-1 px-1 pb-1">
			<div className="flex gap-2 min-w-max">
				{scores.map((s) => {
					const { md, day } = formatDay(s.date);
					return (
						<div
							key={s.date}
							className="flex flex-col items-center gap-1 w-12"
						>
							<span className="text-xs text-gray-400">{day}</span>
							<span className="text-xs text-gray-500 tabular-nums">{md}</span>
							<ScoreLabel label={s.label} size="sm" />
						</div>
					);
				})}
			</div>
		</div>
	);
}
