import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	MarineApiError,
	fetchMarineForecast,
} from "../open-meteo-marine";

const MOCK_RESPONSE = {
	latitude: 35.68,
	longitude: 139.69,
	timezone: "Asia/Tokyo",
	hourly: {
		time: ["2026-04-04T00:00", "2026-04-04T01:00", "2026-04-04T02:00"],
		wave_height: [0.8, 0.9, null],
		swell_wave_height: [0.5, 0.6, null],
		wave_period: [6.2, 6.5, null],
		wave_direction: [180, 185, null],
	},
};

function makeFetchResponse(
	body: unknown,
	status = 200,
	statusText = "OK",
): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText,
		json: () => Promise.resolve(body),
	} as unknown as Response;
}

describe("fetchMarineForecast", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("parses a successful response correctly", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeFetchResponse(MOCK_RESPONSE)));

		const promise = fetchMarineForecast(35.68, 139.69);
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result.latitude).toBe(35.68);
		expect(result.longitude).toBe(139.69);
		expect(result.timezone).toBe("Asia/Tokyo");
		expect(result.hourly).toHaveLength(3);

		const first = result.hourly[0];
		expect(first.time).toBe("2026-04-04T00:00");
		expect(first.waveHeight).toBe(0.8);
		expect(first.swellHeight).toBe(0.5);
		expect(first.wavePeriod).toBe(6.2);
		expect(first.waveDirection).toBe(180);
	});

	it("maps null values in the API response to null", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeFetchResponse(MOCK_RESPONSE)));

		const promise = fetchMarineForecast(35.68, 139.69);
		await vi.runAllTimersAsync();
		const result = await promise;

		const third = result.hourly[2];
		expect(third.waveHeight).toBeNull();
		expect(third.swellHeight).toBeNull();
		expect(third.wavePeriod).toBeNull();
		expect(third.waveDirection).toBeNull();
	});

	it("retries on network error and calls fetch 3 times total", async () => {
		const mockFetch = vi
			.fn()
			.mockRejectedValue(new TypeError("Failed to fetch"));
		vi.stubGlobal("fetch", mockFetch);

		const promise = fetchMarineForecast(35.68, 139.69);
		promise.catch(() => {}); // suppress unhandled rejection during timer advancement
		// Advance timers to cover all retry delays (1s + 2s)
		await vi.runAllTimersAsync();

		await expect(promise).rejects.toThrow("Failed to fetch");
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it("retries on 503 response and calls fetch 3 times total", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValue(makeFetchResponse(null, 503, "Service Unavailable"));
		vi.stubGlobal("fetch", mockFetch);

		const promise = fetchMarineForecast(35.68, 139.69);
		promise.catch(() => {}); // suppress unhandled rejection during timer advancement
		await vi.runAllTimersAsync();

		await expect(promise).rejects.toBeInstanceOf(MarineApiError);
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it("throws immediately on 400 response without retrying", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValue(makeFetchResponse(null, 400, "Bad Request"));
		vi.stubGlobal("fetch", mockFetch);

		const promise = fetchMarineForecast(35.68, 139.69);
		promise.catch(() => {}); // suppress unhandled rejection during timer advancement
		await vi.runAllTimersAsync();

		await expect(promise).rejects.toBeInstanceOf(MarineApiError);
		await expect(
			fetchMarineForecast(35.68, 139.69).catch((e) => e),
		).resolves.toMatchObject({ status: 400 });
		// Only 1 call for the first invocation (the second call above adds 1 more)
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("builds the correct request URL", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValue(makeFetchResponse(MOCK_RESPONSE));
		vi.stubGlobal("fetch", mockFetch);

		const promise = fetchMarineForecast(35.68, 139.69);
		await vi.runAllTimersAsync();
		await promise;

		const calledUrl: string = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("marine-api.open-meteo.com");
		expect(calledUrl).toContain("latitude=35.68");
		expect(calledUrl).toContain("longitude=139.69");
		expect(calledUrl).toContain("timezone=Asia%2FTokyo");
		expect(calledUrl).toContain("forecast_days=7");
		expect(calledUrl).toContain("wave_height");
	});
});
