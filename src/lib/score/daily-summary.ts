/**
 * Daily summary score — aggregates hourly scores into a single day rating.
 */

import { scoreToLabel, type DailySummaryScore, type HourlyScore, type ScoreBreakdown } from "../../types/score";

/**
 * Compute the daily summary for one spot-day.
 * The summary score is the highest hourly score of the day.
 * The breakdown corresponds to the best hour.
 */
export function calculateDailySummary(
	hourlyScores: HourlyScore[],
): DailySummaryScore | null {
	if (hourlyScores.length === 0) return null;

	const best = hourlyScores.reduce((a, b) => (b.score > a.score ? b : a));

	return {
		date: best.date,
		score: best.score,
		label: scoreToLabel(best.score),
		bestHour: best.hour,
		breakdown: best.breakdown,
	};
}

/**
 * Compute daily summaries for multiple days.
 * Groups by date and applies calculateDailySummary per group.
 */
export function calculateDailySummaries(
	hourlyScores: HourlyScore[],
): DailySummaryScore[] {
	const byDate = new Map<string, HourlyScore[]>();
	for (const s of hourlyScores) {
		const list = byDate.get(s.date) ?? [];
		list.push(s);
		byDate.set(s.date, list);
	}

	const results: DailySummaryScore[] = [];
	for (const [, scores] of byDate) {
		const summary = calculateDailySummary(scores);
		if (summary) results.push(summary);
	}

	return results.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Average breakdown across multiple hourly scores (for weekly overview).
 * Each factor is averaged across all provided hours.
 */
export function averageBreakdown(scores: HourlyScore[]): ScoreBreakdown {
	if (scores.length === 0) {
		return {
			tideCycle: 0,
			tideMovement: 0,
			weather: 0,
			wind: 0,
			wave: 0,
			mazume: 0,
			pressure: 0,
			moon: 0,
		};
	}

	const sum = scores.reduce(
		(acc, s) => ({
			tideCycle: acc.tideCycle + s.breakdown.tideCycle,
			tideMovement: acc.tideMovement + s.breakdown.tideMovement,
			weather: acc.weather + s.breakdown.weather,
			wind: acc.wind + s.breakdown.wind,
			wave: acc.wave + s.breakdown.wave,
			mazume: acc.mazume + s.breakdown.mazume,
			pressure: acc.pressure + s.breakdown.pressure,
			moon: acc.moon + s.breakdown.moon,
		}),
		{
			tideCycle: 0,
			tideMovement: 0,
			weather: 0,
			wind: 0,
			wave: 0,
			mazume: 0,
			pressure: 0,
			moon: 0,
		} as ScoreBreakdown,
	);

	const n = scores.length;
	return {
		tideCycle: Math.round(sum.tideCycle / n),
		tideMovement: Math.round(sum.tideMovement / n),
		weather: Math.round(sum.weather / n),
		wind: Math.round(sum.wind / n),
		wave: Math.round(sum.wave / n),
		mazume: Math.round(sum.mazume / n),
		pressure: Math.round(sum.pressure / n),
		moon: Math.round(sum.moon / n),
	};
}
