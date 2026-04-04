import { describe, expect, it } from "vitest";
import { averageBreakdown, calculateDailySummaries, calculateDailySummary } from "../daily-summary";
import { calculateHourlyScore } from "../calculator";
import { DEFAULT_WEIGHTS, type HourlyScore } from "../../../types/score";

const BREAKDOWN = {
	tideCycle: 10,
	tideMovement: 10,
	weather: 10,
	wind: 10,
	wave: 10,
	mazume: 5,
	pressure: 3,
	moon: 3,
};

function makeScore(date: string, hour: number, score: number): HourlyScore {
	return { date, hour, score, breakdown: BREAKDOWN };
}

describe("calculateDailySummary", () => {
	it("returns null for empty input", () => {
		expect(calculateDailySummary([])).toBeNull();
	});

	it("uses the highest hourly score as the day score", () => {
		const scores = [
			makeScore("2026-04-04", 6, 75),
			makeScore("2026-04-04", 12, 40),
			makeScore("2026-04-04", 18, 82),
		];
		const summary = calculateDailySummary(scores);
		expect(summary?.score).toBe(82);
		expect(summary?.bestHour).toBe(18);
	});

	it("assigns correct ◎ label for score >= 80", () => {
		const summary = calculateDailySummary([makeScore("2026-04-04", 6, 85)]);
		expect(summary?.label).toBe("◎");
	});

	it("assigns ○ label for score 60-79", () => {
		const summary = calculateDailySummary([makeScore("2026-04-04", 6, 65)]);
		expect(summary?.label).toBe("○");
	});

	it("assigns △ label for score 40-59", () => {
		const summary = calculateDailySummary([makeScore("2026-04-04", 6, 50)]);
		expect(summary?.label).toBe("△");
	});

	it("assigns × label for score < 40", () => {
		const summary = calculateDailySummary([makeScore("2026-04-04", 6, 35)]);
		expect(summary?.label).toBe("×");
	});

	it("breakdown corresponds to the best hour", () => {
		const scores = [
			makeScore("2026-04-04", 6, 75),
			makeScore("2026-04-04", 18, 82),
		];
		const summary = calculateDailySummary(scores);
		expect(summary?.breakdown).toEqual(BREAKDOWN);
	});
});

describe("calculateDailySummaries", () => {
	it("groups by date and returns one summary per day", () => {
		const scores = [
			makeScore("2026-04-04", 6, 75),
			makeScore("2026-04-04", 18, 80),
			makeScore("2026-04-05", 5, 55),
		];
		const summaries = calculateDailySummaries(scores);
		expect(summaries).toHaveLength(2);
	});

	it("returns summaries sorted by date", () => {
		const scores = [
			makeScore("2026-04-06", 6, 70),
			makeScore("2026-04-04", 6, 80),
			makeScore("2026-04-05", 6, 75),
		];
		const summaries = calculateDailySummaries(scores);
		expect(summaries.map((s) => s.date)).toEqual([
			"2026-04-04",
			"2026-04-05",
			"2026-04-06",
		]);
	});
});

// ---------------------------------------------------------------------------
// averageBreakdown
// ---------------------------------------------------------------------------

describe("averageBreakdown", () => {
	it("returns all-zero breakdown for empty input", () => {
		expect(averageBreakdown([])).toEqual({
			tideCycle: 0,
			tideMovement: 0,
			weather: 0,
			wind: 0,
			wave: 0,
			mazume: 0,
			pressure: 0,
			moon: 0,
		});
	});

	it("returns the breakdown unchanged for a single score", () => {
		const scores: HourlyScore[] = [
			{ date: "2026-04-04", hour: 6, score: 70, breakdown: { tideCycle: 10, tideMovement: 8, weather: 9, wind: 7, wave: 6, mazume: 5, pressure: 4, moon: 3 } },
		];
		expect(averageBreakdown(scores)).toEqual({ tideCycle: 10, tideMovement: 8, weather: 9, wind: 7, wave: 6, mazume: 5, pressure: 4, moon: 3 });
	});

	it("rounds per-factor averages using Math.round", () => {
		// Two scores: breakdown values (10, 9) → avg 9.5 → rounds to 10
		const scores: HourlyScore[] = [
			{ date: "2026-04-04", hour: 6, score: 70, breakdown: { tideCycle: 10, tideMovement: 10, weather: 10, wind: 10, wave: 10, mazume: 10, pressure: 10, moon: 10 } },
			{ date: "2026-04-04", hour: 7, score: 60, breakdown: { tideCycle: 9, tideMovement: 9, weather: 9, wind: 9, wave: 9, mazume: 9, pressure: 9, moon: 9 } },
		];
		// avg = (10+9)/2 = 9.5 → Math.round → 10
		expect(averageBreakdown(scores)).toEqual({
			tideCycle: 10,
			tideMovement: 10,
			weather: 10,
			wind: 10,
			wave: 10,
			mazume: 10,
			pressure: 10,
			moon: 10,
		});
	});

	it("averages each factor independently", () => {
		const scores: HourlyScore[] = [
			{ date: "2026-04-04", hour: 6, score: 80, breakdown: { tideCycle: 20, tideMovement: 10, weather: 6, wind: 4, wave: 8, mazume: 0, pressure: 2, moon: 1 } },
			{ date: "2026-04-04", hour: 7, score: 40, breakdown: { tideCycle: 0, tideMovement: 10, weather: 2, wind: 4, wave: 0, mazume: 10, pressure: 2, moon: 3 } },
		];
		expect(averageBreakdown(scores)).toEqual({
			tideCycle: 10,
			tideMovement: 10,
			weather: 4,
			wind: 4,
			wave: 4,
			mazume: 5,
			pressure: 2,
			moon: 2,
		});
	});
});

// ---------------------------------------------------------------------------
// Spec validation: 2026/3/14 久ノ浜 must score × (0–39)
// ---------------------------------------------------------------------------

describe("spec validation: 2026-03-14 久ノ浜 × 判定", () => {
	it("scores × across all hours of the day with 若潮 + 荒天 conditions", () => {
		// All 24 hours on this day have bad conditions:
		// - 若潮 (poor tide cycle)
		// - Heavy rain + storm (weather code 65 / wind 12 m/s)
		// - High waves 2.8 m
		// - Dropping pressure
		// - Moon age ~25 (waning crescent — near new moon but not scoring high yet)
		const scores: HourlyScore[] = [];
		for (let hour = 0; hour < 24; hour++) {
			const s = calculateHourlyScore(
				{
					tideType: "若潮",
					hoursToNearestExtreme: 5,
					weatherCode: 65,
					windSpeed: 12,
					waveHeight: 2.8,
					mazumeScore: 0,
					pressure: 1002,
					pressurePrev3h: 1010,
					moonAge: 24.9,
				},
				DEFAULT_WEIGHTS,
				"2026-03-14",
				hour,
			);
			scores.push(s);
		}

		const summary = calculateDailySummary(scores);
		expect(summary).not.toBeNull();
		expect(summary?.label).toBe("×");
		expect(summary?.score).toBeLessThan(40);
	});

	it("mazume hours (dawn/dusk) still do not reach ○ on a bad day", () => {
		// Even with mazume boost, bad conditions should keep score below 60
		const dawnScore = calculateHourlyScore(
			{
				tideType: "若潮",
				hoursToNearestExtreme: 5,
				weatherCode: 65,
				windSpeed: 12,
				waveHeight: 2.8,
				mazumeScore: 10, // peak mazume
				pressure: 1002,
				pressurePrev3h: 1010,
				moonAge: 24.9,
			},
			DEFAULT_WEIGHTS,
			"2026-03-14",
			5,
		);
		expect(dawnScore.score).toBeLessThan(60);
	});
});
