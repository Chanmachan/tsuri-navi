/**
 * Sunrise/sunset calculation utilities using the NOAA Solar Calculator algorithm.
 * Reference: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 *
 * All returned times are in JST (UTC+9).
 */

const JST_OFFSET_HOURS = 9;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export interface SunTimes {
	/** "HH:MM" in local time (JST = UTC+9) */
	sunrise: string;
	/** "HH:MM" in local time */
	sunset: string;
	/** "HH:MM" in local time */
	solarNoon: string;
}

export interface MazumeWindow {
	/** 30 min before sunrise */
	morningStart: string;
	/** 30 min after sunrise */
	morningEnd: string;
	/** 30 min before sunset */
	eveningStart: string;
	/** 30 min after sunset */
	eveningEnd: string;
}

/**
 * Convert a Date to Julian Day Number.
 */
function toJulianDay(date: Date): number {
	const utcYear = date.getUTCFullYear();
	const utcMonth = date.getUTCMonth() + 1;
	const utcDay =
		date.getUTCDate() +
		date.getUTCHours() / 24 +
		date.getUTCMinutes() / 1440 +
		date.getUTCSeconds() / 86400;

	// Algorithm from Jean Meeus "Astronomical Algorithms"
	let Y = utcYear;
	let M = utcMonth;
	if (M <= 2) {
		Y -= 1;
		M += 12;
	}
	const A = Math.floor(Y / 100);
	const B = 2 - A + Math.floor(A / 4);
	return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + utcDay + B - 1524.5;
}

/**
 * Format total minutes (from midnight UTC) offset by JST into "HH:MM".
 */
function minutesToHHMM(totalMinutesUTC: number): string {
	const totalMinutesJST = totalMinutesUTC + JST_OFFSET_HOURS * 60;
	// Normalize to [0, 1440)
	const normalized = ((totalMinutesJST % 1440) + 1440) % 1440;
	const h = Math.floor(normalized / 60);
	const m = Math.round(normalized % 60);
	// Handle rounding overflow
	if (m === 60) {
		const hAdj = (h + 1) % 24;
		return `${String(hAdj).padStart(2, "0")}:00`;
	}
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Add or subtract minutes from an "HH:MM" string, returning a new "HH:MM" string.
 */
function addMinutesToHHMM(hhmm: string, deltaMinutes: number): string {
	const [hStr, mStr] = hhmm.split(":");
	const totalMinutes = parseInt(hStr ?? "0", 10) * 60 + parseInt(mStr ?? "0", 10) + deltaMinutes;
	const normalized = ((totalMinutes % 1440) + 1440) % 1440;
	const h = Math.floor(normalized / 60);
	const m = normalized % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Calculate sunrise and sunset times for a given location and date.
 * Uses the NOAA Solar Calculator algorithm.
 *
 * @param latitude  - degrees (positive = N)
 * @param longitude - degrees (positive = E)
 * @param date      - the date to calculate for
 * @returns SunTimes in JST (UTC+9)
 */
export function getSunTimes(latitude: number, longitude: number, date: Date): SunTimes {
	// Use noon UTC of the given UTC calendar date to get the Julian Day
	// without depending on the runtime's local timezone.
	const noon = new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
			12,
			0,
			0,
		),
	);
	const JD = toJulianDay(noon);

	// Julian Century
	const T = (JD - 2451545.0) / 36525.0;

	// Geometric Mean Longitude of the Sun (degrees)
	const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;

	// Geometric Mean Anomaly of the Sun (degrees)
	const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);

	// Equation of Center
	const Mrad = M * DEG_TO_RAD;
	const C =
		Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
		Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T) +
		Math.sin(3 * Mrad) * 0.000289;

	// Sun's True Longitude (degrees)
	const sunLon = L0 + C;

	// Sun's Apparent Longitude (degrees)
	const omega = 125.04 - 1934.136 * T;
	const lambda = sunLon - 0.00569 - 0.00478 * Math.sin(omega * DEG_TO_RAD);

	// Mean Obliquity of the Ecliptic (degrees)
	const epsilon0 =
		23.0 +
		26.0 / 60.0 +
		21.448 / 3600.0 -
		(46.815 / 3600.0) * T -
		(0.00059 / 3600.0) * T * T +
		(0.001813 / 3600.0) * T * T * T;

	// Corrected Obliquity
	const epsilonCorr = epsilon0 + 0.00256 * Math.cos(omega * DEG_TO_RAD);

	// Solar Declination (degrees)
	const declinationRad = Math.asin(Math.sin(epsilonCorr * DEG_TO_RAD) * Math.sin(lambda * DEG_TO_RAD));

	// Equation of Time (minutes)
	const y = Math.tan((epsilonCorr / 2) * DEG_TO_RAD) ** 2;
	const L0rad = L0 * DEG_TO_RAD;
	const Mrad2 = M * DEG_TO_RAD;
	const ecc = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
	const EqT =
		4 *
		RAD_TO_DEG *
		(y * Math.sin(2 * L0rad) -
			2 * ecc * Math.sin(Mrad2) +
			4 * ecc * y * Math.sin(Mrad2) * Math.cos(2 * L0rad) -
			0.5 * y * y * Math.sin(4 * L0rad) -
			1.25 * ecc * ecc * Math.sin(2 * Mrad2));

	// Hour Angle for sunrise/sunset (degrees)
	// Solar zenith angle at sunrise/sunset = 90.833° (accounts for atmospheric refraction + solar disk size)
	const latRad = latitude * DEG_TO_RAD;
	const cosHA =
		(Math.cos(90.833 * DEG_TO_RAD) - Math.sin(latRad) * Math.sin(declinationRad)) /
		(Math.cos(latRad) * Math.cos(declinationRad));

	// Clamp to handle polar day/night
	const cosHAClamped = Math.max(-1, Math.min(1, cosHA));
	const HA = Math.acos(cosHAClamped) * RAD_TO_DEG;

	// Solar Noon in minutes from midnight UTC
	const solarNoonMinutesUTC = 720 - 4 * longitude - EqT;

	// Sunrise and sunset in minutes from midnight UTC
	const sunriseMinutesUTC = solarNoonMinutesUTC - 4 * HA;
	const sunsetMinutesUTC = solarNoonMinutesUTC + 4 * HA;

	return {
		sunrise: minutesToHHMM(sunriseMinutesUTC),
		sunset: minutesToHHMM(sunsetMinutesUTC),
		solarNoon: minutesToHHMM(solarNoonMinutesUTC),
	};
}

/**
 * Get the mazume (マズメ) time windows — peak fishing times around dawn/dusk.
 * Mazume is the 30-minute window before and after sunrise/sunset.
 */
export function getMazumeWindows(latitude: number, longitude: number, date: Date): MazumeWindow {
	const { sunrise, sunset } = getSunTimes(latitude, longitude, date);

	return {
		morningStart: addMinutesToHHMM(sunrise, -30),
		morningEnd: addMinutesToHHMM(sunrise, 30),
		eveningStart: addMinutesToHHMM(sunset, -30),
		eveningEnd: addMinutesToHHMM(sunset, 30),
	};
}

/**
 * Parse "HH:MM" into total minutes from midnight.
 */
function hhmmToMinutes(hhmm: string): number {
	const [hStr, mStr] = hhmm.split(":");
	return parseInt(hStr ?? "0", 10) * 60 + parseInt(mStr ?? "0", 10);
}

/**
 * Check if a given hour (0-23) is within a mazume window.
 * Returns a score 0-10:
 * - 10: within 30 min of sunrise or sunset
 * - 7:  within 60 min of sunrise or sunset
 * - 3:  within 120 min of sunrise or sunset
 * - 0:  outside mazume windows
 */
export function getMazumeScore(
	latitude: number,
	longitude: number,
	date: Date,
	hour: number,
): number {
	const { sunrise, sunset } = getSunTimes(latitude, longitude, date);

	// Use the midpoint of the given hour (hour:30) for scoring
	const checkMinutes = hour * 60 + 30;

	const sunriseMinutes = hhmmToMinutes(sunrise);
	const sunsetMinutes = hhmmToMinutes(sunset);

	const diffFromSunrise = Math.abs(checkMinutes - sunriseMinutes);
	const diffFromSunset = Math.abs(checkMinutes - sunsetMinutes);
	const minDiff = Math.min(diffFromSunrise, diffFromSunset);

	if (minDiff <= 30) return 10;
	if (minDiff <= 60) return 7;
	if (minDiff <= 120) return 3;
	return 0;
}
