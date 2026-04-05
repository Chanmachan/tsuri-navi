import { describe, expect, it } from "vitest";
import { haversineKm } from "../haversine";

describe("haversineKm", () => {
	it("same point returns 0", () => {
		expect(haversineKm(35.6895, 139.6917, 35.6895, 139.6917)).toBeCloseTo(0, 5);
	});

	it("Tokyo to Osaka is approximately 400km", () => {
		// Tokyo: 35.6895, 139.6917 / Osaka: 34.6937, 135.5023
		const dist = haversineKm(35.6895, 139.6917, 34.6937, 135.5023);
		expect(dist).toBeGreaterThan(390);
		expect(dist).toBeLessThan(420);
	});

	it("nearby points within 10km", () => {
		// Approximately 1 degree latitude ≈ 111km, so 0.05 deg ≈ 5.5km
		const dist = haversineKm(37.0, 141.0, 37.05, 141.0);
		expect(dist).toBeCloseTo(5.56, 0);
	});

	it("is symmetric", () => {
		const d1 = haversineKm(35.0, 135.0, 36.0, 136.0);
		const d2 = haversineKm(36.0, 136.0, 35.0, 135.0);
		expect(d1).toBeCloseTo(d2, 10);
	});
});
