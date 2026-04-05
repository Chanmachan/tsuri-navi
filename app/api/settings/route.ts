import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "../../../src/lib/db/settings";
import type { ScoreWeights } from "../../../src/types/score";

export const dynamic = "force-dynamic";

export function GET() {
	const settings = getSettings();
	return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
	let body: Record<string, unknown>;
	try {
		body = (await req.json()) as Record<string, unknown>;
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const input: Parameters<typeof saveSettings>[0] = {};

	if (body.home_latitude === null || typeof body.home_latitude === "number") {
		input.home_latitude = body.home_latitude as number | null;
	}
	if (body.home_longitude === null || typeof body.home_longitude === "number") {
		input.home_longitude = body.home_longitude as number | null;
	}
	if (typeof body.notification_enabled === "boolean") {
		input.notification_enabled = body.notification_enabled;
	}
	if (typeof body.notification_timing === "string") {
		input.notification_timing = body.notification_timing;
	}
	if (body.score_weights && typeof body.score_weights === "object") {
		input.score_weights = body.score_weights as ScoreWeights;
	}

	saveSettings(input);
	return NextResponse.json(getSettings());
}
