/**
 * Open-Meteo Weather API client.
 * Fetches 7-day hourly weather forecast for a given latitude/longitude.
 * Base URL: https://api.open-meteo.com/v1/forecast
 */

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

export interface WeatherHourly {
	time: string; // ISO datetime "2026-04-04T00:00"
	temperature: number | null;
	weatherCode: number | null;
	windSpeed: number | null; // m/s
	windDirection: number | null; // degrees
	precipitation: number | null; // mm
	pressure: number | null; // hPa
}

export interface WeatherForecast {
	latitude: number;
	longitude: number;
	timezone: string;
	hourly: WeatherHourly[];
}

export class WeatherApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
	) {
		super(message);
		this.name = "WeatherApiError";
	}
}

interface OpenMeteoHourly {
	time: string[];
	temperature_2m: (number | null)[];
	weather_code: (number | null)[];
	wind_speed_10m: (number | null)[];
	wind_direction_10m: (number | null)[];
	precipitation: (number | null)[];
	surface_pressure: (number | null)[];
}

interface OpenMeteoResponse {
	latitude: number;
	longitude: number;
	timezone: string;
	hourly: OpenMeteoHourly;
}

function buildUrl(latitude: number, longitude: number): string {
	const params = new URLSearchParams({
		latitude: String(latitude),
		longitude: String(longitude),
		hourly: [
			"temperature_2m",
			"weather_code",
			"wind_speed_10m",
			"wind_direction_10m",
			"precipitation",
			"surface_pressure",
		].join(","),
		timezone: "Asia/Tokyo",
		forecast_days: "7",
		wind_speed_unit: "ms",
	});
	return `${BASE_URL}?${params.toString()}`;
}

function parseResponse(data: OpenMeteoResponse): WeatherForecast {
	const { hourly } = data;
	const length = hourly.time.length;

	const hourlyData: WeatherHourly[] = [];
	for (let i = 0; i < length; i++) {
		hourlyData.push({
			time: hourly.time[i],
			temperature: hourly.temperature_2m[i] ?? null,
			weatherCode: hourly.weather_code[i] ?? null,
			windSpeed: hourly.wind_speed_10m[i] ?? null,
			windDirection: hourly.wind_direction_10m[i] ?? null,
			precipitation: hourly.precipitation[i] ?? null,
			pressure: hourly.surface_pressure[i] ?? null,
		});
	}

	return {
		latitude: data.latitude,
		longitude: data.longitude,
		timezone: data.timezone,
		hourly: hourlyData,
	};
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch 7-day hourly weather forecast from Open-Meteo.
 * Retries up to 3 times with exponential backoff on network errors or 5xx responses.
 * Throws WeatherApiError on 4xx errors.
 */
export async function fetchWeatherForecast(
	latitude: number,
	longitude: number,
): Promise<WeatherForecast> {
	const url = buildUrl(latitude, longitude);
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		if (attempt > 0) {
			await sleep(RETRY_DELAYS_MS[attempt - 1]);
		}

		let response: Response;
		try {
			response = await fetch(url);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error("Network request failed");
			continue;
		}

		if (response.ok) {
			const data = (await response.json()) as OpenMeteoResponse;
			return parseResponse(data);
		}

		if (response.status >= 400 && response.status < 500) {
			throw new WeatherApiError(
				`Open-Meteo API client error: ${response.status} ${response.statusText}`,
				response.status,
			);
		}

		// 5xx: retry
		lastError = new WeatherApiError(
			`Open-Meteo API server error: ${response.status} ${response.statusText}`,
			response.status,
		);
	}

	throw lastError ?? new WeatherApiError("Open-Meteo API request failed after retries");
}
