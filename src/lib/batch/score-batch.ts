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

function saveHourlyScores(scores: HourlyScore[], spotId: number): void {
	const db = getDb();
	const stmt = db.prepare(`
    INSERT OR REPLACE INTO scores (spot_id, date, hour, score, score_breakdown, best_time_flag, calculated_at)
    VALUES (@spot_id, @date, @hour, @score, @breakdown, 0, datetime('now'))
  `);
	const run = db.transaction(() => {
		for (const s of scores) {
			stmt.run({
				spot_id: spotId,
				date: s.date,
				hour: s.hour,
				score: s.score,
				breakdown: JSON.stringify(s.breakdown),
			});
		}
	});
	run();
}

function saveDailySummaries(
	summaries: DailySummaryScore[],
	spotId: number,
): void {
	const db = getDb();
	// SQLite does not treat multiple NULLs as conflicting under UNIQUE, so
	// INSERT OR REPLACE would accumulate duplicate rows on each re-run.
	// Use DELETE + INSERT inside a transaction to enforce idempotency.
	const deleteStmt = db.prepare(
		`DELETE FROM scores WHERE spot_id = @spot_id AND date = @date AND hour IS NULL`,
	);
	const insertStmt = db.prepare(`
    INSERT INTO scores (spot_id, date, hour, score, score_breakdown, best_time_flag, calculated_at)
    VALUES (@spot_id, @date, NULL, @score, @breakdown, 1, datetime('now'))
  `);
	const run = db.transaction(() => {
		for (const s of summaries) {
			const params = {
				spot_id: spotId,
				date: s.date,
				score: s.score,
				breakdown: JSON.stringify(s.breakdown),
			};
			deleteStmt.run({ spot_id: params.spot_id, date: params.date });
			insertStmt.run(params);
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
		const tideType = tideTypeByDate.get(date) ?? "中潮";
		const hourly = calculateHourlyScores(rows, tideType, weights);
		allHourly.push(...hourly);
	}

	const summaries = calculateDailySummaries(allHourly);

	if (allHourly.length > 0) {
		saveHourlyScores(allHourly, spot.id);
	}
	if (summaries.length > 0) {
		saveDailySummaries(summaries, spot.id);
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
