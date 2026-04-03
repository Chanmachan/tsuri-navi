import { describe, expect, it } from "vitest";
import { calcMoonAge, formatDate, scoreToColor, scoreToLabel } from "./utils";

describe("scoreToLabel", () => {
	it("returns ◎ for scores >= 75", () => {
		expect(scoreToLabel(75)).toBe("◎");
		expect(scoreToLabel(100)).toBe("◎");
	});

	it("returns ○ for scores 50–74", () => {
		expect(scoreToLabel(50)).toBe("○");
		expect(scoreToLabel(74)).toBe("○");
	});

	it("returns △ for scores 25–49", () => {
		expect(scoreToLabel(25)).toBe("△");
		expect(scoreToLabel(49)).toBe("△");
	});

	it("returns × for scores < 25", () => {
		expect(scoreToLabel(0)).toBe("×");
		expect(scoreToLabel(24)).toBe("×");
	});
});

describe("scoreToColor", () => {
	it("returns green for high scores", () => {
		expect(scoreToColor(80)).toBe("text-green-600");
	});

	it("returns blue for medium-high scores", () => {
		expect(scoreToColor(60)).toBe("text-blue-500");
	});

	it("returns yellow for medium-low scores", () => {
		expect(scoreToColor(30)).toBe("text-yellow-500");
	});

	it("returns red for low scores", () => {
		expect(scoreToColor(10)).toBe("text-red-500");
	});
});

describe("formatDate", () => {
	it("returns a Japanese date string", () => {
		const result = formatDate("2026-03-14");
		expect(result).toContain("2026");
		expect(result).toContain("3");
		expect(result).toContain("14");
	});
});

describe("calcMoonAge", () => {
	it("returns a value between 0 and 29.53", () => {
		const age = calcMoonAge(new Date("2026-03-14"));
		expect(age).toBeGreaterThanOrEqual(0);
		expect(age).toBeLessThan(29.531);
	});

	it("returns ~0 for a known new moon date", () => {
		// 2000-01-06 was a new moon
		const age = calcMoonAge(new Date("2000-01-06T18:14:00Z"));
		expect(age).toBeCloseTo(0, 0);
	});
});
