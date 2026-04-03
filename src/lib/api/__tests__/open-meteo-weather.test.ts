import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchWeatherForecast,
  type WeatherForecast,
} from "../open-meteo-weather";

const MOCK_API_RESPONSE = {
  latitude: 37.05,
  longitude: 140.97,
  timezone: "Asia/Tokyo",
  hourly: {
    time: ["2026-04-04T00:00", "2026-04-04T01:00"],
    temperature_2m: [12.3, 11.8],
    weather_code: [0, 1],
    wind_speed_10m: [3.5, 4.0],
    wind_direction_10m: [210, 215],
    precipitation: [0.0, 0.1],
    surface_pressure: [1013.2, 1012.8],
  },
};

function makeOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function makeErrorResponse(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({ error: statusText }),
  } as unknown as Response;
}

describe("fetchWeatherForecast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns parsed WeatherForecast on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeOkResponse(MOCK_API_RESPONSE)));

    const promise = fetchWeatherForecast(37.05, 140.97);
    await vi.runAllTimersAsync();
    const result: WeatherForecast = await promise;

    expect(result.latitude).toBe(37.05);
    expect(result.longitude).toBe(140.97);
    expect(result.timezone).toBe("Asia/Tokyo");
    expect(result.hourly).toHaveLength(2);
  });

  it("maps API fields to our type correctly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeOkResponse(MOCK_API_RESPONSE)));

    const promise = fetchWeatherForecast(37.05, 140.97);
    await vi.runAllTimersAsync();
    const result = await promise;

    const first = result.hourly[0];
    expect(first.time).toBe("2026-04-04T00:00");
    expect(first.temperature).toBe(12.3);
    expect(first.weatherCode).toBe(0);
    expect(first.windSpeed).toBe(3.5);
    expect(first.windDirection).toBe(210);
    expect(first.precipitation).toBe(0.0);
    expect(first.pressure).toBe(1013.2);

    const second = result.hourly[1];
    expect(second.time).toBe("2026-04-04T01:00");
    expect(second.temperature).toBe(11.8);
    expect(second.weatherCode).toBe(1);
    expect(second.windSpeed).toBe(4.0);
    expect(second.windDirection).toBe(215);
    expect(second.precipitation).toBe(0.1);
    expect(second.pressure).toBe(1012.8);
  });

  it("retries 3 times on network error then throws", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network failure"));
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchWeatherForecast(37.05, 140.97);
    promise.catch(() => {}); // suppress unhandled rejection during timer advancement
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow("Network failure");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("retries 3 times on 5xx error then throws", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(503, "Service Unavailable"));
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchWeatherForecast(37.05, 140.97);
    promise.catch(() => {}); // suppress unhandled rejection during timer advancement
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow("Open-Meteo API server error: 503");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on 400 error without retrying", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(400, "Bad Request"));
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchWeatherForecast(37.05, 140.97);
    promise.catch(() => {}); // suppress unhandled rejection during timer advancement
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow("Open-Meteo API client error: 400");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws immediately on 404 error without retrying", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(404, "Not Found"));
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchWeatherForecast(37.05, 140.97);
    promise.catch(() => {}); // suppress unhandled rejection during timer advancement
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow("Open-Meteo API client error: 404");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("succeeds on second attempt after one network failure", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce(makeOkResponse(MOCK_API_RESPONSE));
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchWeatherForecast(37.05, 140.97);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.latitude).toBe(37.05);
  });

  it("includes correct query parameters in the request URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(MOCK_API_RESPONSE));
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchWeatherForecast(35.68, 139.69);
    await vi.runAllTimersAsync();
    await promise;

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("latitude=35.68");
    expect(calledUrl).toContain("longitude=139.69");
    expect(calledUrl).toContain("timezone=Asia%2FTokyo");
    expect(calledUrl).toContain("forecast_days=7");
    expect(calledUrl).toContain("wind_speed_unit=ms");
    expect(calledUrl).toContain("temperature_2m");
    expect(calledUrl).toContain("weather_code");
    expect(calledUrl).toContain("wind_speed_10m");
  });
});
