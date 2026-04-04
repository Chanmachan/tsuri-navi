import { NextRequest, NextResponse } from "next/server";
import { deleteSpot, toggleFavorite, updateSpot } from "../../../../src/lib/db/spots-crud";
import type { SpotType } from "../../../../src/db/schema";

export const dynamic = "force-dynamic";

const VALID_TYPES: SpotType[] = ["漁港", "磯", "サーフ", "堤防", "その他"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const spotId = Number(id);
	if (!Number.isInteger(spotId) || spotId <= 0) {
		return NextResponse.json({ error: "Invalid id" }, { status: 400 });
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	if (!body || typeof body !== "object") {
		return NextResponse.json({ error: "Invalid body" }, { status: 400 });
	}
	const bodyObj = body as Record<string, unknown>;

	// Toggle favorite
	if (bodyObj.action === "toggle_favorite") {
		const newValue = toggleFavorite(spotId);
		if (newValue === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
		return NextResponse.json({ is_favorite: newValue });
	}

	// Update fields
	const input: Parameters<typeof updateSpot>[1] = {};
	if (typeof bodyObj.name === "string" && bodyObj.name.trim()) input.name = bodyObj.name.trim();
	if (VALID_TYPES.includes(bodyObj.type as SpotType)) input.type = bodyObj.type as SpotType;
	if (typeof bodyObj.prefecture === "string" && bodyObj.prefecture.trim())
		input.prefecture = bodyObj.prefecture.trim();

	const spot = updateSpot(spotId, input);
	if (!spot) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json(spot);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const spotId = Number(id);
	if (!Number.isInteger(spotId) || spotId <= 0) {
		return NextResponse.json({ error: "Invalid id" }, { status: 400 });
	}

	const ok = deleteSpot(spotId);
	if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return new NextResponse(null, { status: 204 });
}
