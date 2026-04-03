import { describe, expect, it } from "vitest";
import { getMoonAge, getMoonPhaseName, getMoonScore } from "../moon";

describe("getMoonAge", () => {
	it("returns a value in range [0, 29.53059)", () => {
		const dates = [
			new Date("2026-03-14T00:00:00Z"),
			new Date("2026-03-29T00:00:00Z"),
			new Date("2026-04-04T00:00:00Z"),
			new Date("2000-01-06T18:14:00Z"),
		];
		for (const date of dates) {
			const age = getMoonAge(date);
			expect(age).toBeGreaterThanOrEqual(0);
			expect(age).toBeLessThan(29.53059);
		}
	});

	it("returns ~0 for the reference new moon date (2000-01-06T18:14:00Z)", () => {
		const age = getMoonAge(new Date("2000-01-06T18:14:00Z"));
		expect(age).toBeCloseTo(0, 5);
	});

	it("returns ~23-26 for 2026-03-14 (waning crescent / 小潮〜若潮)", () => {
		// 2026-03-14 is referenced in spec as a 若潮 day (久ノ浜 ×).
		// Based on the reference new moon (2000-01-06T18:14Z), moon age is ~24-25 (waning crescent).
		const age = getMoonAge(new Date("2026-03-14T00:00:00Z"));
		expect(age).toBeGreaterThanOrEqual(23);
		expect(age).toBeLessThanOrEqual(26);
	});

	it("returns ~9-12 for 2026-03-29 (waxing gibbous / 上弦後)", () => {
		// ~10 days past the new moon that occurred around 2026-03-18
		const age = getMoonAge(new Date("2026-03-29T00:00:00Z"));
		expect(age).toBeGreaterThanOrEqual(9);
		expect(age).toBeLessThanOrEqual(12);
	});

	it("returns ~15-18 for 2026-04-04 (waning gibbous / 満月後)", () => {
		// ~16 days into the lunar cycle that started around 2026-03-18
		const age = getMoonAge(new Date("2026-04-04T00:00:00Z"));
		expect(age).toBeGreaterThanOrEqual(15);
		expect(age).toBeLessThanOrEqual(18);
	});
});

describe("getMoonPhaseName", () => {
	it('returns "新月" for age 0', () => {
		expect(getMoonPhaseName(0)).toBe("新月");
	});

	it('returns "新月" for age 1', () => {
		expect(getMoonPhaseName(1)).toBe("新月");
	});

	it('returns "三日月" for age 3', () => {
		expect(getMoonPhaseName(3)).toBe("三日月");
	});

	it('returns "上弦の月" for age 8', () => {
		expect(getMoonPhaseName(8)).toBe("上弦の月");
	});

	it('returns "十三夜" for age 12', () => {
		expect(getMoonPhaseName(12)).toBe("十三夜");
	});

	it('returns "満月" for age 15', () => {
		expect(getMoonPhaseName(15)).toBe("満月");
	});

	it('returns "十六夜" for age 17', () => {
		expect(getMoonPhaseName(17)).toBe("十六夜");
	});

	it('returns "下弦の月" for age 22', () => {
		expect(getMoonPhaseName(22)).toBe("下弦の月");
	});

	it('returns "晦日" for age 28', () => {
		expect(getMoonPhaseName(28)).toBe("晦日");
	});
});

describe("getMoonScore", () => {
	it("returns 5 for new moon (age 0)", () => {
		expect(getMoonScore(0)).toBe(5);
	});

	it("returns 5 for new moon (age 2)", () => {
		expect(getMoonScore(2)).toBe(5);
	});

	it("returns 5 for new moon approach (age 27-29)", () => {
		expect(getMoonScore(27)).toBe(5);
		expect(getMoonScore(29)).toBe(5);
	});

	it("returns 5 for full moon (age 14-15)", () => {
		expect(getMoonScore(14)).toBe(5);
		expect(getMoonScore(15)).toBe(5);
	});

	it("returns 5 for full moon range (age 13-17)", () => {
		expect(getMoonScore(13)).toBe(5);
		expect(getMoonScore(17)).toBe(5);
	});

	it("returns 1 for half moon / 上弦 (age 7-8)", () => {
		expect(getMoonScore(7)).toBe(1);
		expect(getMoonScore(8)).toBe(1);
	});

	it("returns 1 for half moon / 下弦 (age 20-23)", () => {
		expect(getMoonScore(20)).toBe(1);
		expect(getMoonScore(23)).toBe(1);
	});

	it("returns 3 for intermediate ages", () => {
		expect(getMoonScore(4)).toBe(3);
		expect(getMoonScore(10)).toBe(3);
		expect(getMoonScore(18)).toBe(3);
		expect(getMoonScore(25)).toBe(3);
	});
});
