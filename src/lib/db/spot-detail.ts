/**
 * DB query helpers for the spot detail screen.
 */

import { getDb } from "../../db/client";
import type { ScoreBreakdown } from "../../types/score";
import type { Spot } from "../../db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HourlyScoreRow {
	hour: number;
	score: number;
	breakdown: ScoreBreakdown;
}

export interface HourlyWeatherRow {
	hour: number;
	weather_code: number | null;
	temperature: number | null;
	wind_speed: number | null;
	wind_direction: number | null;
	precipitation: number | null;
	pressure: number | null;
	wave_height: number | null;
	swell_height: number | null;
	tide_level: number | null;
	tide_type: "満潮" | "干潮" | null;
	sunrise: string | null;
	sunset: string | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getSpotById(id: number): Spot | null {
	const db = getDb();
	return (db.prepare("SELECT * FROM spots WHERE id = ?").get(id) as Spot | undefined) ?? null;
}

/**
 * Get hourly score rows for one spot + date (hour IS NOT NULL).
 */
export function getHourlyScores(spotId: number, date: string): HourlyScoreRow[] {
	const db = getDb();
	const rows = db
		.prepare(
			`SELECT hour, score, score_breakdown
       FROM scores
       WHERE spot_id = ? AND date = ? AND hour IS NOT NULL
       ORDER BY hour`,
		)
		.all(spotId, date) as { hour: number; score: number; score_breakdown: string }[];

	return rows.map((r) => ({
		hour: r.hour,
		score: r.score,
		breakdown: JSON.parse(r.score_breakdown) as ScoreBreakdown,
	}));
}

/**
 * Get hourly weather/tide data for one spot + date from the cache.
 */
export function getHourlyWeather(spotId: number, date: string): HourlyWeatherRow[] {
	const db = getDb();
	return db
		.prepare(
			`SELECT
        hour, weather_code, temperature, wind_speed, wind_direction,
        precipitation, pressure, wave_height, swell_height,
        tide_level, tide_type, sunrise, sunset
       FROM weather_cache
       WHERE spot_id = ? AND date = ?
       ORDER BY hour`,
		)
		.all(spotId, date) as HourlyWeatherRow[];
}
