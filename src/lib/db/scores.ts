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
 * Uses a single query with correlated subquery to avoid N+1 for bestHour.
 */
export function getDailyScore(
	spotId: number,
	date: string,
): SpotDailyScore | null {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT
        daily.score,
        (
          SELECT MIN(h.hour)
          FROM scores AS h
          WHERE h.spot_id = daily.spot_id
            AND h.date = daily.date
            AND h.hour IS NOT NULL
            AND h.score = (
              SELECT MAX(hm.score)
              FROM scores AS hm
              WHERE hm.spot_id = daily.spot_id
                AND hm.date = daily.date
                AND hm.hour IS NOT NULL
            )
        ) AS bestHour
       FROM scores AS daily
       WHERE daily.spot_id = ? AND daily.date = ?
         AND daily.hour IS NULL AND daily.best_time_flag = 1
       LIMIT 1`,
		)
		.get(spotId, date) as { score: number; bestHour: number | null } | undefined;

	if (!row) return null;

	return {
		spotId,
		date,
		score: row.score,
		label: scoreToLabel(row.score),
		bestHour: row.bestHour ?? null,
	};
}

/**
 * Get daily scores for a spot over a range of dates (exactly `days` calendar days
 * starting from startDate). Uses a single query with a correlated subquery for
 * bestHour to avoid N+1.
 */
export function getWeeklyScores(
	spotId: number,
	startDate: string,
	days: number,
): SpotDailyScore[] {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT
        daily.date,
        daily.score,
        (
          SELECT MIN(h.hour)
          FROM scores AS h
          WHERE h.spot_id = daily.spot_id
            AND h.date = daily.date
            AND h.hour IS NOT NULL
            AND h.score = (
              SELECT MAX(hm.score)
              FROM scores AS hm
              WHERE hm.spot_id = daily.spot_id
                AND hm.date = daily.date
                AND hm.hour IS NOT NULL
            )
        ) AS bestHour
       FROM scores AS daily
       WHERE daily.spot_id = ?
         AND daily.date >= ?
         AND daily.date < date(?, '+' || ? || ' days')
         AND daily.hour IS NULL
         AND daily.best_time_flag = 1
       ORDER BY daily.date`,
		)
		.all(spotId, startDate, startDate, days) as {
		date: string;
		score: number;
		bestHour: number | null;
	}[];

	return rows.map((row) => ({
		spotId,
		date: row.date,
		score: row.score,
		label: scoreToLabel(row.score),
		bestHour: row.bestHour ?? null,
	}));
}

/**
 * Get all spots from the DB with today's daily summary score.
 * Uses a LEFT JOIN to fetch all scores in one query instead of N+1.
 */
export function getAllSpotsWithTodayScore(today: string): SpotWithScore[] {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT
        s.*,
        sc.score AS today_score,
        (
          SELECT MIN(h.hour)
          FROM scores AS h
          WHERE h.spot_id = s.id
            AND h.date = ?
            AND h.hour IS NOT NULL
            AND h.score = (
              SELECT MAX(hm.score)
              FROM scores AS hm
              WHERE hm.spot_id = s.id
                AND hm.date = ?
                AND hm.hour IS NOT NULL
            )
        ) AS today_best_hour
       FROM spots AS s
       LEFT JOIN scores AS sc
         ON sc.spot_id = s.id
         AND sc.date = ?
         AND sc.hour IS NULL
         AND sc.best_time_flag = 1
       ORDER BY s.is_favorite DESC, s.is_preset DESC, s.name`,
		)
		.all(today, today, today) as (Spot & {
		today_score: number | null;
		today_best_hour: number | null;
	})[];

	return rows.map((row) => {
		const { today_score, today_best_hour, ...spot } = row;
		const todayScore: SpotDailyScore | null =
			today_score != null
				? {
						spotId: spot.id,
						date: today,
						score: today_score,
						label: scoreToLabel(today_score),
						bestHour: today_best_hour ?? null,
					}
				: null;
		return { ...spot, todayScore };
	});
}
