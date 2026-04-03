/**
 * Score label mapping for fishing condition scores (0–100).
 */
export type ScoreLabel = "◎" | "○" | "△" | "×";

export function scoreToLabel(score: number): ScoreLabel {
	if (score >= 75) return "◎";
	if (score >= 50) return "○";
	if (score >= 25) return "△";
	return "×";
}

export function scoreToColor(score: number): string {
	if (score >= 75) return "text-green-600";
	if (score >= 50) return "text-blue-500";
	if (score >= 25) return "text-yellow-500";
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
