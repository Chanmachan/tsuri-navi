/**
 * Hourly score calculation — converts DB cache rows into HourlyScore[].
 */

import { calculateHourlyScore } from "./calculator";
import {
	DEFAULT_WEIGHTS,
	type HourlyScore,
	type HourlyScoreInput,
	type ScoreWeights,
} from "../../types/score";
import type { CachedHourlyRow } from "../db/cache";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given a list of hourly rows for a single day, compute how many hours each
 * row is from the nearest tide extreme (満潮 or 干潮).
 *
 * The tide_type field in weather_cache marks the exact extreme hours; all
 * other hours are interpolated by distance to the nearest marked extreme.
 */
function buildHoursToExtreme(rows: CachedHourlyRow[]): Map<number, number> {
	const extremeHours = rows
		.filter((r) => r.tide_type !== null)
		.map((r) => r.hour);

	const result = new Map<number, number>();
	for (const row of rows) {
		if (extremeHours.length === 0) {
			result.set(row.hour, 6); // unknown — treat as slack water
		} else {
			const minDist = Math.min(
				...extremeHours.map((eh) => {
					const dist = Math.abs(row.hour - eh);
					return Math.min(dist, 24 - dist); // wrap-around at midnight
				}),
			);
			result.set(row.hour, minDist);
		}
	}
	return result;
}

/**
 * Build a pressure-3h-ago lookup from the sorted hourly rows.
 * If there are fewer than 3 prior rows, uses null.
 */
function buildPressurePrev3h(rows: CachedHourlyRow[]): Map<number, number | null> {
	const byHour = new Map(rows.map((r) => [r.hour, r.pressure]));
	const result = new Map<number, number | null>();
	for (const row of rows) {
		result.set(row.hour, byHour.get(row.hour - 3) ?? null);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Calculate hourly scores for one spot-day from cached DB rows.
 *
 * @param rows    All weather_cache rows for the spot + date (ordered by hour)
 * @param tideType  Tide cycle name for the day (e.g. "大潮")
 * @param weights   Configurable score weights (defaults to spec weights)
 */
export function calculateHourlyScores(
	rows: CachedHourlyRow[],
	tideType: string,
	weights: ScoreWeights = DEFAULT_WEIGHTS,
): HourlyScore[] {
	if (rows.length === 0) return [];

	const hoursToExtreme = buildHoursToExtreme(rows);
	const pressurePrev3h = buildPressurePrev3h(rows);

	return rows.map((row) => {
		const input: HourlyScoreInput = {
			tideType,
			hoursToNearestExtreme: hoursToExtreme.get(row.hour) ?? 6,
			weatherCode: row.weather_code,
			windSpeed: row.wind_speed,
			waveHeight: row.wave_height,
			mazumeScore: getMazumeScoreForRow(row),
			pressure: row.pressure,
			pressurePrev3h: pressurePrev3h.get(row.hour) ?? null,
			moonAge: row.moon_age ?? 15,
		};
		return calculateHourlyScore(input, weights, row.date, row.hour);
	});
}

/**
 * Compute mazume score for a cached row.
 * Uses sunrise/sunset from the cached row if available, otherwise falls back
 * to a placeholder score (0 = treat as non-mazume).
 */
function getMazumeScoreForRow(row: CachedHourlyRow): number {
	if (!row.sunrise || !row.sunset) return 0;

	const sunriseH = Number.parseInt(row.sunrise.split(":")[0] ?? "5", 10);
	const sunsetH = Number.parseInt(row.sunset.split(":")[0] ?? "18", 10);

	// Distance from sunrise or sunset in hours
	const distSunrise = Math.abs(row.hour - sunriseH);
	const distSunset = Math.abs(row.hour - sunsetH);
	const minDist = Math.min(distSunrise, distSunset);

	if (minDist === 0) return 10;
	if (minDist === 1) return 7;
	if (minDist === 2) return 3;
	return 0;
}

