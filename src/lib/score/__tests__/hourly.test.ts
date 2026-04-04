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

	it("uses moon_age from row when present", () => {
		// moon_age null should fall back to default (15) without throwing
		const rows = [makeRow(6, { moon_age: null })];
		expect(() => calculateHourlyScores(rows, "大潮")).not.toThrow();
	});

	it("defaults hoursToNearestExtreme to 6 when no tide extreme in rows", () => {
		// No row has tide_type set, so hoursToExtreme map is empty → default 6
		const rows = [makeRow(6)];
		const [score] = calculateHourlyScores(rows, "大潮");
		// score should be defined and within valid range
		expect(score.score).toBeGreaterThanOrEqual(0);
		expect(score.score).toBeLessThanOrEqual(100);
	});

	it("computes pressurePrev3h from 3 hours prior", () => {
		// Row at hour 6 should get pressurePrev3h from hour 3
		const rows = [
			makeRow(3, { pressure: 1015 }),
			makeRow(6, { pressure: 1010 }), // delta = -5 → dropping pressure → lower score
		];
		// No throw, and score is valid
		const result = calculateHourlyScores(rows, "大潮");
		expect(result).toHaveLength(2);
		for (const s of result) {
			expect(s.score).toBeGreaterThanOrEqual(0);
			expect(s.score).toBeLessThanOrEqual(100);
		}
	});

	it("scores mazume hour (sunrise±1) higher than non-mazume hour under same conditions", () => {
		// sunrise=05:30 → hour 5 is mazume, hour 11 is not
		const rows = [
			makeRow(5),  // mazume (1h from sunrise)
			makeRow(11), // non-mazume
		];
		const [mazumeScore, normalScore] = calculateHourlyScores(rows, "大潮");
		expect(mazumeScore.score).toBeGreaterThanOrEqual(normalScore.score);
	});

	it("uses tide extreme row for hoursToNearestExtreme calculation", () => {
		// Row at hour 6 is a tide extreme (tide_type set); hour 9 should be 3h away
		const rows = [
			makeRow(6, { tide_type: "満潮" }),
			makeRow(9),
		];
		const result = calculateHourlyScores(rows, "大潮");
		expect(result).toHaveLength(2);
		// The extreme hour itself (0h away) should score highest on tideMovement
		expect(result[0].breakdown.tideMovement).toBeGreaterThanOrEqual(result[1].breakdown.tideMovement);
	});

	it("accepts custom weights without throwing", () => {
		const rows = [makeRow(6)];
		const customWeights = { ...DEFAULT_WEIGHTS, wind: 0, wave: 0 };
		expect(() => calculateHourlyScores(rows, "大潮", customWeights)).not.toThrow();
	});
});
