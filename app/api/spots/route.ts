import { NextRequest, NextResponse } from "next/server";
import { collectSpotData } from "../../../src/lib/batch/collector";
import { saveCollectedData } from "../../../src/lib/db/cache";
import { getAllSpotsWithTodayScore } from "../../../src/lib/db/scores";
import { runScoreBatchForSpot } from "../../../src/lib/batch/score-batch";
import { createSpot } from "../../../src/lib/db/spots-crud";
import { getTodayJST } from "../../../src/lib/utils";
import type { SpotType } from "../../../src/db/schema";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
	const date = req.nextUrl.searchParams.get("date") ?? getTodayJST();
	const spots = getAllSpotsWithTodayScore(date);
	return NextResponse.json(spots);
}

const VALID_TYPES: SpotType[] = ["漁港", "磯", "サーフ", "堤防", "その他"];

export async function POST(req: NextRequest) {
	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	if (!body || typeof body !== "object") {
		return NextResponse.json({ error: "Invalid body" }, { status: 400 });
	}
	const { name, latitude, longitude, type, prefecture } = body as Record<string, unknown>;

	const isValidLat =
		typeof latitude === "number" && isFinite(latitude) && latitude >= -90 && latitude <= 90;
	const isValidLng =
		typeof longitude === "number" && isFinite(longitude) && longitude >= -180 && longitude <= 180;

	if (
		typeof name !== "string" ||
		name.trim() === "" ||
		!isValidLat ||
		!isValidLng ||
		typeof prefecture !== "string" ||
		prefecture.trim() === "" ||
		!VALID_TYPES.includes(type as SpotType)
	) {
		return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
	}

	const spot = createSpot({
		name: name.trim(),
		latitude,
		longitude,
		type: type as SpotType,
		prefecture: prefecture.trim(),
	});

	// Collect environmental data and calculate scores for the new spot.
	// Non-fatal: if external APIs fail, the spot is still created.
	try {
		const collected = await collectSpotData(spot);
		saveCollectedData(collected);
		const tideTypeByDate = new Map(collected.dailyTideTypes.map((d) => [d.date, d.tideType]));
		const dates = [...new Set(collected.hourly.map((h) => h.date))];
		if (dates.length > 0) {
			runScoreBatchForSpot(spot, dates, tideTypeByDate);
		}
	} catch {
		// Data collection failure is non-fatal — spot was created successfully
	}

	return NextResponse.json(spot, { status: 201 });
}
