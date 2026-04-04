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
	const body = (await req.json()) as unknown;
	if (!body || typeof body !== "object") {
		return NextResponse.json({ error: "Invalid body" }, { status: 400 });
	}
	const { name, latitude, longitude, type, prefecture } = body as Record<string, unknown>;

	if (
		typeof name !== "string" ||
		name.trim() === "" ||
		typeof latitude !== "number" ||
		typeof longitude !== "number" ||
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
