import { NextRequest, NextResponse } from "next/server";
import { searchSpotsByDistance } from "../../../src/lib/db/search";
import { getSettings } from "../../../src/lib/db/settings";
import { getTodayJST } from "../../../src/lib/utils";

export const dynamic = "force-dynamic";

const MAX_DISTANCE_KM = 500;
const DEFAULT_DISTANCE_KM = 100;

export function GET(req: NextRequest): NextResponse {
	const { searchParams } = req.nextUrl;

	const settings = getSettings();
	if (settings.home_latitude == null || settings.home_longitude == null) {
		return NextResponse.json({ error: "home_location_not_set" }, { status: 400 });
	}

	const today = getTodayJST();
	const rawDate = searchParams.get("date") ?? today;
	// Accept only YYYY-MM-DD format
	if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
		return NextResponse.json({ error: "invalid date" }, { status: 400 });
	}

	const rawDist = Number(searchParams.get("maxDistanceKm") ?? DEFAULT_DISTANCE_KM);
	if (!Number.isFinite(rawDist) || rawDist <= 0) {
		return NextResponse.json({ error: "invalid maxDistanceKm" }, { status: 400 });
	}
	const maxDistanceKm = Math.min(rawDist, MAX_DISTANCE_KM);

	const results = searchSpotsByDistance(
		settings.home_latitude,
		settings.home_longitude,
		rawDate,
		maxDistanceKm,
	);

	return NextResponse.json(results);
}
