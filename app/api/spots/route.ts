import { NextResponse } from "next/server";
import { getAllSpotsWithTodayScore } from "../../../src/lib/db/scores";
import { getTodayJST } from "../../../src/lib/utils";

export const dynamic = "force-dynamic";

export function GET() {
	const today = getTodayJST();
	const spots = getAllSpotsWithTodayScore(today);
	return NextResponse.json(spots);
}
