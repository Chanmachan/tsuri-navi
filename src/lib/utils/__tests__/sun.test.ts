import { describe, expect, it } from "vitest";
import { getMazumeScore, getMazumeWindows, getSunTimes } from "../sun";

// Helper: parse "HH:MM" into total minutes from midnight
function toMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(":").map(Number);
	return (h ?? 0) * 60 + (m ?? 0);
}

// Helper: assert a time string is within [expectedHHMM ± toleranceMinutes]
function expectTimeInRange(
	actual: string,
	expectedHHMM: string,
	toleranceMinutes: number,
	label: string,
): void {
	const actualMin = toMinutes(actual);
	const expectedMin = toMinutes(expectedHHMM);
	const diff = Math.abs(actualMin - expectedMin);
	expect(diff, `${label}: got ${actual}, expected ~${expectedHHMM} ±${toleranceMinutes}min`).toBeLessThanOrEqual(
		toleranceMinutes,
	);
}

describe("getSunTimes", () => {
	describe("Iwaki (37.05°N, 140.97°E) on 2026-04-04", () => {
		const lat = 37.05;
		const lon = 140.97;
		const date = new Date("2026-04-04");

		it("sunrise should be approximately 05:20 JST (±15 min)", () => {
			const { sunrise } = getSunTimes(lat, lon, date);
			expectTimeInRange(sunrise, "05:20", 15, "Iwaki sunrise");
		});

		it("sunset should be approximately 18:07 JST (±15 min)", () => {
			const { sunset } = getSunTimes(lat, lon, date);
			expectTimeInRange(sunset, "18:07", 15, "Iwaki sunset");
		});

		it("solarNoon should be between sunrise and sunset", () => {
			const { sunrise, sunset, solarNoon } = getSunTimes(lat, lon, date);
			const srMin = toMinutes(sunrise);
			const ssMin = toMinutes(sunset);
			const snMin = toMinutes(solarNoon);
			expect(snMin).toBeGreaterThan(srMin);
			expect(snMin).toBeLessThan(ssMin);
		});
	});

	describe("Shikoku (33.55°N, 134.3°E) on 2026-04-04", () => {
		const lat = 33.55;
		const lon = 134.3;
		const date = new Date("2026-04-04");

		it("sunrise should be approximately 06:00 JST (±15 min)", () => {
			const { sunrise } = getSunTimes(lat, lon, date);
			expectTimeInRange(sunrise, "06:00", 15, "Shikoku sunrise");
		});

		it("Shikoku sunrise should be later than Iwaki sunrise (more westerly)", () => {
			const iwaki = getSunTimes(37.05, 140.97, date);
			const shikoku = getSunTimes(lat, lon, date);
			expect(toMinutes(shikoku.sunrise)).toBeGreaterThan(toMinutes(iwaki.sunrise));
		});
	});

	describe("Seasonal variation — winter date (2026-12-21)", () => {
		const lat = 37.05;
		const lon = 140.97;
		const winterDate = new Date("2026-12-21");
		const springDate = new Date("2026-04-04");

		it("winter sunrise should be later than spring sunrise", () => {
			const winter = getSunTimes(lat, lon, winterDate);
			const spring = getSunTimes(lat, lon, springDate);
			expect(toMinutes(winter.sunrise)).toBeGreaterThan(toMinutes(spring.sunrise));
		});

		it("winter sunset should be earlier than spring sunset", () => {
			const winter = getSunTimes(lat, lon, winterDate);
			const spring = getSunTimes(lat, lon, springDate);
			expect(toMinutes(winter.sunset)).toBeLessThan(toMinutes(spring.sunset));
		});
	});
});

describe("getMazumeWindows", () => {
	const lat = 37.05;
	const lon = 140.97;
	const date = new Date("2026-04-04");

	it("morningStart is 30 minutes before sunrise", () => {
		const { sunrise } = getSunTimes(lat, lon, date);
		const { morningStart } = getMazumeWindows(lat, lon, date);
		const diff = toMinutes(sunrise) - toMinutes(morningStart);
		expect(diff).toBe(30);
	});

	it("morningEnd is 30 minutes after sunrise", () => {
		const { sunrise } = getSunTimes(lat, lon, date);
		const { morningEnd } = getMazumeWindows(lat, lon, date);
		const diff = toMinutes(morningEnd) - toMinutes(sunrise);
		expect(diff).toBe(30);
	});

	it("eveningStart is 30 minutes before sunset", () => {
		const { sunset } = getSunTimes(lat, lon, date);
		const { eveningStart } = getMazumeWindows(lat, lon, date);
		const diff = toMinutes(sunset) - toMinutes(eveningStart);
		expect(diff).toBe(30);
	});

	it("eveningEnd is 30 minutes after sunset", () => {
		const { sunset } = getSunTimes(lat, lon, date);
		const { eveningEnd } = getMazumeWindows(lat, lon, date);
		const diff = toMinutes(eveningEnd) - toMinutes(sunset);
		expect(diff).toBe(30);
	});
});

describe("getMazumeScore", () => {
	const lat = 37.05;
	const lon = 140.97;
	const date = new Date("2026-04-04");

	it("returns 10 during sunrise hour (hour 5)", () => {
		// Iwaki sunrise is ~05:20, so hour=5 (05:30 midpoint) is within 30 min
		const score = getMazumeScore(lat, lon, date, 5);
		expect(score).toBe(10);
	});

	it("returns 10 during sunset hour (hour 18)", () => {
		// Iwaki sunset is ~18:07, so hour=18 (18:30 midpoint) is within 30 min
		const score = getMazumeScore(lat, lon, date, 18);
		expect(score).toBe(10);
	});

	it("returns 0 at noon (hour 12)", () => {
		const score = getMazumeScore(lat, lon, date, 12);
		expect(score).toBe(0);
	});

	it("returns 0 in the middle of the night (hour 1)", () => {
		const score = getMazumeScore(lat, lon, date, 1);
		expect(score).toBe(0);
	});

	it("returns 7 for hour just outside 30-min window but within 60 min of sunrise", () => {
		// Sunrise ~05:20; hour=4 midpoint is 04:30, diff = 50 min → score 7
		const score = getMazumeScore(lat, lon, date, 4);
		expect(score).toBe(7);
	});

	it("score is non-negative and at most 10", () => {
		for (let h = 0; h < 24; h++) {
			const score = getMazumeScore(lat, lon, date, h);
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(10);
		}
	});
});
