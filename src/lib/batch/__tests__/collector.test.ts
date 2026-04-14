import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarineForecast } from "../../api/open-meteo-marine";
import type { WeatherForecast } from "../../api/open-meteo-weather";
import type { TideData } from "../../api/tide736";
import { collectSpotData } from "../collector";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../api/open-meteo-weather", () => ({
	fetchWeatherForecast: vi.fn(),
}));
vi.mock("../../api/open-meteo-marine", () => ({
	fetchMarineForecast: vi.fn(),
}));
vi.mock("../../api/tide736", () => ({
	fetchTideData: vi.fn(),
	findPortId: vi.fn(),
}));

import { fetchMarineForecast } from "../../api/open-meteo-marine";
import { fetchWeatherForecast } from "../../api/open-meteo-weather";
import { fetchTideData, findPortId } from "../../api/tide736";

const mockFetchWeather = vi.mocked(fetchWeatherForecast);
const mockFetchMarine = vi.mocked(fetchMarineForecast);
const mockFetchTide = vi.mocked(fetchTideData);
const mockFindPortId = vi.mocked(findPortId);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_SPOT = {
	id: 1,
	name: "久ノ浜漁港",
	latitude: 37.05,
	longitude: 140.97,
};

const TEST_DATE = new Date("2026-04-04T00:00:00Z");

function makeWeatherForecast(days = 1): WeatherForecast {
	const hourly = [];
	for (let d = 0; d < days; d++) {
		const dateStr = new Date(TEST_DATE.getTime() + d * 86400000).toISOString().split("T")[0];
		for (let h = 0; h < 24; h++) {
			hourly.push({
				time: `${dateStr}T${String(h).padStart(2, "0")}:00`,
				temperature: 15 + d,
				weatherCode: 1,
				windSpeed: 3.5,
				windDirection: 210,
				precipitation: 0,
				pressure: 1013,
			});
		}
	}
	return { latitude: 37.05, longitude: 140.97, timezone: "Asia/Tokyo", hourly };
}

function makeMarineForecast(days = 1): MarineForecast {
	const hourly = [];
	for (let d = 0; d < days; d++) {
		const dateStr = new Date(TEST_DATE.getTime() + d * 86400000).toISOString().split("T")[0];
		for (let h = 0; h < 24; h++) {
			hourly.push({
				time: `${dateStr}T${String(h).padStart(2, "0")}:00`,
				waveHeight: 0.8,
				swellHeight: 0.5,
				wavePeriod: 6.2,
				waveDirection: 180,
			});
		}
	}
	return { latitude: 37.05, longitude: 140.97, timezone: "Asia/Tokyo", hourly };
}

function makeTideData(date: string): TideData {
	return {
		portId: "6723",
		date,
		tideType: "大潮",
		moonAge: 14,
		hourly: Array.from({ length: 24 }, (_, i) => ({ hour: i, level: 100 + i })),
		extremes: [
			{ type: "high", time: "06:00", level: 180 },
			{ type: "low", time: "12:00", level: 20 },
		],
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("collectSpotData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindPortId.mockReturnValue("6723");
		mockFetchWeather.mockResolvedValue(makeWeatherForecast(7));
		mockFetchMarine.mockResolvedValue(makeMarineForecast(7));
		mockFetchTide.mockImplementation((_portId, date: Date) =>
			Promise.resolve(makeTideData(date.toISOString().split("T")[0] as string)),
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 7 * 24 = 168 hourly rows for a 7-day window", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 7);
		expect(result.hourly).toHaveLength(7 * 24);
	});

	it("sets correct date and hour on each row", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		expect(result.hourly[0].date).toBe("2026-04-04");
		expect(result.hourly[0].hour).toBe(0);
		expect(result.hourly[23].hour).toBe(23);
	});

	it("merges weather data into hourly rows", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		const row = result.hourly[0];
		expect(row.temperature).toBe(15);
		expect(row.windSpeed).toBe(3.5);
		expect(row.windDirection).toBe(210);
		expect(row.pressure).toBe(1013);
		expect(row.weatherCode).toBe(1);
	});

	it("merges marine data into hourly rows", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		const row = result.hourly[0];
		expect(row.waveHeight).toBe(0.8);
		expect(row.swellHeight).toBe(0.5);
	});

	it("merges tide level data into hourly rows", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		const row = result.hourly[0];
		expect(row.tideLevel).toBe(100); // 100 + hour(0)
	});

	it("marks tide extremes with tide type", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		const highRow = result.hourly.find((r) => r.hour === 6);
		const lowRow = result.hourly.find((r) => r.hour === 12);
		expect(highRow?.tideType).toBe("満潮");
		expect(lowRow?.tideType).toBe("干潮");
	});

	it("includes sunrise and sunset on each row", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		// Sunrise/sunset should be non-null strings in HH:MM format
		expect(result.hourly[0].sunrise).toMatch(/^\d{2}:\d{2}$/);
		expect(result.hourly[0].sunset).toMatch(/^\d{2}:\d{2}$/);
	});

	it("includes moon age on each row", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		expect(typeof result.hourly[0].moonAge).toBe("number");
		expect(result.hourly[0].moonAge).toBeGreaterThanOrEqual(0);
	});

	it("returns daily tide types", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 2);
		expect(result.dailyTideTypes).toHaveLength(2);
		expect(result.dailyTideTypes[0].tideType).toBe("大潮");
	});

	it("sets tideCycle on every hourly row from dailyTideTypes", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		expect(result.hourly.every((r) => r.tideCycle === "大潮")).toBe(true);
	});

	it("maps tideCycle per date for multi-day results", async () => {
		mockFetchTide.mockImplementation((_portId, date: Date) => {
			const dateStr = date.toISOString().split("T")[0];
			const tideType = dateStr === "2026-04-04" ? "大潮" : "中潮";
			return Promise.resolve({ ...makeTideData(dateStr), tideType });
		});
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 2);
		const day0 = result.hourly.filter((r) => r.date === "2026-04-04");
		const day1 = result.hourly.filter((r) => r.date === "2026-04-05");
		expect(day0).toHaveLength(24);
		expect(day0.every((r) => r.tideCycle === "大潮")).toBe(true);
		expect(day1).toHaveLength(24);
		expect(day1.every((r) => r.tideCycle === "中潮")).toBe(true);
	});

	it("sets tideCycle to null when port not found", async () => {
		mockFindPortId.mockReturnValue(undefined);
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		expect(result.hourly[0].tideCycle).toBeNull();
	});

	it("records error and returns empty tide data when port not found", async () => {
		mockFindPortId.mockReturnValue(undefined);
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toContain("No port ID found");
		expect(result.hourly[0].tideLevel).toBeNull();
	});

	it("records error but still returns weather data when tide fetch fails", async () => {
		mockFetchTide.mockRejectedValue(new Error("Tide API down"));
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		expect(result.errors.some((e) => e.includes("Tide fetch failed"))).toBe(true);
		// Weather data should still be present
		expect(result.hourly[0].temperature).toBe(15);
	});

	it("records error but still returns data when weather fetch fails", async () => {
		mockFetchWeather.mockRejectedValue(new Error("Weather API down"));
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		expect(result.errors.some((e) => e.includes("Weather fetch failed"))).toBe(true);
		// Marine data should still be present
		expect(result.hourly[0].waveHeight).toBe(0.8);
		expect(result.hourly[0].temperature).toBeNull();
	});

	it("sets spotId from the provided spot", async () => {
		const result = await collectSpotData(TEST_SPOT, TEST_DATE, 1);
		expect(result.spotId).toBe(1);
	});
});
