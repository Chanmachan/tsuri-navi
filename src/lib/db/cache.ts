/**
 * DB cache layer for weather/tide/astronomical data.
 * Persists CollectedSpotData to the weather_cache table.
 */

import { getDb } from "../../db/client";
import type { CollectedSpotData, HourlyCollectedData } from "../batch/collector";

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Upsert hourly weather/tide data for a spot into weather_cache.
 * Uses INSERT OR REPLACE to handle re-fetches.
 */
export function saveCollectedData(data: CollectedSpotData): void {
	const db = getDb();

	const stmt = db.prepare(`
    INSERT OR REPLACE INTO weather_cache (
      spot_id, date, hour,
      weather_code, temperature, wind_speed, wind_direction,
      precipitation, pressure,
      wave_height, swell_height,
      tide_level, tide_type, tide_cycle,
      sunrise, sunset, moon_age,
      fetched_at
    ) VALUES (
      @spot_id, @date, @hour,
      @weather_code, @temperature, @wind_speed, @wind_direction,
      @precipitation, @pressure,
      @wave_height, @swell_height,
      @tide_level, @tide_type, @tide_cycle,
      @sunrise, @sunset, @moon_age,
      datetime('now')
    )
  `);

	const insertMany = db.transaction((rows: HourlyCollectedData[]) => {
		for (const row of rows) {
			stmt.run({
				spot_id: data.spotId,
				date: row.date,
				hour: row.hour,
				weather_code: row.weatherCode,
				temperature: row.temperature,
				wind_speed: row.windSpeed,
				wind_direction: row.windDirection,
				precipitation: row.precipitation,
				pressure: row.pressure,
				wave_height: row.waveHeight,
				swell_height: row.swellHeight,
				tide_level: row.tideLevel,
				tide_type: row.tideType,
				tide_cycle: row.tideCycle,
				sunrise: row.sunrise,
				sunset: row.sunset,
				moon_age: row.moonAge,
			});
		}
	});

	insertMany(data.hourly);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export interface CachedHourlyRow {
	spot_id: number;
	date: string;
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
	tide_cycle: string | null;
	sunrise: string | null;
	sunset: string | null;
	moon_age: number | null;
	fetched_at: string;
}

/** Get all cached hourly rows for a spot on a given date. */
export function getCachedHourly(spotId: number, date: string): CachedHourlyRow[] {
	const db = getDb();
	return db
		.prepare(`SELECT * FROM weather_cache WHERE spot_id = ? AND date = ? ORDER BY hour`)
		.all(spotId, date) as CachedHourlyRow[];
}

/** Get a single cached hourly row for a spot, date, and hour. */
export function getCachedHour(
	spotId: number,
	date: string,
	hour: number,
): CachedHourlyRow | undefined {
	const db = getDb();
	return db
		.prepare(`SELECT * FROM weather_cache WHERE spot_id = ? AND date = ? AND hour = ?`)
		.get(spotId, date, hour) as CachedHourlyRow | undefined;
}

/**
 * Check if cached data exists and is fresh enough.
 * Returns true if any row for the spot+date was fetched within maxAgeHours.
 */
export function isCacheFresh(spotId: number, date: string, maxAgeHours = 6): boolean {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT fetched_at FROM weather_cache
       WHERE spot_id = ? AND date = ?
       ORDER BY fetched_at DESC LIMIT 1`,
		)
		.get(spotId, date) as { fetched_at: string } | undefined;

	if (!row) return false;

	const fetchedAt = new Date(row.fetched_at.replace(" ", "T") + "Z");
	const ageMs = Date.now() - fetchedAt.getTime();
	return ageMs < maxAgeHours * 60 * 60 * 1000;
}

/** Delete all cached rows for a spot. */
export function clearCache(spotId: number): void {
	const db = getDb();
	db.prepare(`DELETE FROM weather_cache WHERE spot_id = ?`).run(spotId);
}
