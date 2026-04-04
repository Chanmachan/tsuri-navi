import { NextRequest, NextResponse } from "next/server";
import { deleteSubscription, saveSubscription } from "../../../../src/lib/push/subscriptions";

export async function POST(req: NextRequest): Promise<NextResponse> {
	const body = await req.json();
	const { endpoint, keys } = body ?? {};
	if (
		typeof endpoint !== "string" ||
		typeof keys?.p256dh !== "string" ||
		typeof keys?.auth !== "string"
	) {
		return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
	}
	saveSubscription({ endpoint, keys });
	return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
	const body = await req.json();
	const { endpoint } = body ?? {};
	if (typeof endpoint !== "string") {
		return NextResponse.json({ error: "invalid endpoint" }, { status: 400 });
	}
	deleteSubscription(endpoint);
	return new NextResponse(null, { status: 204 });
}
