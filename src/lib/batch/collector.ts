/**
 * Data collection batch for a single fishing spot.
 * Fetches weather, marine, tide data and merges with astronomical calculations.
 */

import { fetchMarineForecast } from "../api/open-meteo-marine";
import { fetchWeatherForecast } from "../api/open-meteo-weather";
import { fetchTideData, findPortId } from "../api/tide736";
import { getMoonAge } from "../utils/moon";
import { getSunTimes } from "../utils/sun";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HourlyCollectedData {
	date: string; // YYYY-MM-DD
	hour: number; // 0-23
	// Weather
	weatherCode: number | null;
	temperature: number | null;
	windSpeed: number | null;
	windDirection: number | null;
	precipitation: number | null;
	pressure: number | null;
	// Marine
	waveHeight: number | null;
	swellHeight: number | null;
	// Tide
	tideLevel: number | null;
	tideType: "満潮" | "干潮" | null;
	// Astronomical
	sunrise: string | null; // "HH:MM"
	sunset: string | null; // "HH:MM"
	moonAge: number | null;
}

export interface DailyTideType {
	date: string; // YYYY-MM-DD
	tideType: string; // 潮回り e.g. "大潮"
}

export interface CollectedSpotData {
	spotId: number;
	hourly: HourlyCollectedData[];
	dailyTideTypes: DailyTideType[];
	errors: string[];
}

export interface SpotLocation {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// JST (UTC+9) date formatter — matches Open-Meteo's Asia/Tokyo timezone keys
const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

function toDateString(date: Date): string {
	return jstDateFormatter.format(date);
}

function addDays(date: Date, n: number): Date {
	const d = new Date(date);
	d.setUTCDate(d.getUTCDate() + n);
	return d;
}

/** Format "YYYY-MM-DDTHH:00" from date + hour (matching Open-Meteo time format) */
function toTimeKey(dateStr: string, hour: number): string {
	return `${dateStr}T${String(hour).padStart(2, "0")}:00`;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Collect all environmental data for a fishing spot.
 * Partial failures (e.g. tide API down) are recorded in `errors` rather than
 * throwing, so the caller still gets weather/marine data.
 *
 * @param spot    Spot with id, name, latitude, longitude
 * @param startDate  Start of the forecast window (defaults to today UTC)
 * @param days    Number of forecast days (default 7, max 7 per Open-Meteo)
 */
export async function collectSpotData(
	spot: SpotLocation,
	startDate: Date = new Date(),
	days = 7,
): Promise<CollectedSpotData> {
	if (!Number.isInteger(days) || days < 1 || days > 7) {
		throw new RangeError("days must be an integer between 1 and 7");
	}
	const errors: string[] = [];

	// ── Fetch weather + marine in parallel ─────────────────────────────────
	const [weatherResult, marineResult] = await Promise.allSettled([
		fetchWeatherForecast(spot.latitude, spot.longitude),
		fetchMarineForecast(spot.latitude, spot.longitude),
	]);

	if (weatherResult.status === "rejected") {
		errors.push(
			`Weather fetch failed: ${(weatherResult.reason as Error).message}`,
		);
	}
	if (marineResult.status === "rejected") {
		errors.push(
			`Marine fetch failed: ${(marineResult.reason as Error).message}`,
		);
	}

	const weather =
		weatherResult.status === "fulfilled" ? weatherResult.value : null;
	const marine =
		marineResult.status === "fulfilled" ? marineResult.value : null;

	// Build time-keyed lookup maps
	const weatherByTime = new Map<
		string,
		{
			weatherCode: number | null;
			temperature: number | null;
			windSpeed: number | null;
			windDirection: number | null;
			precipitation: number | null;
			pressure: number | null;
		}
	>();
	if (weather) {
		for (const h of weather.hourly) {
			weatherByTime.set(h.time, {
				weatherCode: h.weatherCode,
				temperature: h.temperature,
				windSpeed: h.windSpeed,
				windDirection: h.windDirection,
				precipitation: h.precipitation,
				pressure: h.pressure,
			});
		}
	}

	const marineByTime = new Map<
		string,
		{ waveHeight: number | null; swellHeight: number | null }
	>();
	if (marine) {
		for (const h of marine.hourly) {
			marineByTime.set(h.time, {
				waveHeight: h.waveHeight,
				swellHeight: h.swellHeight,
			});
		}
	}

	// ── Fetch tide data per day ─────────────────────────────────────────────
	const portId = findPortId(spot.name);
	const tideByDateHour = new Map<string, number>(); // "YYYY-MM-DD:HH" → level
	const tidePeakByDateHour = new Map<string, "満潮" | "干潮">(); // extreme times
	const dailyTideTypes: DailyTideType[] = [];

	if (portId) {
		const tidePromises = Array.from({ length: days }, (_, i) =>
			fetchTideData(portId, addDays(startDate, i)).then(
				(data) => ({ data, date: toDateString(addDays(startDate, i)) }),
				(err: Error) => ({ error: err.message, date: toDateString(addDays(startDate, i)) }),
			),
		);
		const tideResults = await Promise.all(tidePromises);

		for (const result of tideResults) {
			if ("error" in result) {
				errors.push(`Tide fetch failed for ${result.date}: ${result.error}`);
				continue;
			}
			const { data, date } = result;
			dailyTideTypes.push({ date, tideType: data.tideType });
			for (const point of data.hourly) {
				tideByDateHour.set(`${date}:${point.hour}`, point.level);
			}
			for (const extreme of data.extremes) {
				const hour = Number.parseInt(extreme.time.split(":")[0] ?? "0", 10);
				tidePeakByDateHour.set(
					`${date}:${hour}`,
					extreme.type === "high" ? "満潮" : "干潮",
				);
			}
		}
	} else {
		errors.push(`No port ID found for spot: ${spot.name}`);
	}

	// ── Assemble hourly rows ────────────────────────────────────────────────
	const hourly: HourlyCollectedData[] = [];

	for (let d = 0; d < days; d++) {
		const dayDate = addDays(startDate, d);
		const dateStr = toDateString(dayDate);

		// Sun times are per-day
		const sunTimes = getSunTimes(spot.latitude, spot.longitude, dayDate);
		// Normalize to noon JST to get a stable per-day moon age regardless of run time
		const moonAgeDate = new Date(dayDate);
		moonAgeDate.setUTCHours(3, 0, 0, 0); // 03:00 UTC = 12:00 JST
		const moonAge = getMoonAge(moonAgeDate);

		for (let hour = 0; hour < 24; hour++) {
			const timeKey = toTimeKey(dateStr, hour);
			const w = weatherByTime.get(timeKey);
			const m = marineByTime.get(timeKey);
			const tideKey = `${dateStr}:${hour}`;

			hourly.push({
				date: dateStr,
				hour,
				weatherCode: w?.weatherCode ?? null,
				temperature: w?.temperature ?? null,
				windSpeed: w?.windSpeed ?? null,
				windDirection: w?.windDirection ?? null,
				precipitation: w?.precipitation ?? null,
				pressure: w?.pressure ?? null,
				waveHeight: m?.waveHeight ?? null,
				swellHeight: m?.swellHeight ?? null,
				tideLevel: tideByDateHour.get(tideKey) ?? null,
				tideType: tidePeakByDateHour.get(tideKey) ?? null,
				sunrise: sunTimes.sunrise,
				sunset: sunTimes.sunset,
				moonAge,
			});
		}
	}

	return {
		spotId: spot.id,
		hourly,
		dailyTideTypes,
		errors,
	};
}
