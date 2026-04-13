import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/route";

vi.mock("@/src/lib/db/search", () => ({
	searchSpotsByDistance: vi.fn().mockReturnValue([]),
}));

vi.mock("@/src/lib/db/settings", () => ({
	getSettings: vi.fn().mockReturnValue({
		home_latitude: null,
		home_longitude: null,
	}),
}));

import { searchSpotsByDistance } from "@/src/lib/db/search";
import { getSettings } from "@/src/lib/db/settings";

const mockSearch = vi.mocked(searchSpotsByDistance);
const mockGetSettings = vi.mocked(getSettings);

function makeRequest(params: Record<string, string>): NextRequest {
	const url = new URL("http://localhost/api/search");
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	return new NextRequest(url);
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/search", () => {
	it("returns 400 with home_location_not_set when no location provided", async () => {
		const res = await GET(makeRequest({ date: "2026-04-14", maxDistanceKm: "50" }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe("home_location_not_set");
	});

	it("uses homeLat/homeLng from query params when provided", async () => {
		const res = await GET(
			makeRequest({
				date: "2026-04-14",
				maxDistanceKm: "50",
				homeLat: "37.05",
				homeLng: "140.97",
			}),
		);
		expect(res.status).toBe(200);
		expect(mockSearch).toHaveBeenCalledWith(37.05, 140.97, "2026-04-14", 50);
		expect(mockGetSettings).not.toHaveBeenCalled();
	});

	it("falls back to DB settings when query params are absent", async () => {
		mockGetSettings.mockReturnValue({
			home_latitude: 36.0,
			home_longitude: 139.0,
			notification_enabled: false,
			notification_timing: "2days_before",
			score_weights: {} as never,
		});
		const res = await GET(makeRequest({ date: "2026-04-14", maxDistanceKm: "50" }));
		expect(res.status).toBe(200);
		expect(mockSearch).toHaveBeenCalledWith(36.0, 139.0, "2026-04-14", 50);
	});

	it("returns 400 for invalid homeLat/homeLng", async () => {
		const res = await GET(
			makeRequest({
				date: "2026-04-14",
				maxDistanceKm: "50",
				homeLat: "abc",
				homeLng: "140.97",
			}),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe("invalid home location");
	});

	it("returns 400 for invalid date format", async () => {
		const res = await GET(
			makeRequest({
				date: "2026/04/14",
				maxDistanceKm: "50",
				homeLat: "37.05",
				homeLng: "140.97",
			}),
		);
		expect(res.status).toBe(400);
	});

	it("clamps maxDistanceKm to 500", async () => {
		await GET(
			makeRequest({
				date: "2026-04-14",
				maxDistanceKm: "9999",
				homeLat: "37.05",
				homeLng: "140.97",
			}),
		);
		expect(mockSearch).toHaveBeenCalledWith(37.05, 140.97, "2026-04-14", 500);
	});
});
