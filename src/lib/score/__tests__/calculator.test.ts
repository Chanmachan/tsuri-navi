import { describe, expect, it } from "vitest";
import {
	calculateHourlyScore,
	scoreMazume,
	scoreMoon,
	scorePressure,
	scoreTideCycle,
	scoreTideMovement,
	scoreWave,
	scoreWeather,
	scoreWind,
} from "../calculator";
import { DEFAULT_WEIGHTS } from "../../../types/score";

describe("scoreTideCycle", () => {
	it("returns 1.0 for 大潮", () => expect(scoreTideCycle("大潮")).toBe(1.0));
	it("returns 0.75 for 中潮", () => expect(scoreTideCycle("中潮")).toBe(0.75));
	it("returns 0.4 for 小潮", () => expect(scoreTideCycle("小潮")).toBe(0.4));
	it("returns low value for 若潮", () => expect(scoreTideCycle("若潮")).toBeLessThan(0.3));
	it("returns low value for 長潮", () => expect(scoreTideCycle("長潮")).toBeLessThan(0.3));
});

describe("scoreTideMovement", () => {
	it("returns 1.0 within 1 hour of extreme", () => {
		expect(scoreTideMovement(0)).toBe(1.0);
		expect(scoreTideMovement(1)).toBe(1.0);
	});
	it("returns high value within 2 hours", () => {
		expect(scoreTideMovement(2)).toBeGreaterThan(0.5);
	});
	it("returns 0 at 5+ hours (slack water)", () => {
		expect(scoreTideMovement(5)).toBe(0.0);
		expect(scoreTideMovement(6)).toBe(0.0);
	});
});

describe("scoreWeather", () => {
	it("returns max for overcast (code 3)", () => expect(scoreWeather(3)).toBe(1.0));
	it("returns high for light drizzle (code 51)", () => expect(scoreWeather(51)).toBeGreaterThan(0.7));
	it("returns 0 for thunderstorm (code 95)", () => expect(scoreWeather(95)).toBe(0.0));
	it("returns low for heavy rain (code 65)", () => expect(scoreWeather(65)).toBeLessThan(0.2));
	it("returns 0.5 for null", () => expect(scoreWeather(null)).toBe(0.5));
});

describe("scoreWind", () => {
	it("returns 1.0 for ideal breeze (3 m/s)", () => expect(scoreWind(3)).toBe(1.0));
	it("returns 1.0 for 5 m/s", () => expect(scoreWind(5)).toBe(1.0));
	it("returns low for gale (15 m/s)", () => expect(scoreWind(15)).toBeLessThan(0.2));
	it("returns 0 for storm (20 m/s)", () => expect(scoreWind(20)).toBe(0.0));
	it("returns 0.5 for null", () => expect(scoreWind(null)).toBe(0.5));
});

describe("scoreWave", () => {
	it("returns 1.0 for ideal wave height (1.0 m)", () => expect(scoreWave(1.0)).toBe(1.0));
	it("returns 1.0 for 0.5 m", () => expect(scoreWave(0.5)).toBe(1.0));
	it("returns 0 for dangerous waves (3.0 m)", () => expect(scoreWave(3.0)).toBe(0.0));
	it("returns low for rough (2.5 m)", () => expect(scoreWave(2.5)).toBeLessThan(0.3));
	it("returns 0.5 for null", () => expect(scoreWave(null)).toBe(0.5));
});

describe("scoreMazume", () => {
	it("returns 1.0 for mazume score 10", () => expect(scoreMazume(10)).toBe(1.0));
	it("returns 0 for mazume score 0", () => expect(scoreMazume(0)).toBe(0.0));
	it("clamps values above 10", () => expect(scoreMazume(15)).toBe(1.0));
});

describe("scorePressure", () => {
	it("returns high for stable high pressure", () => {
		expect(scorePressure(1015, 1015)).toBeGreaterThan(0.7);
	});
	it("returns low for sharp pressure drop", () => {
		expect(scorePressure(1005, 1015)).toBeLessThan(0.2);
	});
	it("returns 0.5 for null current", () => {
		expect(scorePressure(null, null)).toBe(0.5);
	});
});

describe("scoreMoon", () => {
	it("returns 1.0 for new moon (age 0)", () => expect(scoreMoon(0)).toBe(1.0));
	it("returns 1.0 for full moon (age 15)", () => expect(scoreMoon(15)).toBe(1.0));
	it("returns low for half moon (age 7)", () => expect(scoreMoon(7)).toBe(0.2));
	it("returns 1.0 near new moon (age 28)", () => expect(scoreMoon(28)).toBe(1.0));
});

describe("calculateHourlyScore", () => {
	it("returns score in range 0-100", () => {
		const result = calculateHourlyScore(
			{
				tideType: "大潮",
				hoursToNearestExtreme: 1,
				weatherCode: 2,
				windSpeed: 3,
				waveHeight: 1.0,
				mazumeScore: 10,
				pressure: 1015,
				pressurePrev3h: 1015,
				moonAge: 0,
			},
			DEFAULT_WEIGHTS,
			"2026-04-04",
			6,
		);
		expect(result.score).toBeGreaterThanOrEqual(0);
		expect(result.score).toBeLessThanOrEqual(100);
	});

	it("returns high score for ideal conditions", () => {
		const result = calculateHourlyScore(
			{
				tideType: "大潮",
				hoursToNearestExtreme: 1,
				weatherCode: 2,
				windSpeed: 3,
				waveHeight: 1.0,
				mazumeScore: 10,
				pressure: 1016,
				pressurePrev3h: 1015,
				moonAge: 0,
			},
			DEFAULT_WEIGHTS,
			"2026-04-04",
			6,
		);
		expect(result.score).toBeGreaterThanOrEqual(80); // ◎
	});

	it("returns × (< 40) for 2026-03-14 久ノ浜 (若潮 + 荒天) at midday", () => {
		// 若潮 + heavy rain + strong wind + high waves + pressure drop + midday
		const result = calculateHourlyScore(
			{
				tideType: "若潮",
				hoursToNearestExtreme: 5, // slack water
				weatherCode: 65, // heavy rain
				windSpeed: 12, // gale
				waveHeight: 2.8, // rough
				mazumeScore: 0, // midday
				pressure: 1002,
				pressurePrev3h: 1010, // sharp drop
				moonAge: 24.9, // waning crescent
			},
			DEFAULT_WEIGHTS,
			"2026-03-14",
			12,
		);
		expect(result.score).toBeLessThan(40); // × rating
	});

	it("includes breakdown for all factors", () => {
		const result = calculateHourlyScore(
			{
				tideType: "中潮",
				hoursToNearestExtreme: 2,
				weatherCode: 1,
				windSpeed: 4,
				waveHeight: 1.0,
				mazumeScore: 5,
				pressure: 1013,
				pressurePrev3h: 1013,
				moonAge: 15,
			},
			DEFAULT_WEIGHTS,
			"2026-04-04",
			8,
		);
		const b = result.breakdown;
		expect(b.tideCycle).toBeGreaterThanOrEqual(0);
		expect(b.tideMovement).toBeGreaterThanOrEqual(0);
		expect(b.weather).toBeGreaterThanOrEqual(0);
		expect(b.wind).toBeGreaterThanOrEqual(0);
		expect(b.wave).toBeGreaterThanOrEqual(0);
		expect(b.mazume).toBeGreaterThanOrEqual(0);
		expect(b.pressure).toBeGreaterThanOrEqual(0);
		expect(b.moon).toBeGreaterThanOrEqual(0);
	});

	it("date and hour are passed through to result", () => {
		const result = calculateHourlyScore(
			{
				tideType: "大潮",
				hoursToNearestExtreme: 0,
				weatherCode: 2,
				windSpeed: 3,
				waveHeight: 1.0,
				mazumeScore: 10,
				pressure: 1015,
				pressurePrev3h: 1015,
				moonAge: 0,
			},
			DEFAULT_WEIGHTS,
			"2026-04-04",
			5,
		);
		expect(result.date).toBe("2026-04-04");
		expect(result.hour).toBe(5);
	});
});
