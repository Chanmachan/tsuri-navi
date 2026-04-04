/**
 * Score batch — computes hourly + daily scores for all spots and persists to DB.
 */

import { getDb } from "../../db/client";
import type { Spot } from "../../db/schema";
import type { DailySummaryScore, HourlyScore, ScoreWeights } from "../../types/score";
import { getCachedHourly } from "../db/cache";
import { calculateDailySummaries } from "../score/daily-summary";
import { calculateHourlyScores } from "../score/hourly";

// ---------------------------------------------------------------------------
// DB persistence
// ---------------------------------------------------------------------------

/**
 * Persist hourly scores and daily summaries for one spot atomically.
 * Both writes commit or roll back together so readers never see hourly rows
 * without a matching daily summary (or vice-versa).
 */
function saveScoresTransaction(
	hourly: HourlyScore[],
	summaries: DailySummaryScore[],
	spotId: number,
): void {
	const db = getDb();

	// Hourly statements
	// Delete existing hourly rows for each date first so a partial cache refresh
	// doesn't leave stale hours (or stale best_time_flag values) in the DB.
	const deleteHourlyStmt = db.prepare(
		`DELETE FROM scores WHERE spot_id = @spot_id AND date = @date AND hour IS NOT NULL`,
	);
	const insertHourlyStmt = db.prepare(`
    INSERT INTO scores (spot_id, date, hour, score, score_breakdown, best_time_flag, calculated_at)
    VALUES (@spot_id, @date, @hour, @score, @breakdown, 0, datetime('now'))
  `);

	// Daily summary statements
	// SQLite does not treat multiple NULLs as conflicting under UNIQUE, so
	// INSERT OR REPLACE would accumulate duplicate rows on each re-run.
	// Use DELETE + INSERT to enforce idempotency.
	const deleteDailyStmt = db.prepare(
		`DELETE FROM scores WHERE spot_id = @spot_id AND date = @date AND hour IS NULL`,
	);
	const insertDailyStmt = db.prepare(`
    INSERT INTO scores (spot_id, date, hour, score, score_breakdown, best_time_flag, calculated_at)
    VALUES (@spot_id, @date, NULL, @score, @breakdown, 1, datetime('now'))
  `);
	// Mark the winning hourly row so callers can find the best hour without
	// a correlated MAX subquery (also aligns with the schema's intent for the flag).
	const markBestStmt = db.prepare(`
    UPDATE scores SET best_time_flag = 1
    WHERE spot_id = @spot_id AND date = @date AND hour = @hour
  `);

	const run = db.transaction(() => {
		// Write hourly rows
		const dates = [...new Set(hourly.map((s) => s.date))];
		for (const date of dates) {
			deleteHourlyStmt.run({ spot_id: spotId, date });
		}
		for (const s of hourly) {
			insertHourlyStmt.run({
				spot_id: spotId,
				date: s.date,
				hour: s.hour,
				score: s.score,
				breakdown: JSON.stringify(s.breakdown),
			});
		}

		// Write daily summaries
		for (const s of summaries) {
			deleteDailyStmt.run({ spot_id: spotId, date: s.date });
			insertDailyStmt.run({
				spot_id: spotId,
				date: s.date,
				score: s.score,
				breakdown: JSON.stringify(s.breakdown),
			});
			markBestStmt.run({ spot_id: spotId, date: s.date, hour: s.bestHour });
		}
	});
	run();
}

// ---------------------------------------------------------------------------
// Per-spot batch
// ---------------------------------------------------------------------------

export interface SpotScoreResult {
	spotId: number;
	dates: string[];
	hourlyCount: number;
	summaryCount: number;
	errors: string[];
}

/**
 * Compute and save scores for one spot across the given date range.
 * Reads from weather_cache; requires data to already be collected.
 */
export function runScoreBatchForSpot(
	spot: Pick<Spot, "id">,
	dates: string[],
	tideTypeByDate: Map<string, string>,
	weights?: ScoreWeights,
): SpotScoreResult {
	const errors: string[] = [];
	const allHourly: HourlyScore[] = [];

	for (const date of dates) {
		const rows = getCachedHourly(spot.id, date);
		if (rows.length === 0) {
			errors.push(`No cached data for spot ${spot.id} on ${date}`);
			continue;
		}
		// Fall back to "" (hits the neutral default branch in scoreTideCycle → 0.5)
		// rather than "中潮" (0.75) which would silently inflate scores.
		if (!tideTypeByDate.has(date)) {
			errors.push(`No tide type for spot ${spot.id} on ${date}`);
		}
		const tideType = tideTypeByDate.get(date) ?? "";
		const hourly = calculateHourlyScores(rows, tideType, weights);
		allHourly.push(...hourly);
	}

	const summaries = calculateDailySummaries(allHourly);

	if (allHourly.length > 0 || summaries.length > 0) {
		saveScoresTransaction(allHourly, summaries, spot.id);
	}

	return {
		spotId: spot.id,
		dates,
		hourlyCount: allHourly.length,
		summaryCount: summaries.length,
		errors,
	};
}

// ---------------------------------------------------------------------------
// Full batch (all spots)
// ---------------------------------------------------------------------------

export interface BatchResult {
	spots: SpotScoreResult[];
	totalHourly: number;
	totalSummaries: number;
	errors: string[];
}

/**
 * Run score batch for all spots in the DB for the given dates.
 */
export function runScoreBatch(
	dates: string[],
	tideTypesBySpotDate: Map<number, Map<string, string>>,
	weights?: ScoreWeights,
): BatchResult {
	const db = getDb();
	const spots = db.prepare("SELECT id FROM spots").all() as Pick<Spot, "id">[];

	const spotResults: SpotScoreResult[] = [];
	for (const spot of spots) {
		const tideTypes = tideTypesBySpotDate.get(spot.id) ?? new Map<string, string>();
		const result = runScoreBatchForSpot(spot, dates, tideTypes, weights);
		spotResults.push(result);
	}

	return {
		spots: spotResults,
		totalHourly: spotResults.reduce((s, r) => s + r.hourlyCount, 0),
		totalSummaries: spotResults.reduce((s, r) => s + r.summaryCount, 0),
		errors: spotResults.flatMap((r) => r.errors),
	};
}
