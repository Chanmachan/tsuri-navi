import { NextRequest, NextResponse } from "next/server";
import { searchSpotsByDistance } from "../../../src/lib/db/search";
import { getSettings } from "../../../src/lib/db/settings";
import { getTodayJST } from "../../../src/lib/utils";

export const dynamic = "force-dynamic";

const MAX_DISTANCE_KM = 500;
const DEFAULT_DISTANCE_KM = 100;

export function GET(req: NextRequest): NextResponse {
	const { searchParams } = req.nextUrl;

	// Prefer homeLat/homeLng from query params (sent by iOS client).
	// Fall back to server-side DB settings for web PWA.
	let homeLat: number | null = null;
	let homeLng: number | null = null;

	const rawLat = searchParams.get("homeLat");
	const rawLng = searchParams.get("homeLng");
	if (rawLat != null || rawLng != null) {
		// Partial input or empty strings are invalid
		if (rawLat == null || rawLng == null || rawLat === "" || rawLng === "") {
			return NextResponse.json({ error: "invalid home location" }, { status: 400 });
		}
		const parsedLat = Number(rawLat);
		const parsedLng = Number(rawLng);
		if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
			return NextResponse.json({ error: "invalid home location" }, { status: 400 });
		}
		homeLat = parsedLat;
		homeLng = parsedLng;
	} else {
		const settings = getSettings();
		homeLat = settings.home_latitude;
		homeLng = settings.home_longitude;
	}

	if (homeLat == null || homeLng == null) {
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

	const results = searchSpotsByDistance(homeLat, homeLng, rawDate, maxDistanceKm);

	return NextResponse.json(results);
}
