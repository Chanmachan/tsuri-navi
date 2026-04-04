/**
 * DB query helpers for score data.
 */

import { getDb } from "../../db/client";
import { scoreToLabel } from "../../types/score";
import type { Spot } from "../../db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpotDailyScore {
	spotId: number;
	date: string;
	score: number;
	label: "◎" | "○" | "△" | "×";
	bestHour: number | null;
}

export interface SpotWithScore extends Spot {
	todayScore: SpotDailyScore | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get the daily summary score (best_time_flag=1, hour=NULL row) for a spot on a date.
 */
export function getDailyScore(
	spotId: number,
	date: string,
): SpotDailyScore | null {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT score FROM scores
       WHERE spot_id = ? AND date = ? AND hour IS NULL AND best_time_flag = 1
       LIMIT 1`,
		)
		.get(spotId, date) as { score: number } | undefined;

	if (!row) return null;

	// Get best hour: the hourly row with the highest score
	const bestRow = db
		.prepare(
			`SELECT hour FROM scores
       WHERE spot_id = ? AND date = ? AND hour IS NOT NULL
       ORDER BY score DESC LIMIT 1`,
		)
		.get(spotId, date) as { hour: number } | undefined;

	return {
		spotId,
		date,
		score: row.score,
		label: scoreToLabel(row.score),
		bestHour: bestRow?.hour ?? null,
	};
}

/**
 * Get daily scores for a spot over a range of dates.
 */
export function getWeeklyScores(
	spotId: number,
	startDate: string,
	days: number,
): SpotDailyScore[] {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT date, score FROM scores
       WHERE spot_id = ? AND date >= ? AND hour IS NULL AND best_time_flag = 1
       ORDER BY date
       LIMIT ?`,
		)
		.all(spotId, startDate, days) as { date: string; score: number }[];

	// For each date, also fetch best hour
	return rows.map((row) => {
		const bestRow = db
			.prepare(
				`SELECT hour FROM scores
         WHERE spot_id = ? AND date = ? AND hour IS NOT NULL
         ORDER BY score DESC LIMIT 1`,
			)
			.get(spotId, row.date) as { hour: number } | undefined;

		return {
			spotId,
			date: row.date,
			score: row.score,
			label: scoreToLabel(row.score),
			bestHour: bestRow?.hour ?? null,
		};
	});
}

/**
 * Get all spots from the DB with today's daily summary score.
 */
export function getAllSpotsWithTodayScore(today: string): SpotWithScore[] {
	const db = getDb();
	const spots = db
		.prepare(`SELECT * FROM spots ORDER BY is_favorite DESC, is_preset DESC, name`)
		.all() as Spot[];

	return spots.map((spot) => ({
		...spot,
		todayScore: getDailyScore(spot.id, today),
	}));
}
