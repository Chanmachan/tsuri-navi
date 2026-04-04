/**
 * Open-Meteo Marine API client.
 * Docs: https://open-meteo.com/en/docs/marine-weather-api
 */

const MARINE_API_BASE_URL = "https://marine-api.open-meteo.com/v1/marine";

const HOURLY_VARIABLES = [
	"wave_height",
	"swell_wave_height",
	"wave_period",
	"wave_direction",
] as const;

const TIMEZONE = "Asia/Tokyo";
const FORECAST_DAYS = 7;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export interface MarineHourly {
	time: string; // ISO datetime "2026-04-04T00:00"
	waveHeight: number | null; // meters
	swellHeight: number | null; // meters
	wavePeriod: number | null; // seconds
	waveDirection: number | null; // degrees
}

export interface MarineForecast {
	latitude: number;
	longitude: number;
	timezone: string;
	hourly: MarineHourly[];
}

interface OpenMeteoMarineResponse {
	latitude: number;
	longitude: number;
	timezone: string;
	hourly: {
		time: string[];
		wave_height: (number | null)[];
		swell_wave_height: (number | null)[];
		wave_period: (number | null)[];
		wave_direction: (number | null)[];
	};
}

export class MarineApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = "MarineApiError";
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(latitude: number, longitude: number): string {
	const params = new URLSearchParams({
		latitude: latitude.toString(),
		longitude: longitude.toString(),
		hourly: HOURLY_VARIABLES.join(","),
		timezone: TIMEZONE,
		forecast_days: FORECAST_DAYS.toString(),
	});
	return `${MARINE_API_BASE_URL}?${params.toString()}`;
}

function parseResponse(raw: OpenMeteoMarineResponse): MarineForecast {
	const { time, wave_height, swell_wave_height, wave_period, wave_direction } =
		raw.hourly;

	const hourly: MarineHourly[] = time.map((t, i) => ({
		time: t,
		waveHeight: wave_height[i] ?? null,
		swellHeight: swell_wave_height[i] ?? null,
		wavePeriod: wave_period[i] ?? null,
		waveDirection: wave_direction[i] ?? null,
	}));

	return {
		latitude: raw.latitude,
		longitude: raw.longitude,
		timezone: raw.timezone,
		hourly,
	};
}

export async function fetchMarineForecast(
	latitude: number,
	longitude: number,
): Promise<MarineForecast> {
	const url = buildUrl(latitude, longitude);
	let lastError: unknown;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		if (attempt > 0) {
			const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
			await sleep(delayMs);
		}

		let response: Response;
		try {
			response = await fetch(url);
		} catch (networkError) {
			lastError = networkError;
			// Network errors are retried
			continue;
		}

		if (response.ok) {
			const raw = (await response.json()) as OpenMeteoMarineResponse;
			return parseResponse(raw);
		}

		if (response.status >= 400 && response.status < 500) {
			// 4xx errors are not retried
			throw new MarineApiError(
				`Marine API returned ${response.status}: ${response.statusText}`,
				response.status,
			);
		}

		// 5xx errors are retried
		lastError = new MarineApiError(
			`Marine API returned ${response.status}: ${response.statusText}`,
			response.status,
		);
	}

	if (lastError instanceof Error) {
		throw lastError;
	}
	throw new Error("fetchMarineForecast failed after retries");
}
