// Re-export the canonical scoreToLabel from types/score.ts to avoid duplicate
// implementations. The spec thresholds are ◎≥80, ○≥60, △≥40, ×<40.
export { scoreToLabel } from "../types/score";
export type ScoreLabel = "◎" | "○" | "△" | "×";

export function scoreToColor(score: number): string {
	if (score >= 80) return "text-green-600";
	if (score >= 60) return "text-blue-500";
	if (score >= 40) return "text-yellow-500";
	return "text-red-500";
}

/**
 * Format a date string (YYYY-MM-DD) to a localized Japanese display string.
 */
export function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("ja-JP", {
		year: "numeric",
		month: "long",
		day: "numeric",
		weekday: "short",
	});
}

/**
 * Return today's date string (YYYY-MM-DD) in Japan Standard Time (UTC+9).
 * Use this instead of `new Date().toISOString().slice(0,10)` which returns UTC.
 */
// en-CA locale reliably returns "YYYY-MM-DD" regardless of runtime locale.
const _jstDateFmt = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

export function getTodayJST(): string {
	return _jstDateFmt.format(new Date());
}

/**
 * Calculate moon age (days since new moon) for a given date.
 * Uses a simplified formula.
 */
export function calcMoonAge(date: Date): number {
	const knownNewMoon = new Date("2000-01-06T18:14:00Z");
	const lunarCycle = 29.530588853;
	const diffMs = date.getTime() - knownNewMoon.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	return ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
}
