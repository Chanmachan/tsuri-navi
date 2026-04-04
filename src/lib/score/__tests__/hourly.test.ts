import { describe, expect, it } from "vitest";
import { calculateHourlyScores } from "../hourly";
import { DEFAULT_WEIGHTS } from "../../../types/score";
import type { CachedHourlyRow } from "../../db/cache";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_ROW: Omit<CachedHourlyRow, "hour"> = {
	spot_id: 1,
	date: "2026-04-04",
	weather_code: 3,
	temperature: 15,
	wind_speed: 3,
	wind_direction: 180,
	precipitation: 0,
	pressure: 1013,
	wave_height: 0.5,
	swell_height: null,
	tide_level: 100,
	tide_type: null,
	sunrise: "05:30",
	sunset: "18:00",
	moon_age: 10,
	fetched_at: "2026-04-04T00:00:00.000Z",
};

function makeRow(hour: number, overrides: Partial<CachedHourlyRow> = {}): CachedHourlyRow {
	return { ...BASE_ROW, hour, ...overrides };
}

// ---------------------------------------------------------------------------
// calculateHourlyScores
// ---------------------------------------------------------------------------

describe("calculateHourlyScores", () => {
	it("returns empty array for empty input", () => {
		expect(calculateHourlyScores([], "大潮")).toEqual([]);
	});

	it("returns one HourlyScore per input row", () => {
		const rows = [makeRow(6), makeRow(12), makeRow(18)];
		const result = calculateHourlyScores(rows, "大潮");
		expect(result).toHaveLength(3);
		expect(result.map((r) => r.hour)).toEqual([6, 12, 18]);
	});

	it("assigns row.date to each output score", () => {
		const rows = [makeRow(6), makeRow(12)];
		const result = calculateHourlyScores(rows, "大潮");
		for (const score of result) {
			expect(score.date).toBe("2026-04-04");
		}
	});

	it("falls back to moon_age=15 when moon_age is null", () => {
		const rowsWithNull = [makeRow(6, { moon_age: null })];
		const rowsWithDefault = [makeRow(6, { moon_age: 15 })];
		const [nullScore] = calculateHourlyScores(rowsWithNull, "大潮");
		const [defaultScore] = calculateHourlyScores(rowsWithDefault, "大潮");
		expect(nullScore.breakdown.moon).toBe(defaultScore.breakdown.moon);
	});

	it("defaults hoursToNearestExtreme to 6 when no tide extreme in rows", () => {
		// No row has tide_type set, so hoursToExtreme map is empty → default 6
		// scoreTideMovement(6) = 0.0 → breakdown.tideMovement = Math.round(0.0 * 15) = 0
		const rows = [makeRow(6)];
		const [score] = calculateHourlyScores(rows, "大潮");
		expect(score.breakdown.tideMovement).toBe(0);
	});

	it("computes pressurePrev3h using index-based 3-row lookback", () => {
		// Index-based: row at index i gets sorted[i-3].pressure; need ≥4 rows.
		// Hour 6 (index 3) looks back to hour 3 (index 0): delta = 1010-1015 = -5 → lower pressure score.
		// Hour 3 (index 0) has no prior row → pressurePrev3h = null → stable/high-pressure default.
		const rows = [
			makeRow(3, { pressure: 1015 }),
			makeRow(4, { pressure: 1015 }),
			makeRow(5, { pressure: 1015 }),
			makeRow(6, { pressure: 1010 }), // falling 5 hPa vs 3 rows prior
		];
		const result = calculateHourlyScores(rows, "大潮");
		expect(result).toHaveLength(4);
		const hour3 = result.find((r) => r.hour === 3)!;
		const hour6 = result.find((r) => r.hour === 6)!;
		// Falling pressure at hour 6 should score lower than stable at hour 3
		expect(hour6.breakdown.pressure).toBeLessThan(hour3.breakdown.pressure);
	});

	it("scores mazume hour (sunrise±1) higher than non-mazume hour under same conditions", () => {
		// sunrise=05:30 → hour 5 is mazume, hour 11 is not
		const rows = [
			makeRow(5),  // mazume (1h from sunrise)
			makeRow(11), // non-mazume
		];
		const [mazumeScore, normalScore] = calculateHourlyScores(rows, "大潮");
		// Mazume factor must be strictly positive and must produce a higher total score
		expect(mazumeScore.breakdown.mazume).toBeGreaterThan(0);
		expect(mazumeScore.score).toBeGreaterThan(normalScore.score);
	});

	it("uses tide extreme row for hoursToNearestExtreme calculation", () => {
		// Row at hour 6 is the tide extreme (h=0 → 潮止まり → tideMovement=0);
		// hour 7 is 1h away (h=1 → 前後1時間 = best window).
		const rows = [
			makeRow(6, { tide_type: "満潮" }),
			makeRow(7),
		];
		const result = calculateHourlyScores(rows, "大潮");
		expect(result).toHaveLength(2);
		// h=0 (exact extreme = 潮止まり) scores lower than h=1 (前後1時間)
		expect(result[1].breakdown.tideMovement).toBeGreaterThan(result[0].breakdown.tideMovement);
	});

	it("zeroes wind and wave components when their weights are 0", () => {
		const rows = [makeRow(6)];
		const customWeights = { ...DEFAULT_WEIGHTS, wind: 0, wave: 0 };
		const [result] = calculateHourlyScores(rows, "大潮", customWeights);
		expect(result.breakdown.wind).toBe(0);
		expect(result.breakdown.wave).toBe(0);
		// Other factors still contribute
		expect(result.score).toBeGreaterThan(0);
	});
});
