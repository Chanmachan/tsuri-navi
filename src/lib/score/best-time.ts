/**
 * Best time extraction — finds the peak fishing hour(s) from hourly scores.
 */

import type { HourlyScore } from "../../types/score";

export interface BestTimeResult {
	date: string;
	bestHour: number;
	score: number;
	/** All hours with score >= threshold, sorted by score desc */
	topHours: { hour: number; score: number }[];
}

/**
 * Extract the best fishing time for a day from its hourly scores.
 *
 * @param hourlyScores  Scores for a single day (any order, filtered to one date)
 * @param topN          How many top hours to include in the result (default 3)
 */
export function extractBestTime(
	hourlyScores: HourlyScore[],
	topN = 3,
): BestTimeResult | null {
	if (hourlyScores.length === 0) return null;

	const sorted = [...hourlyScores].sort((a, b) => b.score - a.score);
	const best = sorted[0];

	return {
		date: best.date,
		bestHour: best.hour,
		score: best.score,
		topHours: sorted.slice(0, topN).map((h) => ({
			hour: h.hour,
			score: h.score,
		})),
	};
}

/**
 * Extract best times for multiple days.
 * Groups scores by date and applies extractBestTime per day.
 */
export function extractBestTimes(
	hourlyScores: HourlyScore[],
	topN = 3,
): BestTimeResult[] {
	const byDate = new Map<string, HourlyScore[]>();
	for (const s of hourlyScores) {
		const list = byDate.get(s.date) ?? [];
		list.push(s);
		byDate.set(s.date, list);
	}

	const results: BestTimeResult[] = [];
	for (const [, scores] of byDate) {
		const result = extractBestTime(scores, topN);
		if (result) results.push(result);
	}

	return results.sort((a, b) => a.date.localeCompare(b.date));
}
