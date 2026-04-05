import { NextRequest, NextResponse } from "next/server";
import { getAllSpotsWithTodayScore } from "../../../src/lib/db/scores";
import { createSpot } from "../../../src/lib/db/spots-crud";
import { getTodayJST } from "../../../src/lib/utils";
import type { SpotType } from "../../../src/db/schema";

export const dynamic = "force-dynamic";

export function GET() {
	const today = getTodayJST();
	const spots = getAllSpotsWithTodayScore(today);
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
	return NextResponse.json(spot, { status: 201 });
}
