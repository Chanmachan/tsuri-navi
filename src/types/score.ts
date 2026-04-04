/**
 * Score engine shared types.
 */

// ---------------------------------------------------------------------------
// Score weights (injectable for user customization)
// ---------------------------------------------------------------------------

export interface ScoreWeights {
	/** 潮回り (tide cycle) — spec default: 20 */
	tideCycle: number;
	/** 潮の動き — spec default: 15 */
	tideMovement: number;
	/** 天気 — spec default: 15 */
	weather: number;
	/** 風速 — spec default: 15 */
	wind: number;
	/** 波高 — spec default: 15 */
	wave: number;
	/** マズメ時間帯 — spec default: 10 */
	mazume: number;
	/** 気圧変化 — spec default: 5 */
	pressure: number;
	/** 月齢 — spec default: 5 */
	moon: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
	tideCycle: 20,
	tideMovement: 15,
	weather: 15,
	wind: 15,
	wave: 15,
	mazume: 10,
	pressure: 5,
	moon: 5,
};

// ---------------------------------------------------------------------------
// Score input (one hour's worth of data)
// ---------------------------------------------------------------------------

export interface HourlyScoreInput {
	/** 潮回り (tide cycle name) */
	tideType: string; // "大潮"|"中潮"|"小潮"|"長潮"|"若潮"
	/** Hours until the nearest high/low tide extreme (0 = at extreme) */
	hoursToNearestExtreme: number;
	/** Open-Meteo WMO weather code */
	weatherCode: number | null;
	/** Wind speed in m/s */
	windSpeed: number | null;
	/** Wave height in meters */
	waveHeight: number | null;
	/** Mazume score 0-10 (from getMazumeScore) */
	mazumeScore: number;
	/** Current pressure in hPa */
	pressure: number | null;
	/** Pressure 3 hours ago (for change calculation) */
	pressurePrev3h: number | null;
	/** Moon age 0-29.5 */
	moonAge: number;
}

// ---------------------------------------------------------------------------
// Score output
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
	tideCycle: number;
	tideMovement: number;
	weather: number;
	wind: number;
	wave: number;
	mazume: number;
	pressure: number;
	moon: number;
}

export interface HourlyScore {
	date: string; // YYYY-MM-DD
	hour: number; // 0-23
	score: number; // 0-100 integer
	breakdown: ScoreBreakdown;
}

export interface DailySummaryScore {
	date: string;
	score: number; // 0-100 integer, peak hourly score
	label: "◎" | "○" | "△" | "×";
	bestHour: number; // hour with highest score
	breakdown: ScoreBreakdown; // breakdown for best hour
}

// ---------------------------------------------------------------------------
// Score label
// ---------------------------------------------------------------------------

export function scoreToLabel(score: number): "◎" | "○" | "△" | "×" {
	if (score >= 80) return "◎";
	if (score >= 60) return "○";
	if (score >= 40) return "△";
	return "×";
}
