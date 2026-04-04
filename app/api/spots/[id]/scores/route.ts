import { NextResponse } from "next/server";
import { getWeeklyScores } from "../../../../../src/lib/db/scores";
import { getTodayJST } from "../../../../../src/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
	_req: Request,
	{ params }: { params: { id: string } | Promise<{ id: string }> },
) {
	const { id } = await params;
	const spotId = Number(id);
	if (!Number.isInteger(spotId) || spotId <= 0) {
		return NextResponse.json({ error: "Invalid spot id" }, { status: 400 });
	}

	const today = getTodayJST();
	const scores = getWeeklyScores(spotId, today, 7);
	return NextResponse.json(scores);
}
