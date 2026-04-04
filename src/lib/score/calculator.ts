/**
 * Score calculation — pure factor functions + main composer.
 *
 * Rules (from .claude/rules/score.md):
 * - Pure functions only: no side effects, no DB access
 * - Each factor in its own function
 * - Weights are injectable
 * - Returns breakdown alongside total
 * - All scores are integers 0-100
 */

import {
	DEFAULT_WEIGHTS,
	type HourlyScore,
	type HourlyScoreInput,
	type ScoreBreakdown,
	type ScoreWeights,
} from "../../types/score";

// ---------------------------------------------------------------------------
// Factor functions — each returns a ratio 0.0–1.0
// ---------------------------------------------------------------------------

/**
 * 潮回りスコア (tide cycle).
 * 大潮/中潮 → good, 小潮 → mediocre, 長潮/若潮 → bad.
 */
export function scoreTideCycle(tideType: string): number {
	switch (tideType) {
		case "大潮":
			return 1.0;
		case "中潮":
			return 0.75;
		case "小潮":
			return 0.4;
		case "長潮":
			return 0.1;
		case "若潮":
			return 0.15;
		default:
			return 0.5; // unknown
	}
}

/**
 * 潮の動きスコア (tide movement / hours to nearest extreme).
 * The 1–2 hours around high/low tide are best; slack water is worst.
 */
export function scoreTideMovement(hoursToNearestExtreme: number): number {
	const h = Math.abs(hoursToNearestExtreme);
	if (h <= 1) return 1.0; // within 1 h of extreme
	if (h <= 2) return 0.8;
	if (h <= 3) return 0.5;
	if (h <= 4) return 0.25;
	return 0.0; // near slack water
}

/**
 * 天気スコア (weather code — WMO standard codes).
 * Overcast / light rain → good; clear → moderate; heavy rain/thunder → bad.
 */
export function scoreWeather(code: number | null): number {
	if (code === null) return 0.5;
	// Clear sky
	if (code === 0) return 0.55;
	// Mainly clear / partly cloudy / overcast
	if (code <= 3) return 1.0;
	// Fog
	if (code <= 49) return 0.3;
	// Drizzle (light)
	if (code <= 53) return 0.85;
	// Drizzle (heavy)
	if (code <= 55) return 0.6;
	// Freezing drizzle
	if (code <= 57) return 0.2;
	// Rain (light)
	if (code <= 61) return 0.7;
	// Rain (moderate)
	if (code <= 63) return 0.4;
	// Rain (heavy)
	if (code <= 65) return 0.1;
	// Snow
	if (code <= 77) return 0.1;
	// Showers (light)
	if (code <= 81) return 0.6;
	// Showers (heavy)
	if (code <= 82) return 0.15;
	// Thunderstorm
	return 0.0;
}

/**
 * 風速スコア (wind speed in m/s).
 * Light breeze 2-5 m/s → best; calm or storm → bad.
 */
export function scoreWind(windSpeed: number | null): number {
	if (windSpeed === null) return 0.5;
	if (windSpeed < 0) return 0.5;
	if (windSpeed < 1) return 0.6; // dead calm
	if (windSpeed < 2) return 0.8;
	if (windSpeed <= 5) return 1.0; // ideal
	if (windSpeed <= 8) return 0.65;
	if (windSpeed <= 10) return 0.3;
	if (windSpeed <= 15) return 0.1;
	return 0.0; // gale
}

/**
 * 波高スコア (wave height in meters).
 * 0.5–1.5 m → ideal; < 0.5 m (too flat) or > 2.5 m (too rough) → bad.
 */
export function scoreWave(waveHeight: number | null): number {
	if (waveHeight === null) return 0.5;
	if (waveHeight < 0) return 0.5;
	if (waveHeight < 0.3) return 0.5; // flat — boring but not dangerous
	if (waveHeight < 0.5) return 0.75;
	if (waveHeight <= 1.5) return 1.0; // ideal
	if (waveHeight <= 2.0) return 0.6;
	if (waveHeight <= 2.5) return 0.25;
	return 0.0; // dangerous
}

/**
 * マズメスコア (mazume time score).
 * getMazumeScore() returns 0-10; normalise to 0.0-1.0.
 */
export function scoreMazume(mazumeScore: number): number {
	return Math.max(0, Math.min(10, mazumeScore)) / 10;
}

/**
 * 気圧変化スコア (pressure change over 3 h).
 * Stable high pressure → good; sharp drop → bad.
 */
export function scorePressure(
	current: number | null,
	prev3h: number | null,
): number {
	if (current === null) return 0.5;
	// High pressure stable
	if (prev3h === null) {
		return current >= 1013 ? 0.8 : 0.5;
	}
	const delta = current - prev3h; // positive = rising, negative = falling
	if (delta >= 0 && current >= 1013) return 1.0; // rising / stable high
	if (Math.abs(delta) < 2) return 0.8; // very stable
	if (Math.abs(delta) < 5) return 0.5; // slight change
	if (delta < -5) return 0.1; // sharp drop (approaching low)
	if (delta > 5) return 0.6; // rapid rise (recovering)
	return 0.3;
}

/**
 * 月齢スコア (moon age).
 * getMoonScore returns 1-5; normalise to 0.0-1.0.
 */
export function scoreMoon(moonAge: number): number {
	// 新月/満月 → 1.0; 半月 → 0.2
	if (moonAge <= 2 || moonAge >= 27) return 1.0;
	if (moonAge >= 13 && moonAge <= 17) return 1.0;
	if ((moonAge >= 6 && moonAge <= 9) || (moonAge >= 20 && moonAge <= 23))
		return 0.2;
	return 0.6;
}

// ---------------------------------------------------------------------------
// Main calculator
// ---------------------------------------------------------------------------

/**
 * Calculate hourly fishing score.
 * Returns an integer 0-100 and a full breakdown.
 */
export function calculateHourlyScore(
	input: HourlyScoreInput,
	weights: ScoreWeights = DEFAULT_WEIGHTS,
	date: string,
	hour: number,
): HourlyScore {
	const total =
		weights.tideCycle +
		weights.tideMovement +
		weights.weather +
		weights.wind +
		weights.wave +
		weights.mazume +
		weights.pressure +
		weights.moon;

	const breakdown: ScoreBreakdown = {
		tideCycle: Math.round(
			scoreTideCycle(input.tideType) * weights.tideCycle,
		),
		tideMovement: Math.round(
			scoreTideMovement(input.hoursToNearestExtreme) * weights.tideMovement,
		),
		weather: Math.round(scoreWeather(input.weatherCode) * weights.weather),
		wind: Math.round(scoreWind(input.windSpeed) * weights.wind),
		wave: Math.round(scoreWave(input.waveHeight) * weights.wave),
		mazume: Math.round(scoreMazume(input.mazumeScore) * weights.mazume),
		pressure: Math.round(
			scorePressure(input.pressure, input.pressurePrev3h) * weights.pressure,
		),
		moon: Math.round(scoreMoon(input.moonAge) * weights.moon),
	};

	const raw =
		breakdown.tideCycle +
		breakdown.tideMovement +
		breakdown.weather +
		breakdown.wind +
		breakdown.wave +
		breakdown.mazume +
		breakdown.pressure +
		breakdown.moon;

	// Normalise to 0-100 (weights may not sum to exactly 100 after rounding)
	const score = Math.round((raw / total) * 100);

	return { date, hour, score: Math.max(0, Math.min(100, score)), breakdown };
}
