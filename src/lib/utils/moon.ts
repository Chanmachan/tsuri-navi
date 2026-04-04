/**
 * Moon age (月齢) calculation utilities.
 * Moon age 0 = new moon, ~15 = full moon, range 0–29.5
 */

import { calcMoonAge } from "../utils";

/**
 * Calculate moon age (月齢) for a given date.
 * Delegates to the shared calcMoonAge() in src/lib/utils.ts.
 */
export function getMoonAge(date: Date): number {
	return calcMoonAge(date);
}

/**
 * Get moon phase name in Japanese based on moon age.
 * Returns one of: "新月", "三日月", "上弦の月", "十三夜", "満月", "十六夜", "下弦の月", "晦日"
 */
export function getMoonPhaseName(moonAge: number): string {
	if (moonAge < 1.5) return "新月";
	if (moonAge < 7) return "三日月";
	if (moonAge < 9.5) return "上弦の月";
	if (moonAge < 13) return "十三夜";
	if (moonAge < 16.5) return "満月";
	if (moonAge < 19) return "十六夜";
	if (moonAge < 23.5) return "下弦の月";
	return "晦日";
}

/**
 * Calculate moon score for fishing (0–5 scale).
 *
 * Score breakdown:
 * - moonAge 0–2 or 27–29: 5 (新月付近)
 * - moonAge 13–17: 5 (満月付近)
 * - moonAge 6–9 or 20–23: 1 (半月付近 = 上弦/下弦)
 * - others: 3
 */
export function getMoonScore(moonAge: number): number {
	if (moonAge <= 2 || moonAge >= 27) return 5;
	if (moonAge >= 13 && moonAge <= 17) return 5;
	if ((moonAge >= 6 && moonAge <= 9) || (moonAge >= 20 && moonAge <= 23)) return 1;
	return 3;
}
