import { NextResponse } from "next/server";
import { getAllSpotsWithTodayScore } from "../../../src/lib/db/scores";

export const dynamic = "force-dynamic";

export function GET() {
	const today = new Date().toISOString().slice(0, 10);
	const spots = getAllSpotsWithTodayScore(today);
	return NextResponse.json(spots);
}
