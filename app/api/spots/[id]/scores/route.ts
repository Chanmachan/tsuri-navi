import { NextResponse } from "next/server";
import { getWeeklyScores } from "../../../../../src/lib/db/scores";

export const dynamic = "force-dynamic";

export function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	return params.then(({ id }) => {
		const spotId = Number(id);
		if (!Number.isFinite(spotId) || spotId <= 0) {
			return NextResponse.json({ error: "Invalid spot id" }, { status: 400 });
		}

		const today = new Date().toISOString().slice(0, 10);
		const scores = getWeeklyScores(spotId, today, 7);
		return NextResponse.json(scores);
	});
}
