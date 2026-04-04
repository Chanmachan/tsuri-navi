import { describe, expect, it } from "vitest";
import { extractBestTime, extractBestTimes } from "../best-time";
import type { HourlyScore } from "../../../types/score";

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

describe("extractBestTime", () => {
	it("returns null for empty input", () => {
		expect(extractBestTime([])).toBeNull();
	});

	it("returns the hour with the highest score", () => {
		const scores = [
			makeScore("2026-04-04", 6, 75),
			makeScore("2026-04-04", 12, 40),
			makeScore("2026-04-04", 18, 80),
		];
		const result = extractBestTime(scores);
		expect(result?.bestHour).toBe(18);
		expect(result?.score).toBe(80);
	});

	it("returns top 3 hours by default", () => {
		const scores = [
			makeScore("2026-04-04", 5, 90),
			makeScore("2026-04-04", 6, 85),
			makeScore("2026-04-04", 12, 40),
			makeScore("2026-04-04", 18, 70),
		];
		const result = extractBestTime(scores);
		expect(result?.topHours).toHaveLength(3);
		expect(result?.topHours[0].score).toBe(90);
		expect(result?.topHours[1].score).toBe(85);
	});

	it("respects topN parameter", () => {
		const scores = [
			makeScore("2026-04-04", 5, 90),
			makeScore("2026-04-04", 6, 85),
			makeScore("2026-04-04", 18, 70),
		];
		const result = extractBestTime(scores, 2);
		expect(result?.topHours).toHaveLength(2);
	});
});

describe("extractBestTimes", () => {
	it("groups scores by date and returns one result per day", () => {
		const scores = [
			makeScore("2026-04-04", 6, 75),
			makeScore("2026-04-04", 18, 80),
			makeScore("2026-04-05", 5, 70),
			makeScore("2026-04-05", 12, 30),
		];
		const results = extractBestTimes(scores);
		expect(results).toHaveLength(2);
		expect(results[0].date).toBe("2026-04-04");
		expect(results[1].date).toBe("2026-04-05");
	});

	it("picks the best hour per day", () => {
		const scores = [
			makeScore("2026-04-04", 6, 75),
			makeScore("2026-04-04", 18, 80),
		];
		const results = extractBestTimes(scores);
		expect(results[0].bestHour).toBe(18);
	});

	it("returns results sorted by date", () => {
		const scores = [
			makeScore("2026-04-06", 6, 70),
			makeScore("2026-04-04", 6, 80),
			makeScore("2026-04-05", 6, 75),
		];
		const results = extractBestTimes(scores);
		expect(results.map((r) => r.date)).toEqual([
			"2026-04-04",
			"2026-04-05",
			"2026-04-06",
		]);
	});
});
